/**
 * Unit tests for the direct file upload API route (POST /api/upload/file).
 *
 * Verifies:
 * - Handler authenticates via requireAuth (401 when missing session)
 * - Handler enforces admin/superadmin via requireRole (403 otherwise)
 * - Handler rejects missing file or category fields (400)
 * - Handler rejects unknown categories (400)
 * - Handler rejects disallowed MIME types for a category (400)
 * - Handler returns the generated storage key on success
 *
 * Note: the per-category size limit (MAX_FILE_SIZES) is exercised by the
 * existing /api/upload presigned-URL tests, which share the same constants.
 *
 * These tests pin down the handler's self-sufficient auth posture, which is the
 * invariant that allows /api/upload/file to be excluded from the NextAuth
 * middleware matcher without weakening access control.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  uploadBuffer: vi.fn(),
}));

import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { uploadBuffer } from '@/lib/storage';
import { ApiError, ErrorCode } from '@/lib/api/errors';
import { POST } from '@/app/api/upload/file/route';

const mockRequireAuth = vi.mocked(requireAuth);
const mockRequireRole = vi.mocked(requireRole);
const mockUploadBuffer = vi.mocked(uploadBuffer);

/**
 * Builds a NextRequest whose body is multipart form data containing a file
 * and category field, as the direct-upload handler expects.
 */
function createFileUploadRequest(file: File | null, category: string | null): NextRequest {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (category !== null) formData.append('category', category);

  return new NextRequest('http://localhost:3000/api/upload/file', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/upload/file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      userId: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
    });
    mockRequireRole.mockReturnValue(undefined);
    mockUploadBuffer.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const file = new File([new Uint8Array(10)], 'clip.mp3', { type: 'audio/mpeg' });
    const response = await POST(createFileUploadRequest(file, 'audio'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error_code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user lacks admin role', async () => {
    mockRequireRole.mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const file = new File([new Uint8Array(10)], 'clip.mp3', { type: 'audio/mpeg' });
    const response = await POST(createFileUploadRequest(file, 'audio'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error_code).toBe('FORBIDDEN');
  });

  it('calls requireRole with admin and superadmin roles', async () => {
    const file = new File([new Uint8Array(10)], 'clip.mp3', { type: 'audio/mpeg' });
    await POST(createFileUploadRequest(file, 'audio'));

    expect(mockRequireAuth).toHaveBeenCalled();
    expect(mockRequireRole).toHaveBeenCalledWith(
      { userId: 'user-1', email: 'admin@example.com', role: 'admin' },
      ['admin', 'superadmin']
    );
  });

  it('returns 400 when file is missing', async () => {
    const response = await POST(createFileUploadRequest(null, 'audio'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
    expect(body.message).toContain('file and category are required');
  });

  it('returns 400 when category is missing', async () => {
    const file = new File([new Uint8Array(10)], 'clip.mp3', { type: 'audio/mpeg' });
    const response = await POST(createFileUploadRequest(file, null));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
  });

  it('returns 400 for an unknown category', async () => {
    const file = new File([new Uint8Array(10)], 'clip.mp3', { type: 'audio/mpeg' });
    const response = await POST(createFileUploadRequest(file, 'video'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
    expect(body.message).toContain('category must be one of');
  });

  it('returns 400 for a disallowed MIME type within a category', async () => {
    const file = new File([new Uint8Array(10)], 'malware.exe', {
      type: 'application/x-msdownload',
    });
    const response = await POST(createFileUploadRequest(file, 'audio'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
    expect(body.message).toContain("File type 'application/x-msdownload' not allowed");
  });

  it('uploads the file and returns the generated key on success', async () => {
    const file = new File([new Uint8Array(1024)], 'clip.mp3', { type: 'audio/mpeg' });
    const response = await POST(createFileUploadRequest(file, 'audio'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.key).toMatch(/^audio\//);
    expect(mockUploadBuffer).toHaveBeenCalledWith(
      expect.stringMatching(/^audio\//),
      expect.any(Buffer),
      'audio/mpeg'
    );
  });
});
