/**
 * Optimistic concurrency guard for admin mutations.
 *
 * When two admins edit the same record concurrently, the second save would
 * silently overwrite the first. Clients that send `expectedUpdatedAt` opt
 * in to last-writer-detection: if the server's current `updatedAt` differs,
 * the request is rejected with 409 and the client is expected to reload.
 *
 * Opt-in (expected field optional) is intentional for one release window so
 * legacy clients continue to function while the UI is updated.
 *
 * @example
 * const existing = await prisma.auditBrief.findUnique({ where: { id } });
 * assertFresh(body.expectedUpdatedAt, existing.updatedAt);
 */
import { conflict } from '@/lib/api/errors';

/**
 * Throws 409 Conflict when `expected` is provided and does not match `actual`.
 *
 * Both `expected` and `actual` are normalized to millisecond epoch values
 * before comparison so Date, ISO string, and JSON-parsed Date inputs all
 * compare equivalently.
 *
 * @param expected - Optional client-provided `updatedAt` from a prior read.
 *   When undefined, no check is performed (backward-compatible).
 * @param actual - The current server-side `updatedAt` timestamp.
 * @throws {ApiError} 409 CONFLICT if the timestamps disagree.
 */
export function assertFresh(expected: Date | string | undefined | null, actual: Date): void {
  if (expected === undefined || expected === null) return;

  const expectedMs = expected instanceof Date ? expected.getTime() : new Date(expected).getTime();
  const actualMs = actual.getTime();

  if (Number.isNaN(expectedMs)) {
    // Malformed client input is treated as a stale write rather than silently ignored.
    throw conflict(
      'Concurrency check failed: expected timestamp is invalid. Please reload and try again.'
    );
  }

  if (expectedMs !== actualMs) {
    throw conflict('Resource was modified by another user. Please reload and try again.', {
      expected: new Date(expectedMs).toISOString(),
      actual: actual.toISOString(),
    });
  }
}
