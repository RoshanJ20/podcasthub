/**
 * File upload utilities for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Defines allowed MIME types for audio, image, and PDF uploads
 * - Provides file type validation (case-insensitive)
 * - Sanitizes filenames for safe storage
 * - Formats file sizes in human-readable units
 * - Generates unique storage keys with UUID namespacing
 *
 * @example
 * import { validateFileType, ALLOWED_AUDIO_TYPES, generateUniqueKey } from '@/lib/upload';
 *
 * if (validateFileType(file.type, ALLOWED_AUDIO_TYPES)) {
 *   const key = generateUniqueKey('audio', file.name);
 * }
 */
import { randomUUID } from 'crypto';

/** Allowed MIME types for audio file uploads. */
export const ALLOWED_AUDIO_TYPES: readonly string[] = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
];

/** Allowed MIME types for image file uploads. */
export const ALLOWED_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** Allowed MIME types for PDF file uploads. */
export const ALLOWED_PDF_TYPES: readonly string[] = ['application/pdf'];

/**
 * Mapping of file categories to their allowed MIME type arrays.
 */
export const FILE_TYPE_GROUPS: Record<string, readonly string[]> = {
  audio: ALLOWED_AUDIO_TYPES,
  image: ALLOWED_IMAGE_TYPES,
  pdf: ALLOWED_PDF_TYPES,
};

/**
 * Maximum file sizes in bytes per category.
 *
 * - audio: 500 MB
 * - image: 5 MB
 * - pdf: 50 MB
 */
export const MAX_FILE_SIZES: Record<string, number> = {
  audio: 500 * 1024 * 1024,
  image: 5 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
};

/**
 * Validates whether a MIME type is in the allowed list (case-insensitive).
 *
 * @param mime - The MIME type to validate
 * @param allowed - Array of allowed MIME type strings
 * @returns True if the MIME type is allowed
 */
export function validateFileType(mime: string, allowed: readonly string[]): boolean {
  return allowed.some((type) => type.toLowerCase() === mime.toLowerCase());
}

/**
 * Sanitizes a filename for safe storage.
 *
 * - Converts to lowercase
 * - Replaces special characters (anything not alphanumeric, dot, or hyphen) with hyphens
 * - Collapses consecutive hyphens into a single hyphen
 * - Trims leading and trailing hyphens
 *
 * @param name - The original filename
 * @returns A sanitized, storage-safe filename
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formats a byte count into a human-readable string.
 *
 * Uses binary units: B, KB, MB, GB.
 *
 * @param bytes - The number of bytes
 * @returns A formatted string (e.g., "1.50 KB", "500 B")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Generates a unique storage key in the format: prefix/uuid/sanitized-filename.
 *
 * @param prefix - The key prefix (e.g., 'audio', 'image', 'pdf')
 * @param filename - The original filename to sanitize and include
 * @returns A unique storage key string
 */
export function generateUniqueKey(prefix: string, filename: string): string {
  const uuid = randomUUID();
  const sanitized = sanitizeFilename(filename);
  return `${prefix}/${uuid}/${sanitized}`;
}
