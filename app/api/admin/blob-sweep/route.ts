/**
 * Orphan blob sweep API endpoint for The Audit Brief.
 *
 * Performs a ground-truth comparison between Azure Blob Storage and the database
 * to find and optionally delete blobs not referenced by any record.
 *
 * Default is dry-run mode (safe). Pass ?dry-run=false to actually delete orphans.
 * Requires superadmin role.
 *
 * @route POST /api/admin/blob-sweep           — dry-run (default)
 * @route POST /api/admin/blob-sweep?dry-run=false — delete orphans
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { ApiError, createErrorResponse, internalError } from '@/lib/api/errors';
import { listAllBlobKeys } from '@/lib/storage';
import { deleteKeys } from '@/lib/storage-cleanup';
import { collectAllReferencedKeys, findOrphanedKeys } from '@/lib/admin/blob-sweep';
import { writeAuditLog } from '@/lib/admin/audit-log';
import { createRequestLogger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';

/**
 * Handles POST requests to sweep orphaned blobs from Azure Blob Storage.
 *
 * Lists all blobs in the container, queries all storage key columns from
 * AuditBrief, LearningGraph, and Episode, and identifies blobs not referenced
 * by any record. In dry-run mode (default) returns the orphan list without
 * deleting. With ?dry-run=false, deletes orphans and returns results.
 *
 * @param request - The incoming Next.js request
 * @returns JSON response with sweep results
 * @throws {ApiError} 401 if not authenticated
 * @throws {ApiError} 403 if not superadmin
 * @throws {ApiError} 500 if the sweep fails
 */
export const POST = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  const log = createRequestLogger('blob-sweep-api', request);
  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const user = await requireAuth();
    requireRole(user, ['superadmin']);

    const dryRun = request.nextUrl.searchParams.get('dry-run') !== 'false';

    log.info({ dryRun }, 'Blob sweep started');

    const [allBlobKeys, referencedKeys] = await Promise.all([
      listAllBlobKeys(),
      collectAllReferencedKeys(),
    ]);

    const orphanedKeys = findOrphanedKeys(allBlobKeys, referencedKeys);

    log.info(
      {
        totalBlobs: allBlobKeys.length,
        referencedBlobs: referencedKeys.size,
        orphanedCount: orphanedKeys.length,
        dryRun,
      },
      'Blob sweep analysis complete'
    );

    let deletedCount = 0;
    let failedCount = 0;

    if (!dryRun && orphanedKeys.length > 0) {
      const result = await deleteKeys(orphanedKeys, log);
      deletedCount = result.deleted.length;
      failedCount = result.failed.length;
    }

    await writeAuditLog({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'blob_sweep',
      entityType: 'blob_storage',
      entityId: 'container',
      before: { orphanedKeys },
      after: { deletedCount, failedCount, dryRun },
      requestId,
      log,
    });

    return NextResponse.json({
      data: {
        dryRun,
        totalBlobs: allBlobKeys.length,
        referencedBlobs: referencedKeys.size,
        orphanedCount: orphanedKeys.length,
        deletedCount,
        failedCount,
        orphanedKeys,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    log.error({ err: error }, 'Blob sweep failed');
    return createErrorResponse(internalError(), requestId);
  }
});
