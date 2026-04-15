/**
 * Single audit brief API routes for retrieval, update, and deletion.
 *
 * Key responsibilities:
 * - GET returns a single non-archived audit brief with transcripts.
 * - PUT performs optimistic-concurrency-checked updates, diffs blob URL
 *   fields so replaced thumbnails/audio/bulletins are cleaned up from Azure,
 *   writes an audit-log row, and busts the Next.js cache for public pages.
 * - DELETE supports two modes: a default soft-archive that sets isArchived,
 *   and a `?hard=true` mode (admin+ with typed confirmation body) that
 *   permanently removes the row, cascades to transcripts/bookmarks/favorites,
 *   and purges every associated blob.
 *
 * @route GET    /api/audit-briefs/[id] — Get a single audit brief with transcripts
 * @route PUT    /api/audit-briefs/[id] — Update an audit brief (admin/superadmin)
 * @route DELETE /api/audit-briefs/[id] — Soft-archive or hard-delete (admin/superadmin)
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
import { updateAuditBriefSchema } from '@/lib/schemas/audit-brief';
import { hardDeleteConfirmSchema } from '@/lib/schemas/admin';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { assertFresh } from '@/lib/admin/concurrency';
import { writeAuditLog } from '@/lib/admin/audit-log';
import { revalidateAuditBrief } from '@/lib/admin/revalidate';
import { collectKeys, deleteKeys, diffOrphanedKeys } from '@/lib/storage-cleanup';
import { createRequestLogger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

/** Route context providing the audit brief ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Retrieves a single non-archived audit brief by ID, including its transcripts.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the audit brief ID
 * @returns JSON response with the audit brief data or 404 if not found
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const auditBrief = await prisma.auditBrief.findFirst({
      where: { id, isArchived: false },
      include: { transcripts: true },
    });

    if (!auditBrief) {
      return createErrorResponse(notFound('AuditBrief'));
    }

    return NextResponse.json({ data: auditBrief });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    return createErrorResponse(internalError(), requestId);
  }
}

/**
 * Updates an existing audit brief by ID.
 *
 * Runs an optional `expectedUpdatedAt` concurrency check, updates the row,
 * then asynchronously purges any blobs that the new record no longer
 * references (replaced thumbnail, audio, bulletin documents). Always emits
 * an audit-log row and revalidates public caches.
 *
 * Requires authentication with admin or superadmin role.
 *
 * @param request - The incoming Next.js request with update data in the body
 * @param context - Route context containing the audit brief ID
 * @returns JSON response with the updated audit brief, or 409 on stale write
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const log = createRequestLogger('audit-briefs-api', request);
  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const user = await requireAuth();
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;
    const body = await request.json();
    const result = updateAuditBriefSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const existing = await prisma.auditBrief.findUnique({ where: { id } });
    if (!existing) {
      return createErrorResponse(notFound('AuditBrief'), requestId);
    }

    // Opt-in optimistic concurrency — throws 409 if the client's version is stale.
    assertFresh(result.data.expectedUpdatedAt, existing.updatedAt);

    const { bulletinUrls, tags, isArchived, expectedUpdatedAt: _version, ...rest } = result.data;
    void _version;
    const updateData: Prisma.AuditBriefUncheckedUpdateInput = {
      ...rest,
      ...(tags !== undefined && { tags }),
      ...(bulletinUrls !== undefined && { bulletinUrls: bulletinUrls ?? [] }),
      ...(isArchived !== undefined && { isArchived }),
    };

    const updated = await prisma.auditBrief.update({ where: { id }, data: updateData });

    // Post-commit side-effects: blob cleanup, audit log, cache revalidation.
    const orphaned = diffOrphanedKeys(existing, updated);
    await deleteKeys(orphaned, log);

    const action =
      isArchived === true && !existing.isArchived
        ? 'archive'
        : isArchived === false && existing.isArchived
          ? 'unarchive'
          : 'update';

    await writeAuditLog({
      actorId: user.userId,
      actorEmail: user.email,
      action,
      entityType: 'audit_brief',
      entityId: id,
      before: existing,
      after: updated,
      requestId,
      log,
    });

    revalidateAuditBrief(id);

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    log.error({ err: error }, 'Unhandled error updating audit brief');
    return createErrorResponse(internalError(), requestId);
  }
}

/**
 * Soft-archives (default) or permanently hard-deletes an audit brief.
 *
 * Soft archive (`DELETE /api/audit-briefs/[id]`) flips isArchived=true,
 * leaves blobs intact, and is reversible via PUT with `isArchived: false`.
 *
 * Hard delete (`DELETE /api/audit-briefs/[id]?hard=true` with body
 * `{ "confirm": "DELETE" }`) removes the row (cascading transcripts,
 * bookmarks, favorites; setting UserActivity.auditBriefId to null), then
 * purges every blob the row referenced. Not reversible.
 *
 * Both modes require admin or superadmin authentication.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the audit brief ID
 * @returns JSON response confirming the operation
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const log = createRequestLogger('audit-briefs-api', request);
  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const user = await requireAuth();
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;
    const hardMode = new URL(request.url).searchParams.get('hard') === 'true';

    const existing = await prisma.auditBrief.findUnique({ where: { id } });
    if (!existing) {
      return createErrorResponse(notFound('AuditBrief'), requestId);
    }

    if (hardMode) {
      // Require typed-confirmation body so a bare `DELETE ?hard=true` cannot succeed.
      let body: unknown = null;
      try {
        body = await request.json();
      } catch {
        return createErrorResponse(
          badRequest("Hard delete requires a body of { confirm: 'DELETE' }"),
          requestId
        );
      }
      const parsed = hardDeleteConfirmSchema.safeParse(body);
      if (!parsed.success) {
        return createErrorResponse(
          badRequest("Hard delete requires { confirm: 'DELETE' }", parsed.error.flatten()),
          requestId
        );
      }

      const keys = collectKeys(existing);

      await prisma.auditBrief.delete({ where: { id } });
      await deleteKeys(keys, log);

      await writeAuditLog({
        actorId: user.userId,
        actorEmail: user.email,
        action: 'hard_delete',
        entityType: 'audit_brief',
        entityId: id,
        before: existing,
        after: null,
        requestId,
        log,
      });

      revalidateAuditBrief(id);

      return NextResponse.json({ data: { message: 'Audit brief permanently deleted' } });
    }

    // Soft archive path (default).
    const archived = await prisma.auditBrief.update({
      where: { id },
      data: { isArchived: true },
    });

    await writeAuditLog({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'archive',
      entityType: 'audit_brief',
      entityId: id,
      before: existing,
      after: archived,
      requestId,
      log,
    });

    revalidateAuditBrief(id);

    return NextResponse.json({ data: { message: 'Audit brief archived successfully' } });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    log.error({ err: error }, 'Unhandled error deleting audit brief');
    return createErrorResponse(internalError(), requestId);
  }
}
