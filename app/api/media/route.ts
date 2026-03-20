/**
 * Media proxy endpoint for The Audit Brief.
 *
 * Proxies file requests from Azure Blob Storage to avoid browser security restrictions
 * on loading media from private/localhost IPs. Supports range requests for
 * audio seeking.
 *
 * @route GET /api/media?key=audio/uuid/file.m4a
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { downloadObject } from '@/lib/storage';
import { createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('media-api');

/**
 * Handles GET requests to proxy media files from Azure Blob Storage.
 *
 * Retrieves the file identified by the 'key' query parameter from the Azure Blob container
 * and streams it back to the client. Supports HTTP range requests for audio seeking.
 * Infers content type from the file extension when Azure Blob does not provide one.
 *
 * @param request - The incoming Next.js request object with a 'key' query parameter
 * @returns Binary response with appropriate Content-Type, Content-Length, and range headers
 * @throws {ApiError} 400 if the 'key' query parameter is missing
 * @throws {ApiError} 404 if the file is not found in Azure Blob Storage
 * @throws {ApiError} 500 if the retrieval fails
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) {
    return createErrorResponse(badRequest('key parameter required'));
  }

  try {
    const range = request.headers.get('range');
    const result = await downloadObject(key, range);

    const contentType =
      result.contentType && result.contentType !== 'application/octet-stream'
        ? result.contentType
        : inferContentType(key);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };

    if (result.contentLength) {
      headers['Content-Length'] = String(result.contentLength);
    }
    if (result.contentRange) {
      headers['Content-Range'] = result.contentRange;
    }
    if (result.acceptRanges) {
      headers['Accept-Ranges'] = result.acceptRanges;
    }

    return new NextResponse(new Uint8Array(result.body), {
      status: range && result.contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    log.error({ error }, 'Media proxy failed');
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

function inferContentType(key: string): string {
  const ext = key.substring(key.lastIndexOf('.')).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}
