/**
 * Unit tests for bookmark API route handlers.
 *
 * Tests cover:
 * - GET /api/bookmarks — paginated list with optional podcastId filter
 * - POST /api/bookmarks — create bookmark
 * - PUT /api/bookmarks/[id] — update bookmark note
 * - DELETE /api/bookmarks/[id] — delete bookmark
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    bookmark: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/api-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  getAuthUser: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { ApiError, ErrorCode } from '@/lib/api/errors';

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

const mockUser = { userId: 'user-1', email: 'test@test.com', role: 'public' };

const mockBookmark = {
  id: 'bm-1',
  userId: 'user-1',
  podcastId: '550e8400-e29b-41d4-a716-446655440000',
  timestampSeconds: 120.5,
  note: 'Great point here',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// ─── GET /api/bookmarks ──────────────────────────────────────────────────────

describe('GET /api/bookmarks', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue(mockUser);
    const mod = await import('@/app/api/bookmarks/route');
    GET = mod.GET;
  });

  it('returns paginated bookmarks for the authenticated user', async () => {
    vi.mocked(prisma.bookmark.findMany).mockResolvedValue([mockBookmark]);
    vi.mocked(prisma.bookmark.count).mockResolvedValue(1);

    const req = createRequest('/api/bookmarks');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('bm-1');
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1,
    });

    expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      })
    );
  });

  it('filters by podcastId when query param is provided', async () => {
    vi.mocked(prisma.bookmark.findMany).mockResolvedValue([]);
    vi.mocked(prisma.bookmark.count).mockResolvedValue(0);

    const podcastId = '550e8400-e29b-41d4-a716-446655440000';
    const req = createRequest(`/api/bookmarks?podcastId=${podcastId}`);
    await GET(req);

    expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          podcastId,
        }),
      })
    );
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/bookmarks');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/bookmarks ─────────────────────────────────────────────────────

describe('POST /api/bookmarks', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  const validBody = {
    podcastId: '550e8400-e29b-41d4-a716-446655440000',
    timestampSeconds: 60,
    note: 'Interesting topic',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue(mockUser);
    const mod = await import('@/app/api/bookmarks/route');
    POST = mod.POST;
  });

  it('creates a bookmark and returns 201', async () => {
    const created = { ...mockBookmark, ...validBody, userId: 'user-1' };
    vi.mocked(prisma.bookmark.create).mockResolvedValue(created as never);

    const req = createRequest('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.podcastId).toBe(validBody.podcastId);
    expect(prisma.bookmark.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        podcastId: validBody.podcastId,
        timestampSeconds: validBody.timestampSeconds,
        note: validBody.note,
      }),
    });
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    const req = createRequest('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ podcastId: 'not-a-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/bookmarks/[id] ─────────────────────────────────────────────────

describe('PUT /api/bookmarks/[id]', () => {
  let PUT: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue(mockUser);
    const mod = await import('@/app/api/bookmarks/[id]/route');
    PUT = mod.PUT;
  });

  it('updates bookmark note and returns 200', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(mockBookmark as never);
    const updated = { ...mockBookmark, note: 'Updated note' };
    vi.mocked(prisma.bookmark.update).mockResolvedValue(updated as never);

    const req = createRequest('/api/bookmarks/bm-1', {
      method: 'PUT',
      body: JSON.stringify({ note: 'Updated note' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'bm-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.note).toBe('Updated note');
  });

  it('returns 403 if user does not own the bookmark', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
      ...mockBookmark,
      userId: 'other-user',
    } as never);

    const req = createRequest('/api/bookmarks/bm-1', {
      method: 'PUT',
      body: JSON.stringify({ note: 'Hacked note' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'bm-1' }) });

    expect(res.status).toBe(403);
  });

  it('returns 404 if bookmark does not exist', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null);

    const req = createRequest('/api/bookmarks/nonexistent', {
      method: 'PUT',
      body: JSON.stringify({ note: 'Note' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/bookmarks/[id] ──────────────────────────────────────────────

describe('DELETE /api/bookmarks/[id]', () => {
  let DELETE: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue(mockUser);
    const mod = await import('@/app/api/bookmarks/[id]/route');
    DELETE = mod.DELETE;
  });

  it('deletes a bookmark and returns 200', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(mockBookmark as never);
    vi.mocked(prisma.bookmark.delete).mockResolvedValue(mockBookmark as never);

    const req = createRequest('/api/bookmarks/bm-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'bm-1' }) });

    expect(res.status).toBe(200);
    expect(prisma.bookmark.delete).toHaveBeenCalledWith({ where: { id: 'bm-1' } });
  });

  it('returns 404 for nonexistent bookmark', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null);

    const req = createRequest('/api/bookmarks/nonexistent', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });

  it('returns 403 if user does not own the bookmark', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
      ...mockBookmark,
      userId: 'other-user',
    } as never);

    const req = createRequest('/api/bookmarks/bm-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'bm-1' }) });

    expect(res.status).toBe(403);
  });
});
