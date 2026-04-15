/**
 * Single learning graph API routes for retrieval, update, and deletion.
 *
 * Key responsibilities:
 * - GET returns a graph with its episodes and edges.
 * - PUT performs optimistic-concurrency-checked metadata updates (title,
 *   description, thumbnail, etc.), writes an audit-log row, and revalidates
 *   public caches.
 * - DELETE performs an admin-level hard delete that (1) collects every blob
 *   key referenced by the graph's thumbnail and its episodes' audio + thumbs,
 *   (2) deletes the row (cascading episodes, edges, favorites, progress),
 *   (3) purges the collected blobs from Azure, and (4) writes audit + cache
 *   revalidation. Hard delete requires body { confirm: "DELETE" } so a bare
 *   HTTP DELETE cannot irrecoverably purge content.
 *
 * @route GET    /api/learning-graphs/[id] — Get a single graph with episodes and edges
 * @route PUT    /api/learning-graphs/[id] — Update a graph (admin/superadmin)
 * @route DELETE /api/learning-graphs/[id] — Hard-delete a graph (admin/superadmin)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  ApiError,
  createErrorResponse,
  notFound,
  badRequest,
  internalError,
} from '@/lib/api/errors';
import { updateLearningGraphSchema } from '@/lib/schemas/learning-graph';
import { hardDeleteConfirmSchema } from '@/lib/schemas/admin';
import { isUuid } from '@/lib/schemas/common';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { assertFresh } from '@/lib/admin/concurrency';
import { writeAuditLog } from '@/lib/admin/audit-log';
import { revalidateLearningGraph } from '@/lib/admin/revalidate';
import { collectKeys, deleteKeys } from '@/lib/storage-cleanup';
import { createRequestLogger } from '@/lib/logger';

/** Route context providing the learning graph ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Retrieves a single learning graph by ID with episodes and edges.
 *
 * All learning paths are auto-published, so no visibility check is needed.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the graph ID
 * @returns JSON response with the graph data or 404 if not found
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!isUuid(id)) {
      return createErrorResponse(
        badRequest('Invalid learning graph id'),
        request.headers.get('x-request-id') ?? undefined
      );
    }

    const graph = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: true, edges: true },
    });

    if (!graph) {
      return createErrorResponse(notFound('Learning graph'));
    }

    return NextResponse.json({ data: graph });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    return createErrorResponse(internalError(), requestId);
  }
}

/**
 * Updates an existing learning graph by ID.
 *
 * Runs an optional `expectedUpdatedAt` concurrency check, applies the
 * update, writes an audit-log row, and revalidates public caches.
 *
 * Requires authentication with admin or superadmin role.
 *
 * @param request - The incoming Next.js request with update data
 * @param context - Route context containing the graph ID
 * @returns JSON response with the updated graph or 409 on stale write
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const log = createRequestLogger('learning-graphs-api', request);
  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const user = await requireAuth();
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;

    if (!isUuid(id)) {
      return createErrorResponse(badRequest('Invalid learning graph id'), requestId);
    }

    const body = await request.json();

    const result = updateLearningGraphSchema.safeParse(body);
    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const existing = await prisma.learningGraph.findUnique({ where: { id } });
    if (!existing) {
      return createErrorResponse(notFound('Learning graph'), requestId);
    }

    assertFresh(result.data.expectedUpdatedAt, existing.updatedAt);

    const { expectedUpdatedAt: _version, ...updatePayload } = result.data;
    void _version;

    const graph = await prisma.learningGraph.update({
      where: { id },
      data: updatePayload,
    });

    await writeAuditLog({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'update',
      entityType: 'learning_graph',
      entityId: id,
      before: existing,
      after: graph,
      requestId,
      log,
    });

    revalidateLearningGraph(id);

    return NextResponse.json({ data: graph });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    log.error({ err: error }, 'Unhandled error updating learning graph');
    return createErrorResponse(internalError(), requestId);
  }
}

/**
 * Permanently deletes a learning graph by ID.
 *
 * Collects every blob key referenced by the graph (its thumbnail plus each
 * episode's thumbnail and audio), deletes the graph row (cascading episodes,
 * edges, favorites, progress, and bookmarks; setting UserActivity graph/episode
 * refs to null), then purges the collected blobs from Azure. Writes an audit
 * log row and revalidates caches.
 *
 * Hard delete requires a body of `{ "confirm": "DELETE" }` to prevent a
 * misfired bare DELETE from purging content.
 *
 * Requires authentication with admin or superadmin role.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the graph ID
 * @returns JSON response confirming the deletion
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const log = createRequestLogger('learning-graphs-api', request);
  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const user = await requireAuth();
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;

    if (!isUuid(id)) {
      return createErrorResponse(badRequest('Invalid learning graph id'), requestId);
    }

    // Confirmation body is required so a bare `DELETE /api/learning-graphs/:id`
    // without a body cannot permanently purge the graph.
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        badRequest("Delete requires a body of { confirm: 'DELETE' }"),
        requestId
      );
    }
    const parsed = hardDeleteConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(
        badRequest("Delete requires { confirm: 'DELETE' }", parsed.error.flatten()),
        requestId
      );
    }

    const existing = await prisma.learningGraph.findUnique({
      where: { id },
      include: {
        episodes: { select: { id: true, thumbnailUrl: true, audioUrl: true } },
      },
    });
    if (!existing) {
      return createErrorResponse(notFound('Learning graph'), requestId);
    }

    // Collect keys from the graph's own thumbnail + each episode's audio/thumb.
    const keys = [
      ...collectKeys({ thumbnailUrl: existing.thumbnailUrl }),
      ...existing.episodes.flatMap((ep) =>
        collectKeys({ thumbnailUrl: ep.thumbnailUrl, audioUrl: ep.audioUrl })
      ),
    ];

    await prisma.learningGraph.delete({ where: { id } });
    await deleteKeys(keys, log);

    await writeAuditLog({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'hard_delete',
      entityType: 'learning_graph',
      entityId: id,
      before: existing,
      after: null,
      requestId,
      log,
    });

    revalidateLearningGraph(id);

    return NextResponse.json({ data: { message: 'Learning graph permanently deleted' } });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    log.error({ err: error }, 'Unhandled error deleting learning graph');
    return createErrorResponse(internalError(), requestId);
  }
}
