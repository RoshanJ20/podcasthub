/**
 * Direct file upload endpoint for The Audit Brief.
 *
 * Receives a file via multipart form data, uploads it to Azure Blob Storage server-side,
 * and returns the storage key. This avoids browser CORS issues with presigned URLs.
 *
 * @route POST /api/upload/file
 * @body FormData with: file (File), category ('audio' | 'image' | 'pdf')
 * @returns { data: { key: string } }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { uploadBuffer } from '@/lib/storage';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { createErrorResponse, badRequest } from '@/lib/api/errors';
import {
  FILE_TYPE_GROUPS,
  MAX_FILE_SIZES,
  validateFileType,
  generateUniqueKey,
  formatFileSize,
} from '@/lib/upload';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';

/**
 * Handles POST requests to upload a file to Azure Blob Storage.
 *
 * Accepts multipart form data with a 'file' and 'category' field. Validates the
 * file type against allowed MIME types for the category and enforces size limits.
 * Generates a unique storage key and uploads the file to the configured Azure Blob container.
 * Requires admin or superadmin role. Wrapped with request logging for operation tracking.
 *
 * @param request - The incoming Next.js request object with multipart form data
 * @returns JSON response with the generated storage key ({ data: { key: string } })
 * @throws {ApiError} 400 if file or category is missing, category is invalid, or file type/size is rejected
 * @throws {ApiError} 401 if the user is not authenticated
 * @throws {ApiError} 403 if the user does not have admin or superadmin role
 */
export const POST = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  const user = await requireAuth();
  requireRole(user, ['admin', 'superadmin']);

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const category = formData.get('category') as string | null;

  if (!file || !category) {
    return createErrorResponse(badRequest('file and category are required'));
  }

  const validCategories = Object.keys(FILE_TYPE_GROUPS);
  if (!validCategories.includes(category)) {
    return createErrorResponse(
      badRequest(`category must be one of: ${validCategories.join(', ')}`)
    );
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

  await uploadBuffer(key, buffer, file.type);

  return NextResponse.json({ data: { key } });
});
