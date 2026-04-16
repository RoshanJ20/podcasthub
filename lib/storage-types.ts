/**
 * Type definitions and utilities for Azure Blob Storage operations.
 *
 * Key responsibilities:
 * - Defines result shapes for download and stream operations
 * - Parses HTTP Range headers into Azure SDK offset/count format
 *
 * Extracted from lib/storage.ts to keep file sizes under 300 lines
 * while maintaining clean separation of types from implementation.
 */

/**
 * Result of a blob download operation that buffers content into memory.
 */
export interface DownloadResult {
  /** The file content as a Buffer. */
  body: Buffer;
  /** The MIME type of the blob, if available. */
  contentType?: string;
  /** The size of the returned content in bytes. */
  contentLength?: number;
  /** The content range header for partial responses. */
  contentRange?: string;
  /** Whether the blob accepts range requests. */
  acceptRanges?: string;
}

/**
 * Result of a blob stream operation.
 *
 * Returns the raw Node.js ReadableStream from the Azure SDK without buffering
 * any content into memory. Suitable for piping large files directly to an
 * HTTP response.
 */
export interface StreamResult {
  /** The raw Node.js readable stream from Azure Blob Storage. */
  stream: NodeJS.ReadableStream;
  /** The MIME type of the blob, if available. */
  contentType?: string;
  /** The size of the returned content in bytes. */
  contentLength?: number;
  /** The content range header for partial responses. */
  contentRange?: string;
  /** Whether the blob accepts range requests. */
  acceptRanges?: string;
}

/**
 * Parses an HTTP Range header into offset and count for Azure Blob download.
 *
 * @param range - HTTP Range header value (e.g., "bytes=0-1023")
 * @returns Object with offset and optional count, or undefined if parsing fails
 */
export function parseRange(range: string): { offset: number; count?: number } | undefined {
  // Pattern: "bytes=<start>-<optional end>"
  const match = range.match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return undefined;

  const offset = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : undefined;
  const count = end !== undefined ? end - offset + 1 : undefined;

  return { offset, count };
}
