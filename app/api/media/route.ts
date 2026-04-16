/**
 * Media proxy endpoint for The Audit Brief.
 *
 * Streams file responses from Azure Blob Storage to avoid buffering large files
 * (up to 500 MB audio) into server memory. Supports range requests for
 * audio seeking.
 *
 * @route GET /api/media?key=audio/uuid/file.m4a
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Readable } from 'stream';
import { streamObject } from '@/lib/storage';
import { createErrorResponse, badRequest, internalError, notFound } from '@/lib/api/errors';
import { createLogger } from '@/lib/logger';
import { classifyStorageError } from '@/lib/storage-errors';

const log = createLogger('media-api');

/**
 * Handles GET requests to stream media files from Azure Blob Storage.
 *
 * Retrieves the file identified by the 'key' query parameter from the Azure Blob container
 * and streams it to the client without buffering. Supports HTTP range requests for audio
 * seeking.
 *
 * @param request - The incoming Next.js request object with a 'key' query parameter
 * @returns Streaming response with appropriate Content-Type, Content-Length, and range headers
 * @throws {ApiError} 400 if the 'key' query parameter is missing
 * @throws {ApiError} 500 if the retrieval fails
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) {
    return createErrorResponse(badRequest('key parameter required'));
  }

  try {
    const range = request.headers.get('range');
    const result = await streamObject(key, range);

    const contentType =
      result.contentType && result.contentType !== 'application/octet-stream'
        ? result.contentType
        : inferContentType(key);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };

    if (result.contentLength !== undefined) {
      headers['Content-Length'] = String(result.contentLength);
    }
    if (result.contentRange) {
      headers['Content-Range'] = result.contentRange;
    }
    if (result.acceptRanges) {
      headers['Accept-Ranges'] = result.acceptRanges;
    }

    // Convert Node.js ReadableStream to Web ReadableStream for NextResponse.
    // Readable.toWeb() is available in Node 20 LTS.
    const webStream = Readable.toWeb(
      result.stream instanceof Readable ? result.stream : Readable.from(result.stream)
    );

    return new NextResponse(webStream as ReadableStream, {
      status: range && result.contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    const errorInfo = classifyStorageError(error);
    log.error({ blob_key: key, ...errorInfo }, 'Media proxy failed');

    if (errorInfo.category === 'blob_not_found') {
      return createErrorResponse(notFound('Media file'));
    }
    return createErrorResponse(internalError('Failed to retrieve file'));
  }
}

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/**
 * Infers the MIME content type from a blob key's file extension.
 *
 * @param key - The blob key (e.g., "audio/uuid/file.m4a")
 * @returns The inferred MIME type, or 'application/octet-stream' as fallback
 */
function inferContentType(key: string): string {
  const ext = key.substring(key.lastIndexOf('.')).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}
