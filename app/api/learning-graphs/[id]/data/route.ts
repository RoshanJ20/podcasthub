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
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { isUuid } from '@/lib/schemas/common';
import { logger, createRequestLogger } from '@/lib/logger';
import { collectKeys, deleteKeys } from '@/lib/storage-cleanup';
import { writeAuditLog } from '@/lib/admin/audit-log';
import { revalidateLearningGraph } from '@/lib/admin/revalidate';
import type { Logger } from 'pino';

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
 * Upserts episodes for a learning graph: updates existing episodes in place
 * and creates new ones for temp IDs. Also deletes episodes that were removed
 * by the user (present in DB but absent from payload).
 *
 * @param graphId - The learning graph ID to associate new episodes with
 * @param episodes - The incoming episode payloads from the client request
 * @param existingEpisodeIds - Set of episode IDs currently in the database
 * @returns A map of temporary client IDs to their server-assigned real IDs
 */
async function upsertEpisodes(
  graphId: string,
  episodes: Array<Record<string, unknown>>,
  existingEpisodeIds: Set<string>,
  actor: { userId: string; email: string },
  requestId: string | undefined,
  log: Logger
): Promise<Map<string, string>> {
  const incomingIds = new Set<string>();
  const tempIdToRealId = new Map<string, string>();

  for (const ep of episodes) {
    const epId = ep.id as string;
    const isExisting = existingEpisodeIds.has(epId);
    const isTemp = typeof epId === 'string' && epId.startsWith('temp-');
    const episodeData = buildEpisodeData(ep);

    if (isExisting && !isTemp) {
      await prisma.episode.update({ where: { id: epId }, data: episodeData });
      incomingIds.add(epId);
    } else {
      const created = await prisma.episode.create({
        data: { graphId, ...episodeData },
      });
      tempIdToRealId.set(epId, created.id);
      incomingIds.add(created.id);
    }
  }

  // Delete episodes that were removed by the user, then purge their blobs.
  const idsToDelete = [...existingEpisodeIds].filter((eid) => !incomingIds.has(eid));
  if (idsToDelete.length > 0) {
    // Collect blob keys BEFORE deletion so we can purge them afterwards.
    const episodesToDelete = await prisma.episode.findMany({
      where: { id: { in: idsToDelete } },
      select: { id: true, title: true, thumbnailUrl: true, audioUrl: true },
    });

    await prisma.learningPathEdge.deleteMany({
      where: {
        graphId,
        OR: [{ sourceEpisodeId: { in: idsToDelete } }, { targetEpisodeId: { in: idsToDelete } }],
      },
    });
    await prisma.episode.deleteMany({ where: { id: { in: idsToDelete } } });

    // Post-commit side effects: blob cleanup and audit trail per deleted episode.
    const orphanedKeys = episodesToDelete.flatMap((ep) =>
      collectKeys({ thumbnailUrl: ep.thumbnailUrl, audioUrl: ep.audioUrl })
    );
    await deleteKeys(orphanedKeys, log);

    for (const ep of episodesToDelete) {
      await writeAuditLog({
        actorId: actor.userId,
        actorEmail: actor.email,
        action: 'episode_delete',
        entityType: 'episode',
        entityId: ep.id,
        before: ep,
        after: null,
        requestId,
        log,
      });
    }
  }

  return tempIdToRealId;
}

/**
 * Deletes all existing edges for the graph and recreates them from the
 * client payload, resolving any temporary IDs to their real counterparts.
 *
 * @param graphId - The learning graph ID the edges belong to
 * @param edges - The incoming edge payloads from the client request
 * @param idMap - Map of temporary client IDs to server-assigned real IDs
 */
async function recreateEdges(
  graphId: string,
  edges: Array<Record<string, unknown>>,
  idMap: Map<string, string>
): Promise<void> {
  await prisma.learningPathEdge.deleteMany({ where: { graphId } });

  for (const edge of edges) {
    const sourceId = idMap.get(edge.sourceEpisodeId as string) ?? (edge.sourceEpisodeId as string);
    const targetId = idMap.get(edge.targetEpisodeId as string) ?? (edge.targetEpisodeId as string);
    await prisma.learningPathEdge.create({
      data: {
        graphId,
        sourceEpisodeId: sourceId,
        targetEpisodeId: targetId,
        label: (edge.label as string) || null,
      },
    });
  }
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
  const log = createRequestLogger('learning-graphs-data-api', request);
  const requestId = request.headers.get('x-request-id') ?? undefined;
  try {
    const user = await requireAuth();
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;

    if (!isUuid(id)) {
      return createErrorResponse(badRequest('Invalid learning graph id'), requestId);
    }

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

    const existingEpisodeIds = new Set(graph.episodes.map((ep: { id: string }) => ep.id));
    const tempIdToRealId = await upsertEpisodes(
      id,
      episodes,
      existingEpisodeIds,
      { userId: user.userId, email: user.email },
      requestId,
      log
    );

    if (Array.isArray(edges) && edges.length > 0) {
      await recreateEdges(id, edges, tempIdToRealId);
    } else {
      await prisma.learningPathEdge.deleteMany({ where: { graphId: id } });
    }

    const saved = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: { orderBy: { sortOrder: 'asc' } }, edges: true },
    });

    revalidateLearningGraph(id);

    return NextResponse.json({ data: saved });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    logger.error({ error, message: 'Learning graph data save error' });
    return createErrorResponse(internalError(), requestId);
  }
}
