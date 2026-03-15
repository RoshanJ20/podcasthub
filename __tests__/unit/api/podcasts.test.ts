/**
 * Unit tests for podcast API route handlers.
 *
 * Tests cover:
 * - GET /api/podcasts — paginated list with filtering and sorting
 * - GET /api/podcasts/[id] — single podcast with transcripts
 * - POST /api/podcasts — create podcast (admin/superadmin)
 * - PUT /api/podcasts/[id] — update podcast (admin/superadmin)
 * - DELETE /api/podcasts/[id] — soft delete podcast (superadmin)
 * - PATCH /api/podcasts/batch — batch update sort orders (admin/superadmin)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    podcast: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transcript: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth/api-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  getAuthUser: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import { ApiError, ErrorCode } from '@/lib/api/errors';

/**
 * Creates a NextRequest for testing with the given URL and options.
 */
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

const mockPodcast = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Test Podcast',
  description: 'A test podcast',
  domain: 'Auditing',
  year: 2025,
  tags: ['audit', 'test'],
  thumbnailUrl: 'https://example.com/thumb.jpg',
  audioShortUrl: 'https://example.com/short.mp3',
  audioLongUrl: null,
  bulletinUrls: [],
  sortOrder: 0,
  isArchived: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockPodcastWithTranscripts = {
  ...mockPodcast,
  transcripts: [
    {
      id: '660e8400-e29b-41d4-a716-446655440000',
      podcastId: mockPodcast.id,
      fullText: 'Hello world',
      segments: [{ start: 0, end: 5, text: 'Hello world' }],
      transcriptType: 'short',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ],
};

// ─── GET /api/podcasts ───────────────────────────────────────────────────────

describe('GET /api/podcasts', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/podcasts/route');
    GET = mod.GET;
  });

  it('returns paginated podcast list with defaults', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([mockPodcast]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(1);

    const req = createRequest('/api/podcasts');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Test Podcast');
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1,
    });
  });

  it('filters by domain when domain query param is provided', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(0);

    const req = createRequest('/api/podcasts?domain=Auditing');
    await GET(req);

    expect(prisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          domain: 'Auditing',
        }),
      })
    );
  });

  it('filters by year when year query param is provided', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(0);

    const req = createRequest('/api/podcasts?year=2025');
    await GET(req);

    expect(prisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          year: 2025,
        }),
      })
    );
  });

  it('filters by tags using hasSome when tags query param is provided', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(0);

    const req = createRequest('/api/podcasts?tags=audit,risk');
    await GET(req);

    expect(prisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { hasSome: ['audit', 'risk'] },
        }),
      })
    );
  });

  it('sorts by newest (createdAt desc) by default', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(0);

    const req = createRequest('/api/podcasts');
    await GET(req);

    expect(prisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('sorts by oldest when sort=oldest', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(0);

    const req = createRequest('/api/podcasts?sort=oldest');
    await GET(req);

    expect(prisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      })
    );
  });

  it('sorts by title when sort=title', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(0);

    const req = createRequest('/api/podcasts?sort=title');
    await GET(req);

    expect(prisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { title: 'asc' },
      })
    );
  });

  it('paginates correctly with custom page and limit', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(50);

    const req = createRequest('/api/podcasts?page=3&limit=10');
    const res = await GET(req);
    const body = await res.json();

    expect(body.pagination.page).toBe(3);
    expect(body.pagination.limit).toBe(10);
    expect(body.pagination.total).toBe(50);
    expect(body.pagination.total_pages).toBe(5);

    expect(prisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it('always filters out archived podcasts', async () => {
    vi.mocked(prisma.podcast.findMany).mockResolvedValue([]);
    vi.mocked(prisma.podcast.count).mockResolvedValue(0);

    const req = createRequest('/api/podcasts');
    await GET(req);

    expect(prisma.podcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isArchived: false,
        }),
      })
    );
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.podcast.findMany).mockRejectedValue(new Error('DB down'));

    const req = createRequest('/api/podcasts');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

// ─── GET /api/podcasts/[id] ──────────────────────────────────────────────────

