/**
 * Utilities for working with podcast attachment URLs.
 *
 * Key responsibilities:
 * - Extract human-readable display names from storage URL paths
 * - Title-case and clean up filenames for sidebar display
 *
 * @example
 * import { extractAttachmentName } from '@/lib/attachment-utils';
 * extractAttachmentName('/bulletins/Q3-Bulletin.pdf'); // 'Q3 Bulletin'
 */

/**
 * Extracts a human-readable display name from an attachment URL.
 *
 * Parses the basename from the URL path, strips the file extension,
 * replaces hyphens and underscores with spaces, and title-cases the result.
 *
 * @param url - Raw storage URL or key (before resolveStorageUrl)
 * @param index - Optional zero-based index for the fallback name
 * @returns Human-readable name like "Q3 Bulletin" or "Attachment 3"
 */
export function extractAttachmentName(url: string, index?: number): string {
  if (!url) {
    return index !== undefined ? `Attachment ${index + 1}` : 'Attachment';
  }

  const basename = url.split('/').pop() ?? '';

  if (!basename) {
    return index !== undefined ? `Attachment ${index + 1}` : 'Attachment';
  }

  // Strip file extension (last dot-segment)
  const nameWithoutExt = basename.replace(/\.[^.]+$/, '');

  // Replace hyphens/underscores with spaces and title-case each word
  const words = nameWithoutExt
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join(' ') || (index !== undefined ? `Attachment ${index + 1}` : 'Attachment');
}
