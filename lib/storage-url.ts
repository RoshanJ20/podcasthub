/**
 * Resolves storage keys to full URLs for client-side rendering.
 *
 * Storage keys (e.g., "image/uuid/file.jpg") are stored in the database.
 * This helper converts them to full URLs pointing to MinIO/S3 for display.
 *
 * @example
 * resolveStorageUrl("image/uuid/thumb.jpg")
 * // => "http://localhost:9000/podcast-hub-uploads/image/uuid/thumb.jpg"
 */

const S3_ENDPOINT =
  process.env.S3_ENDPOINT || process.env.NEXT_PUBLIC_S3_ENDPOINT || 'http://localhost:9000';
const UPLOAD_BUCKET =
  process.env.S3_UPLOAD_BUCKET || process.env.NEXT_PUBLIC_S3_BUCKET || 'podcast-hub-uploads';

/**
 * Converts a storage key to a full URL.
 * If the key is already a full URL (http/https), returns it as-is.
 * If the key starts with /, returns it as-is (relative path).
 *
 * @param key - Storage key or URL
 * @returns Full URL to the file
 */
export function resolveStorageUrl(key: string | null | undefined): string {
  if (!key) return '/placeholder.svg';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  if (key.startsWith('/')) return key;
  return `${S3_ENDPOINT}/${UPLOAD_BUCKET}/${key}`;
}
