/**
 * Learning graph bulk data API route for episodes and edges.
 *
 * @route PUT /api/learning-graphs/[id]/data — Bulk save episodes and edges
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  ApiError,
  createErrorResponse,
  badRequest,
  notFound,
  internalError,
} from '@/lib/api/errors';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

/** Route context providing the learning graph ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Bulk saves episodes and edges for a learning graph.
 *
 * Replaces all existing episodes and edges for the graph with the provided data.
 * Uses a transaction to ensure atomicity: deletes old data, then creates new.
 *
 * Episodes use tempId fields to allow edges to reference them before real IDs exist.
 * Edges reference source/target by tempId, which are mapped to real IDs after creation.
 *
 * Requires authentication with admin or superadmin role.
 *
 * @param request - The incoming Next.js request with episodes and edges
 * @param context - Route context containing the graph ID
 * @returns JSON response with created episodes
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;

    // Verify graph exists
    const graph = await prisma.learningGraph.findUnique({ where: { id } });
    if (!graph) {
      return createErrorResponse(notFound('Learning graph'));
    }

    const body = await request.json();
    const { episodes, edges } = body;

    // Validate episodes array exists
    if (!Array.isArray(episodes)) {
      return createErrorResponse(badRequest('episodes array is required'));
    }

    // Validate edge references
    const episodeTempIds = new Set(
      episodes.map((e: { tempId?: string; id?: string }) => e.tempId ?? e.id)
    );
    for (const edge of edges ?? []) {
      if (!episodeTempIds.has(edge.sourceEpisodeId) || !episodeTempIds.has(edge.targetEpisodeId)) {
        return createErrorResponse(badRequest('Edge references non-existent episode'));
      }
    }

    // Transaction: delete old data, insert new
    const result = await prisma.$transaction(
      async (tx: {
        episode: {
          deleteMany: (args: { where: { graphId: string } }) => Promise<unknown>;
          create: (args: {
            data: Record<string, unknown>;
          }) => Promise<{ id: string; title: string }>;
        };
        learningPathEdge: {
          deleteMany: (args: { where: { graphId: string } }) => Promise<unknown>;
          createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown>;
        };
      }) => {
        // Delete existing data
        await tx.learningPathEdge.deleteMany({ where: { graphId: id } });
        await tx.episode.deleteMany({ where: { graphId: id } });

        // Create episodes
        const createdEpisodes = await Promise.all(
          episodes.map(
            (ep: {
              tempId?: string;
              id?: string;
              title: string;
              description?: string;
              audioUrl?: string;
              positionX?: number;
              positionY?: number;
              nodeType?: string;
              sortOrder?: number;
            }) =>
              tx.episode.create({
                data: {
                  graphId: id,
                  title: ep.title,
                  description: ep.description ?? null,
                  audioUrl: ep.audioUrl ?? '',
                  positionX: ep.positionX ?? 0,
                  positionY: ep.positionY ?? 0,
                  nodeType: ep.nodeType ?? 'default',
                  sortOrder: ep.sortOrder ?? 0,
                },
              })
          )
        );

        // Map tempIds to real IDs for edges
        const idMap = new Map<string, string>();
        episodes.forEach((ep: { tempId?: string; id?: string }, i: number) => {
          idMap.set(ep.tempId ?? ep.id ?? '', createdEpisodes[i].id);
        });

        // Create edges
        if (edges?.length) {
          await tx.learningPathEdge.createMany({
            data: edges.map(
              (e: { sourceEpisodeId: string; targetEpisodeId: string; label?: string }) => ({
                graphId: id,
                sourceEpisodeId: idMap.get(e.sourceEpisodeId)!,
                targetEpisodeId: idMap.get(e.targetEpisodeId)!,
                label: e.label ?? null,
              })
            ),
          });
        }

        return { episodes: createdEpisodes };
      }
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