describe('GET /api/podcasts/[id]', () => {
  let GET: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/podcasts/[id]/route');
    GET = mod.GET;
  });

  it('returns podcast with transcripts', async () => {
    vi.mocked(prisma.podcast.findFirst).mockResolvedValue(mockPodcastWithTranscripts as never);

    const req = createRequest(`/api/podcasts/${mockPodcast.id}`);
    const res = await GET(req, { params: Promise.resolve({ id: mockPodcast.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(mockPodcast.id);
    expect(body.data.transcripts).toHaveLength(1);
  });

  it('returns 404 for non-existent podcast', async () => {
    vi.mocked(prisma.podcast.findFirst).mockResolvedValue(null);

    const req = createRequest('/api/podcasts/non-existent-id');
    const res = await GET(req, { params: Promise.resolve({ id: 'non-existent-id' }) });

    expect(res.status).toBe(404);
  });

  it('returns 404 for archived podcast', async () => {
    vi.mocked(prisma.podcast.findFirst).mockResolvedValue(null);

    const req = createRequest(`/api/podcasts/${mockPodcast.id}`);
    const res = await GET(req, { params: Promise.resolve({ id: mockPodcast.id }) });

    expect(res.status).toBe(404);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.podcast.findFirst).mockRejectedValue(new Error('DB down'));

    const req = createRequest(`/api/podcasts/${mockPodcast.id}`);
    const res = await GET(req, { params: Promise.resolve({ id: mockPodcast.id }) });

    expect(res.status).toBe(500);
  });
});

// ─── POST /api/podcasts ──────────────────────────────────────────────────────

describe('POST /api/podcasts', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  const validBody = {
    title: 'New Podcast',
    description: 'Description here',
    domain: 'Auditing',
    year: 2025,
    tags: ['audit'],
    thumbnailUrl: 'https://example.com/thumb.jpg',
    audioShortUrl: 'https://example.com/short.mp3',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/podcasts/route');
    POST = mod.POST;
  });

  it('creates a podcast and returns 201', async () => {
    const created = { ...mockPodcast, ...validBody };
    vi.mocked(prisma.podcast.create).mockResolvedValue(created as never);

    const req = createRequest('/api/podcasts', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.title).toBe('New Podcast');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/podcasts', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks admin role', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'user@test.com',
      role: 'public',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest('/api/podcasts', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body', async () => {
    const req = createRequest('/api/podcasts', {
      method: 'POST',
      body: JSON.stringify({ title: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/podcasts/[id] ──────────────────────────────────────────────────

describe('PUT /api/podcasts/[id]', () => {
  let PUT: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/podcasts/[id]/route');
    PUT = mod.PUT;
  });

  it('updates a podcast and returns 200', async () => {
    const updated = { ...mockPodcast, title: 'Updated Title' };
    vi.mocked(prisma.podcast.update).mockResolvedValue(updated as never);

    const req = createRequest(`/api/podcasts/${mockPodcast.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: mockPodcast.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe('Updated Title');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest(`/api/podcasts/${mockPodcast.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: mockPodcast.id }) });

    expect(res.status).toBe(401);
  });

  it('returns 400 for empty update body', async () => {
    const req = createRequest(`/api/podcasts/${mockPodcast.id}`, {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: mockPodcast.id }) });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/podcasts/[id] ───────────────────────────────────────────────

describe('DELETE /api/podcasts/[id]', () => {
  let DELETE: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/podcasts/[id]/route');
    DELETE = mod.DELETE;
  });

  it('soft deletes a podcast and returns 200', async () => {
    const archived = { ...mockPodcast, isArchived: true };
    vi.mocked(prisma.podcast.update).mockResolvedValue(archived as never);

    const req = createRequest(`/api/podcasts/${mockPodcast.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockPodcast.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.podcast.update).toHaveBeenCalledWith({
      where: { id: mockPodcast.id },
      data: { isArchived: true },
    });
    expect(body.message).toBeDefined();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest(`/api/podcasts/${mockPodcast.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockPodcast.id }) });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not superadmin', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest(`/api/podcasts/${mockPodcast.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockPodcast.id }) });

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/podcasts/batch ───────────────────────────────────────────────

describe('PATCH /api/podcasts/batch', () => {
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/podcasts/batch/route');
    PATCH = mod.PATCH;
  });

  it('batch updates sort orders and returns 200', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    const updates = [
      { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 1 },
      { id: '550e8400-e29b-41d4-a716-446655440001', sortOrder: 2 },
    ];

    const req = createRequest('/api/podcasts/batch', {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/podcasts/batch', {
      method: 'PATCH',
      body: JSON.stringify([{ id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 1 }]),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 for empty array', async () => {
    const req = createRequest('/api/podcasts/batch', {
      method: 'PATCH',
      body: JSON.stringify([]),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid body', async () => {
    const req = createRequest('/api/podcasts/batch', {
      method: 'PATCH',
      body: JSON.stringify([{ id: 'not-a-uuid', sortOrder: 'abc' }]),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});
