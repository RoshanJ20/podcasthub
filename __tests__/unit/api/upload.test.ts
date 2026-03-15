/**
 * Unit tests for the upload API route.
 *
 * Verifies:
 * - Requires admin authentication
 * - Validates request body with Zod (filename, content_type, file_size, category)
 * - Rejects invalid MIME types for the given category
 * - Rejects files exceeding max size for the given category
 * - Returns presigned upload URL, key, and bucket on success
 * - Handles ApiError instances with createErrorResponse
 * - Handles unexpected errors with internalError
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth helpers
vi.mock('@/lib/auth/api-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
}));

// Mock storage
vi.mock('@/lib/storage', () => ({
  generatePresignedUploadUrl: vi.fn(),
}));

import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import { generatePresignedUploadUrl } from '@/lib/storage';
import { ApiError, ErrorCode } from '@/lib/api/errors';
import { POST } from '@/app/api/upload/route';

const mockRequireAuth = vi.mocked(requireAuth);
const mockRequireRole = vi.mocked(requireRole);
const mockGeneratePresignedUploadUrl = vi.mocked(generatePresignedUploadUrl);

/**
 * Helper to create a NextRequest with a JSON body for the upload endpoint.
 */
function createUploadRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockReturnValue({
      userId: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
    });
    mockRequireRole.mockReturnValue(undefined);
    mockGeneratePresignedUploadUrl.mockResolvedValue('https://s3.example.com/presigned-upload-url');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const request = createUploadRequest({
      filename: 'test.mp3',
      content_type: 'audio/mpeg',
      file_size: 1024,
      category: 'audio',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error_code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user lacks admin role', async () => {
    mockRequireRole.mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const request = createUploadRequest({
      filename: 'test.mp3',
      content_type: 'audio/mpeg',
      file_size: 1024,
      category: 'audio',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error_code).toBe('FORBIDDEN');
  });

  it('returns 422 for invalid request body (missing fields)', async () => {
    const request = createUploadRequest({});

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error_code).toBe('VALIDATION_FAILED');
  });

  it('returns 422 for invalid category', async () => {
    const request = createUploadRequest({
      filename: 'test.mp3',
      content_type: 'audio/mpeg',
      file_size: 1024,
      category: 'video',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error_code).toBe('VALIDATION_FAILED');
  });

  it('returns 400 for disallowed MIME type for category', async () => {
    const request = createUploadRequest({
      filename: 'test.exe',
      content_type: 'application/x-msdownload',
      file_size: 1024,
      category: 'audio',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
    expect(body.message).toContain('File type');
  });

  it('returns 400 when file size exceeds max for category', async () => {
    const request = createUploadRequest({
      filename: 'huge.mp3',
      content_type: 'audio/mpeg',
      file_size: 600 * 1024 * 1024, // 600MB > 500MB limit
      category: 'audio',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
    expect(body.message).toContain('File size');
  });

  it('returns 400 when image exceeds max size', async () => {
    const request = createUploadRequest({
      filename: 'large.png',
      content_type: 'image/png',
      file_size: 10 * 1024 * 1024, // 10MB > 5MB limit
      category: 'image',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
  });

  it('returns presigned URL, key, and bucket on success for audio', async () => {
    const request = createUploadRequest({
      filename: 'podcast.mp3',
      content_type: 'audio/mpeg',
      file_size: 1024 * 1024,
      category: 'audio',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.upload_url).toBe('https://s3.example.com/presigned-upload-url');
    expect(body.data.key).toMatch(/^audio\//);
    expect(body.data.bucket).toBeDefined();
    expect(typeof body.data.bucket).toBe('string');
  });

  it('returns presigned URL on success for image', async () => {
    const request = createUploadRequest({
      filename: 'cover.png',
      content_type: 'image/png',
      file_size: 1024,
      category: 'image',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.key).toMatch(/^image\//);
  });

  it('returns presigned URL on success for pdf', async () => {
    const request = createUploadRequest({
      filename: 'notes.pdf',
      content_type: 'application/pdf',
      file_size: 2048,
      category: 'pdf',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.key).toMatch(/^pdf\//);
  });

  it('calls requireAuth and requireRole with correct arguments', async () => {
    const request = createUploadRequest({
      filename: 'test.mp3',
      content_type: 'audio/mpeg',
      file_size: 1024,
      category: 'audio',
    });

    await POST(request);

    expect(mockRequireAuth).toHaveBeenCalledWith(request);
    expect(mockRequireRole).toHaveBeenCalledWith(
      { userId: 'user-1', email: 'admin@example.com', role: 'admin' },
      ['admin', 'superadmin']
    );
  });

  it('returns 500 for unexpected errors', async () => {
    mockRequireAuth.mockImplementation(() => {
      throw new Error('Unexpected database error');
    });

    const request = createUploadRequest({
      filename: 'test.mp3',
      content_type: 'audio/mpeg',
      file_size: 1024,
      category: 'audio',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error_code).toBe('INTERNAL_ERROR');
  });
});
