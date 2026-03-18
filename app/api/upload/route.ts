/**
 * File upload API endpoint for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Requires admin or superadmin authentication
 * - Validates upload request body (filename, content_type, file_size, category)
 * - Checks MIME type against allowed types for the file category
 * - Enforces max file size limits per category
 * - Generates a unique storage key and presigned upload URL
 * - Returns the presigned URL, key, and bucket for client-side upload
 *
 * Dependencies:
 * - next/server (NextResponse)
 * - zod (request validation)
 * - @/lib/auth/api-helpers (requireAuth, requireRole)
 * - @/lib/api/errors (ApiError, createErrorResponse, badRequest, validationFailed, internalError)
 * - @/lib/upload (FILE_TYPE_GROUPS, MAX_FILE_SIZES, validateFileType, generateUniqueKey, formatFileSize)
 * - @/lib/storage (generatePresignedUploadUrl)
 *
 * @route POST /api/upload
 * @body { filename: string, content_type: string, file_size: number, category: 'audio' | 'image' | 'pdf' }
 * @returns { data: { upload_url: string, key: string, bucket: string } }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import { createErrorResponse, badRequest, validationFailed } from '@/lib/api/errors';
import {
  FILE_TYPE_GROUPS,
  MAX_FILE_SIZES,
  validateFileType,
  generateUniqueKey,
  formatFileSize,
} from '@/lib/upload';
import { generatePresignedUploadUrl } from '@/lib/storage';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';

/** Zod schema for validating upload request body. */
const uploadRequestSchema = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  file_size: z.number().positive(),
  category: z.enum(['audio', 'image', 'pdf']),
});

/** S3 bucket name from environment, with a sensible default. */
const UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET ?? 'podcast-hub-uploads';

/**
 * Handles file upload requests by generating a presigned S3 upload URL.
 *
 * Validates authentication, authorization, request body, MIME type, and file size
 * before generating and returning a presigned URL for direct client-side upload.
 * Wrapped with request logging for operation tracking.
 *
 * @param request - The incoming POST request with upload metadata
 * @returns JSON response with presigned URL, key, and bucket, or an error response
 */
export const POST = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  // Require admin authentication — throws ApiError if unauthorized
  const user = requireAuth(request);
  requireRole(user, ['admin', 'superadmin']);

  // Parse and validate request body
  const body: unknown = await request.json();
  const parsed = uploadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(validationFailed(parsed.error.issues));
  }

  const { filename, content_type, file_size, category } = parsed.data;

  // Validate MIME type against allowed types for the category
  const allowedTypes = FILE_TYPE_GROUPS[category];
  if (!validateFileType(content_type, allowedTypes)) {
    return createErrorResponse(
      badRequest(`File type '${content_type}' is not allowed for category '${category}'`)
    );
  }

  // Validate file size against max for the category
  const maxSize = MAX_FILE_SIZES[category];
  if (file_size > maxSize) {
    return createErrorResponse(
      badRequest(
        `File size ${formatFileSize(file_size)} exceeds maximum of ${formatFileSize(maxSize)} for category '${category}'`
      )
    );
  }

  // Generate unique key and presigned upload URL
  const key = generateUniqueKey(category, filename);
  const uploadUrl = await generatePresignedUploadUrl(UPLOAD_BUCKET, key, content_type);

  return NextResponse.json({
    data: {
      upload_url: uploadUrl,
      key,
      bucket: UPLOAD_BUCKET,
    },
  });
});
