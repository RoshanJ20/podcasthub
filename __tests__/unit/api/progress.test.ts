/**
 * Unit tests for progress API route handlers.
 *
 * Tests cover:
 * - GET /api/progress — user's progress across all learning paths
 * - POST /api/progress — mark episode complete (idempotent upsert)
 * - DELETE /api/progress/[id] — unmark episode completion
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    userProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
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
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const mockUser = { userId: 'user-1', email: 'test@test.com', role: 'public' };

const mockProgress = {
  id: 'prog-1',
  userId: 'user-1',
  graphId: 'graph-1',
  episodeId: 'ep-1',
  completedAt: new Date('2025-06-01'),
};

// ─── GET /api/progress ───────────────────────────────────────────────────────

describe('GET /api/progress', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue(mockUser);
    const mod = await import('@/app/api/progress/route');
    GET = mod.GET;
  });

  it('returns user progress grouped by graph', async () => {
    const progressItems = [
      {
        ...mockProgress,
        graph: { id: 'graph-1', title: 'Path A' },
        episode: { id: 'ep-1', title: 'Ep 1' },
      },
      {
        ...mockProgress,
        id: 'prog-2',
        episodeId: 'ep-2',
        graph: { id: 'graph-1', title: 'Path A' },
        episode: { id: 'ep-2', title: 'Ep 2' },
      },
    ];
    vi.mocked(prisma.userProgress.findMany).mockResolvedValue(progressItems as never);

    const req = createRequest('/api/progress');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(prisma.userProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      })
    );
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/progress');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns empty data when no progress exists', async () => {
    vi.mocked(prisma.userProgress.findMany).mockResolvedValue([]);

    const req = createRequest('/api/progress');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

// ─── POST /api/progress ──────────────────────────────────────────────────────

describe('POST /api/progress', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  const validBody = { graphId: 'graph-1', episodeId: 'ep-1' };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue(mockUser);
    const mod = await import('@/app/api/progress/route');
    POST = mod.POST;
  });

  it('marks episode complete and returns 201', async () => {
    vi.mocked(prisma.userProgress.upsert).mockResolvedValue(mockProgress as never);

    const req = createRequest('/api/progress', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toBeDefined();
    expect(prisma.userProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_episodeId: {
            userId: 'user-1',
            episodeId: 'ep-1',
          },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          graphId: 'graph-1',
          episodeId: 'ep-1',
        }),
        update: {},
      })
    );
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/progress', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const req = createRequest('/api/progress', {
      method: 'POST',
      body: JSON.stringify({ graphId: 'graph-1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/progress/[id] ───────────────────────────────────────────────

describe('DELETE /api/progress/[id]', () => {
  let DELETE: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue(mockUser);
    const mod = await import('@/app/api/progress/[id]/route');
    DELETE = mod.DELETE;
  });

  it('deletes progress record and returns 200', async () => {
    vi.mocked(prisma.userProgress.findUnique).mockResolvedValue(mockProgress as never);
    vi.mocked(prisma.userProgress.delete).mockResolvedValue(mockProgress as never);

    const req = createRequest('/api/progress/prog-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'prog-1' }) });

    expect(res.status).toBe(200);
    expect(prisma.userProgress.delete).toHaveBeenCalledWith({ where: { id: 'prog-1' } });
  });

  it('returns 404 for nonexistent progress record', async () => {
    vi.mocked(prisma.userProgress.findUnique).mockResolvedValue(null);

    const req = createRequest('/api/progress/nonexistent', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });

  it('returns 403 if user does not own the progress record', async () => {
    vi.mocked(prisma.userProgress.findUnique).mockResolvedValue({
      ...mockProgress,
      userId: 'other-user',
    } as never);

    const req = createRequest('/api/progress/prog-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'prog-1' }) });

    expect(res.status).toBe(403);
  });
});
