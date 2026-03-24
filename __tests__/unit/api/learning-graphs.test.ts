/**
 * Unit tests for learning graph list and creation API routes.
 *
 * Tests cover:
 * - GET /api/learning-graphs — paginated list (all auto-published) with domain filter
 * - POST /api/learning-graphs — create learning graph (admin/superadmin only)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    learningGraph: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { ApiError, ErrorCode } from '@/lib/api/errors';

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const mockGraph = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  title: 'Published Path',
  description: 'A published learning path',
  domain: 'Auditing',
  pathType: 'graph',
  thumbnailUrl: null,
  isPublished: true,
  createdBy: 'user-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockDraftGraph = {
  id: '550e8400-e29b-41d4-a716-446655440011',
  title: 'Draft Path',
  description: null,
  domain: 'LEAP',
  pathType: 'linear',
  thumbnailUrl: null,
  isPublished: false,
  createdBy: 'user-1',
  createdAt: new Date('2025-01-02'),
  updatedAt: new Date('2025-01-02'),
};

// ─── GET /api/learning-graphs ─────────────────────────────────────────────────

describe('GET /api/learning-graphs', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/learning-graphs/route');
    GET = mod.GET;
  });

  it('returns all paths for unauthenticated users without isPublished filter', async () => {
    vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([
      mockGraph,
      mockDraftGraph,
    ] as never);
    vi.mocked(prisma.learningGraph.count).mockResolvedValue(2);

    const req = createRequest('/api/learning-graphs');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    /* No isPublished filter should be applied — all paths are auto-published */
    expect(prisma.learningGraph.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ isPublished: true }),
      })
    );
  });

  it('returns all paths for admin users without isPublished filter', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([
      mockGraph,
      mockDraftGraph,
    ] as never);
    vi.mocked(prisma.learningGraph.count).mockResolvedValue(2);

    const req = createRequest('/api/learning-graphs');
    const res = await GET(req);
    const body = await res.json();

    expect(body.data).toHaveLength(2);
    /* No isPublished filter for admin either — all paths are auto-published */
    expect(prisma.learningGraph.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ isPublished: true }),
      })
    );
  });

  it('returns all paths for superadmin users', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([
      mockGraph,
      mockDraftGraph,
    ] as never);
    vi.mocked(prisma.learningGraph.count).mockResolvedValue(2);

    const req = createRequest('/api/learning-graphs');
    const res = await GET(req);
    const body = await res.json();

    expect(body.data).toHaveLength(2);
  });

  it('supports domain filter', async () => {
    vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([]);
    vi.mocked(prisma.learningGraph.count).mockResolvedValue(0);

    const req = createRequest('/api/learning-graphs?domain=Auditing');
    await GET(req);

    expect(prisma.learningGraph.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ domain: 'Auditing' }),
      })
    );
  });

  it('supports pagination params', async () => {
    vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([]);
    vi.mocked(prisma.learningGraph.count).mockResolvedValue(50);

    const req = createRequest('/api/learning-graphs?page=3&limit=10');
    const res = await GET(req);
    const body = await res.json();

    expect(body.pagination.page).toBe(3);
    expect(body.pagination.limit).toBe(10);
    expect(body.pagination.total).toBe(50);
    expect(body.pagination.total_pages).toBe(5);

    expect(prisma.learningGraph.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.learningGraph.findMany).mockRejectedValue(new Error('DB down'));

    const req = createRequest('/api/learning-graphs');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

// ─── POST /api/learning-graphs ────────────────────────────────────────────────

describe('POST /api/learning-graphs', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  const validBody = {
    title: 'New Path',
    description: 'A learning path',
    domain: 'Auditing',
    pathType: 'graph',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/learning-graphs/route');
    POST = mod.POST;
  });

  it('creates a learning graph for admin and returns 201', async () => {
    const created = { ...mockGraph, ...validBody, id: 'new-id' };
    vi.mocked(prisma.learningGraph.create).mockResolvedValue(created as never);

    const req = createRequest('/api/learning-graphs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.title).toBe('New Path');
    expect(body.data.id).toBeDefined();
  });

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest('/api/learning-graphs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-2',
      email: 'user@test.com',
      role: 'public',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest('/api/learning-graphs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body (missing title)', async () => {
    const req = createRequest('/api/learning-graphs', {
      method: 'POST',
      body: JSON.stringify({ pathType: 'graph' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid pathType', async () => {
    const req = createRequest('/api/learning-graphs', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, pathType: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
