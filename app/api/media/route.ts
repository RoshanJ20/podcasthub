/**
 * Media proxy endpoint for Podcast Hub v2.
 *
 * Proxies file requests from MinIO/S3 to avoid browser security restrictions
 * on loading media from private/localhost IPs. Supports range requests for
 * audio seeking.
 *
 * @route GET /api/media?key=audio/uuid/file.m4a
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/storage';
import { createErrorResponse, badRequest, notFound, internalError } from '@/lib/api/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('media-api');

const UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET ?? 'podcast-hub-uploads';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) {
    return createErrorResponse(badRequest('key parameter required'));
  }

  try {
    const range = request.headers.get('range');
    const command = new GetObjectCommand({
      Bucket: UPLOAD_BUCKET,
      Key: key,
      ...(range ? { Range: range } : {}),
    });

    const response = await s3Client.send(command);
    const body = response.Body;
    if (!body) {
      return createErrorResponse(notFound('File'));
    }

    const bytes = await body.transformToByteArray();

    // Infer content type from extension if S3 doesn't provide it
    const contentType =
      response.ContentType && response.ContentType !== 'application/octet-stream'
        ? response.ContentType
        : inferContentType(key);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };

    if (response.ContentLength) {
      headers['Content-Length'] = String(response.ContentLength);
    }

    if (response.ContentRange) {
      headers['Content-Range'] = response.ContentRange;
    }

    if (response.AcceptRanges) {
      headers['Accept-Ranges'] = response.AcceptRanges;
    }

    return new NextResponse(Buffer.from(bytes), {
      status: range && response.ContentRange ? 206 : 200,
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
