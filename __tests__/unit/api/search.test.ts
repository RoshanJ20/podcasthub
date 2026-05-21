/**
 * Unit tests for search API routes.
 *
 * Tests cover:
 * - GET /api/search: basic text search with mocked Prisma
 * - POST /api/search: semantic search with mocked embeddings + $queryRaw
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    auditBrief: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userActivity: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock('@/lib/auth/session-helpers', () => ({
  requireAuth: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';
import { requireAuth } from '@/lib/auth/session-helpers';
import { ApiError, ErrorCode } from '@/lib/api/errors';

const mockUser = { userId: 'user-1', email: 'test@test.com', role: 'public' };

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const mockAuditBriefResults = [
  {
    id: 'pod-1',
    title: 'React Performance Tips',
    description: 'How to optimize React apps',
    domain: 'Audit Technology',
    tags: ['react', 'performance'],
    thumbnailUrl: 'https://example.com/thumb.jpg',
  },
];

// ─── GET /api/search (basic text search) ────────────────────────────────────

describe('GET /api/search', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);
    const mod = await import('@/app/api/search/route');
    GET = mod.GET;
  });

  it('searches by title and returns results', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue(mockAuditBriefResults as never);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(1);

    const req = createRequest('/api/search?q=React');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].title).toBe('React Performance Tips');
    expect(body.query).toBe('React');
  });

  it('returns empty array for no matches', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/search?q=Python');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(0);
  });

  it('returns 400 for missing query', async () => {
    const req = createRequest('/api/search');
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty query', async () => {
    const req = createRequest('/api/search?q=');
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('uses case-insensitive search', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/search?q=react');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: { contains: 'react', mode: 'insensitive' },
            }),
          ]),
        }),
      })
    );
  });

  it('filters out archived audit briefs', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/search?q=test');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isArchived: false,
        }),
      })
    );
  });

  it('emits a `search` UserActivity row with kind=keyword and the result count', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue(mockAuditBriefResults as never);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(1);

    const req = createRequest('/api/search?q=React');
    await GET(req);

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        activityType: 'search',
        metadata: {
          query: 'React',
          resultCount: 1,
          kind: 'keyword',
        },
      }),
    });
  });

  it('truncates the persisted query to 500 characters', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const longQ = 'a'.repeat(750);
    const req = createRequest(`/api/search?q=${longQ}`);
    await GET(req);

    const call = vi.mocked(prisma.userActivity.create).mock.calls[0][0];
    expect(call.data.metadata).toMatchObject({ kind: 'keyword' });
    expect((call.data.metadata as { query: string }).query.length).toBe(500);
  });

  it('returns 401 and emits no activity when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest('/api/search?q=React');
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });

  it('does not emit activity when the query is invalid', async () => {
    const req = createRequest('/api/search');
    await GET(req);
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });
});

// ─── POST /api/search (semantic search) ─────────────────────────────────────

describe('POST /api/search', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);
    const mod = await import('@/app/api/search/route');
    POST = mod.POST;
  });

  it('returns transcript segments with similarity scores', async () => {
    const mockEmbedding = Array(1536).fill(0.1);
    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);

    const mockResults = [
      {
        id: 'transcript-1',
        auditBriefId: 'pod-1',
        auditBriefTitle: 'Audit Best Practices',
        content: 'This is about optimizing database queries...',
        startTime: 120,
        endTime: 180,
        similarity: 0.85,
      },
    ];
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResults);

    const req = createRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'how to optimize database queries' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toHaveProperty('auditBriefTitle');
    expect(body.results[0]).toHaveProperty('content');
    expect(body.results[0]).toHaveProperty('similarity');
    expect(body.query).toBe('how to optimize database queries');
  });

  it('returns 400 for missing query', async () => {
    const req = createRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty query', async () => {
    const req = createRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('calls generateEmbedding with the query text', async () => {
    vi.mocked(generateEmbedding).mockResolvedValue(Array(1536).fill(0));
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const req = createRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'test query' }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req);

    expect(generateEmbedding).toHaveBeenCalledWith('test query');
  });

  it('emits a `search` UserActivity row with kind=semantic and result count', async () => {
    vi.mocked(generateEmbedding).mockResolvedValue(Array(1536).fill(0));
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        id: 't1',
        auditBriefId: 'b1',
        auditBriefTitle: 'T',
        content: 'c',
        startTime: 0,
        endTime: 0,
        similarity: 0.9,
      },
      {
        id: 't2',
        auditBriefId: 'b2',
        auditBriefTitle: 'T',
        content: 'c',
        startTime: 0,
        endTime: 0,
        similarity: 0.8,
      },
    ]);

    const req = createRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'risk' }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req);

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        activityType: 'search',
        metadata: { query: 'risk', resultCount: 2, kind: 'semantic' },
      }),
    });
  });

  it('returns 401 and emits no activity when not authenticated (POST)', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'risk' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });
});
