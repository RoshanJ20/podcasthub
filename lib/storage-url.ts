/**
 * Resolves storage keys to URLs for client-side rendering.
 *
 * Storage keys (e.g., "image/uuid/file.jpg") are stored in the database.
 * This helper converts them to URLs that the browser can load.
 *
 * In development, files are proxied through /api/media to avoid browser
 * security restrictions on loading media from localhost:10000 (Azurite).
 *
 * Dependencies:
 * - @/lib/config/base-path (withBasePath)
 */
import { withBasePath } from '@/lib/config/base-path';

/**
 * Converts a storage key to a URL the browser can load.
 * Uses the /api/media proxy to avoid private IP / CORS issues.
 *
 * Returns an empty string when the key is missing. Callers that need to render
 * something in that case must handle the empty/nullish state themselves — no
 * local placeholder is substituted.
 *
 * @param key - Storage key or URL
 * @returns URL to the file, or an empty string when no key is provided
 */
export function resolveStorageUrl(key: string | null | undefined): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  if (key.startsWith('/')) return key;
  return withBasePath(`/api/media?key=${encodeURIComponent(key)}`);
}
