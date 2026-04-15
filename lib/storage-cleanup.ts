/**
 * Blob cleanup utilities for orphaned Azure Blob Storage objects.
 *
 * Key responsibilities:
 * - Normalize a heterogeneous set of URL/key fields into a flat list of storage keys.
 * - Diff "before" vs "after" content shapes to find orphaned keys to purge.
 * - Batch-delete keys while swallowing per-blob failures so callers never
 *   partially fail a user-facing admin operation on cleanup errors.
 *
 * Dependencies:
 * - lib/storage.ts (deleteObject primitive)
 * - lib/logger.ts (pino Logger type for per-call scoped logging)
 *
 * @example
 * const log = createRequestLogger('audit-briefs-api', request);
 * const orphaned = diffOrphanedKeys(existing, updated);
 * await deleteKeys(orphaned, log);
 */
import type { Logger } from 'pino';
import { deleteObject } from '@/lib/storage';

/**
 * Shape of any admin-editable record that may reference blob storage.
 *
 * Every field is optional because different entities (audit brief, episode,
 * learning graph) expose different URL fields. Absent fields are ignored.
 */
export interface OrphanSource {
  /** Single thumbnail URL or key. */
  thumbnailUrl?: string | null;
  /** Short-form audio URL or key (audit brief). */
  audioShortUrl?: string | null;
  /** Long-form audio URL or key (audit brief). */
  audioLongUrl?: string | null;
  /** Primary audio URL or key (episode). */
  audioUrl?: string | null;
  /** Array of bulletin document URLs or keys. */
  bulletinUrls?: string[] | null;
}

/**
 * Converts a raw URL-or-key string into a bare storage key, or returns null
 * when the input is absent or looks like a fully qualified URL that we
 * cannot confidently translate to a container key.
 *
 * Bare keys (e.g. "audio/123.mp3") are returned as-is. Absolute URLs
 * (starting with http/https or "blob:") are rejected to avoid accidentally
 * invoking deleteObject with an unparsable blob name.
 *
 * @param input - A blob key, absolute URL, or nullish value.
 * @returns The bare key, or null if the input is not a key we can delete.
 */
function toKey(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return null;
  // Defensively strip any leading slashes.
  return trimmed.replace(/^\/+/, '');
}

/**
 * Flattens an `OrphanSource` into a deduplicated list of bare storage keys.
 *
 * Absolute URLs are discarded. Null/undefined fields are ignored. The returned
 * array preserves insertion order for deterministic cleanup and testing.
 *
 * @param source - The record to extract keys from.
 * @returns Deduplicated list of bare keys safe to pass to deleteObject.
 */
export function collectKeys(source: OrphanSource | null | undefined): string[] {
  if (!source) return [];
  const seen = new Set<string>();
  const keys: string[] = [];

  const push = (value: string | null | undefined): void => {
    const key = toKey(value);
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  };

  push(source.thumbnailUrl);
  push(source.audioShortUrl);
  push(source.audioLongUrl);
  push(source.audioUrl);

  if (Array.isArray(source.bulletinUrls)) {
    for (const url of source.bulletinUrls) push(url);
  }

  return keys;
}

/**
 * Computes the set of keys that exist in `prev` but not in `next`.
 *
 * Used after an admin edit to identify blobs that the updated record no
 * longer references so they can be purged from Azure.
 *
 * @param prev - The record as it existed before the update.
 * @param next - The record as it will exist after the update.
 * @returns List of keys that should be deleted from storage.
 */
export function diffOrphanedKeys(
  prev: OrphanSource | null | undefined,
  next: OrphanSource | null | undefined
): string[] {
  const prevKeys = new Set(collectKeys(prev));
  const nextKeys = new Set(collectKeys(next));
  const orphans: string[] = [];
  for (const key of prevKeys) {
    if (!nextKeys.has(key)) orphans.push(key);
  }
  return orphans;
}

/** Result of a batch delete operation. */
export interface DeleteKeysResult {
  /** Keys that were successfully deleted (or were already absent). */
  deleted: string[];
  /** Keys that could not be deleted, each with the underlying error message. */
  failed: Array<{ key: string; error: string }>;
}

/**
 * Deletes a list of storage keys from Azure Blob Storage.
 *
 * Failures are logged and returned in `failed` but never thrown. Callers
 * must never let blob cleanup fail an otherwise successful admin mutation
 * — stranded blobs are recoverable via a periodic sweep; rolled-back user
 * actions are not.
 *
 * Returns early with empty arrays if `keys` is empty, avoiding the Azure
 * SDK handshake cost.
 *
 * @param keys - Bare storage keys to delete. Absolute URLs must be stripped
 *   via `collectKeys` first.
 * @param log - Pino logger for structured per-key success/failure events.
 * @returns Summary of which keys were deleted and which failed.
 */
export async function deleteKeys(keys: string[], log: Logger): Promise<DeleteKeysResult> {
  if (keys.length === 0) {
    return { deleted: [], failed: [] };
  }

  const results = await Promise.allSettled(keys.map((key) => deleteObject(key)));
  const deleted: string[] = [];
  const failed: Array<{ key: string; error: string }> = [];

  results.forEach((result, index) => {
    const key = keys[index];
    if (result.status === 'fulfilled') {
      deleted.push(key);
      log.info({ blob_key: key }, 'Blob deleted');
      return;
    }

    const reason = result.reason;
    const errorCode =
      reason && typeof reason === 'object' && 'code' in reason
        ? String((reason as { code: unknown }).code)
        : undefined;
    const message =
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'unknown';

    // BlobNotFound is idempotent — the post-condition (blob absent) already holds.
    if (errorCode === 'BlobNotFound') {
      deleted.push(key);
      log.info({ blob_key: key }, 'Blob already absent (treated as deleted)');
      return;
    }

    failed.push({ key, error: message });
    log.warn({ blob_key: key, error: message }, 'Blob delete failed');
  });

  return { deleted, failed };
}
