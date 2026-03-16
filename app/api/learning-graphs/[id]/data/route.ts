/**
 * Learning graph bulk data API route for episodes and edges.
 *
 * Key responsibilities:
 * - Upserts episodes: updates existing by ID, creates new ones from temp IDs
 * - Deletes episodes removed by the user (only those no longer in the payload)
 * - Recreates edges with correct ID mappings (temp IDs resolved to real IDs)
 * - Returns the full saved graph so the client can reconcile IDs
 *
 * This upsert approach preserves episode IDs across saves, preventing cascade
 * deletion of UserProgress and UserActivity records that reference episodes.
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
import { logger } from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Builds the common episode data object from a client-provided episode payload.
 *
 * @param ep - The raw episode object from the request body
 * @returns A sanitized data object suitable for Prisma create/update
 */
function buildEpisodeData(ep: Record<string, unknown>) {
  return {
    title: (ep.title as string) || 'Untitled Episode',
    description: (ep.description as string) || null,
    audioUrl: (ep.audioUrl as string) || '',
    thumbnailUrl: (ep.thumbnailUrl as string) || null,
    transcript: ep.transcript
      ? typeof ep.transcript === 'string'
        ? [ep.transcript]
        : (ep.transcript as string[])
      : [],
    positionX: (ep.positionX as number) ?? 0,
    positionY: (ep.positionY as number) ?? 0,
    nodeType: (ep.nodeType as string) || 'default',
    sortOrder: (ep.sortOrder as number) ?? 0,
  };
}

/**
 * Bulk saves episodes and edges for a learning graph using upsert logic.
 *
 * Existing episodes are updated in place (preserving their IDs and related
 * UserProgress/UserActivity records). New episodes (identified by temp- prefix)
 * are created. Episodes present in the database but absent from the payload
 * are deleted along with their referencing edges.
 *
 * @param request - The incoming PUT request with episodes and edges arrays
 * @param context - Route context containing the graph ID parameter
 * @returns JSON response with the full saved graph (episodes + edges)
 * @throws ApiError 400 if episodes is not an array
 * @throws ApiError 401 if user is not authenticated
 * @throws ApiError 403 if user is not admin/superadmin
 * @throws ApiError 404 if the learning graph does not exist
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;

    const graph = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: { select: { id: true } } },
    });
    if (!graph) {
      return createErrorResponse(notFound('Learning graph'));
    }

    const body = await request.json();
    const { episodes, edges } = body;

    if (!Array.isArray(episodes)) {
      return createErrorResponse(badRequest('episodes array is required'));
    }

    const existingEpisodeIds = new Set(graph.episodes.map((e: { id: string }) => e.id));
    const incomingIds = new Set<string>();
    const tempIdToRealId = new Map<string, string>();

    // Upsert episodes: update existing, create new
    for (const ep of episodes) {
      const isExisting = existingEpisodeIds.has(ep.id);
      const isTemp = typeof ep.id === 'string' && ep.id.startsWith('temp-');
      const episodeData = buildEpisodeData(ep);

      if (isExisting && !isTemp) {
        await prisma.episode.update({
          where: { id: ep.id },
          data: episodeData,
        });
        incomingIds.add(ep.id);
      } else {
        const created = await prisma.episode.create({
          data: { graphId: id, ...episodeData },
        });
        tempIdToRealId.set(ep.id, created.id);
        incomingIds.add(created.id);
      }
    }

    // Delete episodes that were removed by the user
    const idsToDelete = [...existingEpisodeIds].filter((eid) => !incomingIds.has(eid));
    if (idsToDelete.length > 0) {
      await prisma.learningPathEdge.deleteMany({
        where: {
          graphId: id,
          OR: [{ sourceEpisodeId: { in: idsToDelete } }, { targetEpisodeId: { in: idsToDelete } }],
        },
      });
      await prisma.episode.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    // Recreate edges (edges are cheap, no user data attached)
    await prisma.learningPathEdge.deleteMany({ where: { graphId: id } });
    if (Array.isArray(edges) && edges.length > 0) {
      for (const edge of edges) {
        const sourceId = tempIdToRealId.get(edge.sourceEpisodeId) ?? edge.sourceEpisodeId;
        const targetId = tempIdToRealId.get(edge.targetEpisodeId) ?? edge.targetEpisodeId;
        await prisma.learningPathEdge.create({
          data: {
            graphId: id,
            sourceEpisodeId: sourceId,
            targetEpisodeId: targetId,
            label: edge.label || null,
          },
        });
      }
    }

    // Return the saved graph so the client can update IDs
    const saved = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: { orderBy: { sortOrder: 'asc' } }, edges: true },
    });

    return NextResponse.json({ data: saved });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    logger.error({ error, message: 'Learning graph data save error' });
    return createErrorResponse(internalError());
  }
}
