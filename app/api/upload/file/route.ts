/**
 * Direct file upload endpoint for Podcast Hub v2.
 *
 * Receives a file via multipart form data, uploads it to S3/MinIO server-side,
 * and returns the storage key. This avoids browser CORS issues with presigned URLs.
 *
 * @route POST /api/upload/file
 * @body FormData with: file (File), category ('audio' | 'image' | 'pdf')
 * @returns { data: { key: string } }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/storage';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import { ApiError, createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import {
  FILE_TYPE_GROUPS,
  MAX_FILE_SIZES,
  validateFileType,
  generateUniqueKey,
  formatFileSize,
} from '@/lib/upload';
import { createLogger } from '@/lib/logger';

const log = createLogger('upload-file-api');

const UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET ?? 'podcast-hub-uploads';

/**
 * Handles POST requests to upload a file to S3/MinIO storage.
 *
 * Accepts multipart form data with a 'file' and 'category' field. Validates the
 * file type against allowed MIME types for the category and enforces size limits.
 * Generates a unique storage key and uploads the file to the configured S3 bucket.
 * Requires admin or superadmin role.
 *
 * @param request - The incoming Next.js request object with multipart form data
 * @returns JSON response with the generated storage key ({ data: { key: string } })
 * @throws {ApiError} 400 if file or category is missing, category is invalid, or file type/size is rejected
 * @throws {ApiError} 401 if the user is not authenticated
 * @throws {ApiError} 403 if the user does not have admin or superadmin role
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;

    if (!file || !category) {
      return createErrorResponse(badRequest('file and category are required'));
    }

    if (!['audio', 'image', 'pdf'].includes(category)) {
      return createErrorResponse(badRequest('category must be audio, image, or pdf'));
    }

    const typedCategory = category as 'audio' | 'image' | 'pdf';

    if (!validateFileType(file.type, FILE_TYPE_GROUPS[typedCategory])) {
      return createErrorResponse(
        badRequest(`File type '${file.type}' not allowed for '${category}'`)
      );
    }

    if (file.size > MAX_FILE_SIZES[typedCategory]) {
      return createErrorResponse(
        badRequest(
          `File size ${formatFileSize(file.size)} exceeds max ${formatFileSize(MAX_FILE_SIZES[typedCategory])}`
        )
      );
    }

    const key = generateUniqueKey(category, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: UPLOAD_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    return NextResponse.json({ data: { key } });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    log.error({ error }, 'File upload failed');
    return createErrorResponse(internalError());
  }
}
