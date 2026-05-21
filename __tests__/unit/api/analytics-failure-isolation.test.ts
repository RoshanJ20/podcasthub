/**
 * Failure-isolation tests for analytics emission.
 *
 * Cross-cutting concern: a `prisma.userActivity.create` rejection must NEVER
 * cause the parent request to fail or the domain write to roll back. This
 * file exercises every route that emits a UserActivity row and asserts:
 *   1. The HTTP response is unchanged from the happy path.
 *   2. The underlying domain write (Bookmark, Favorite, UserProgress) was
 *      still performed.
 *
 * The single shared mock `prisma.userActivity.create.mockRejectedValue(...)`
 * proves the trackActivity helper's swallow-and-log behavior holds at every
 * call site.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    bookmark: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    auditBrief: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    episode: { findUnique: vi.fn() },
    favorite: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    learningGraphFavorite: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    userProgress: { create: vi.fn(), findUnique: vi.fn() },
    userActivity: { create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/embeddings', () => ({ generateEmbedding: vi.fn() }));

vi.mock('@/lib/auth/session-helpers', () => ({
  requireAuth: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session-helpers';
import { generateEmbedding } from '@/lib/embeddings';

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const mockUser = { userId: 'user-1', email: 'u@example.com', role: 'public' };
const BRIEF_ID = '550e8400-e29b-41d4-a716-446655440000';
const GRAPH_ID = '660e8400-e29b-41d4-a716-446655440001';
const EPISODE_ID = '770e8400-e29b-41d4-a716-446655440002';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAuth).mockResolvedValue(mockUser);
  /* Every test exercises the failure path. */
  vi.mocked(prisma.userActivity.create).mockRejectedValue(new Error('analytics db down'));
});

describe('analytics failure isolation', () => {
  it('POST /api/bookmarks still creates the bookmark and returns 201', async () => {
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue({ id: BRIEF_ID } as never);
    vi.mocked(prisma.bookmark.create).mockResolvedValue({
      id: 'bm-1',
      userId: 'user-1',
      auditBriefId: BRIEF_ID,
      episodeId: null,
      timestampSeconds: 30,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const { POST } = await import('@/app/api/bookmarks/route');
    const res = await POST(
      createRequest('/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: BRIEF_ID, timestampSeconds: 30 }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(201);
    expect(prisma.bookmark.create).toHaveBeenCalled();
  });

  it('DELETE /api/bookmarks/[id] still deletes the bookmark and returns 200', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
      id: 'bm-1',
      userId: 'user-1',
      auditBriefId: BRIEF_ID,
      episodeId: null,
      timestampSeconds: 30,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.bookmark.delete).mockResolvedValue({} as never);

    const { DELETE } = await import('@/app/api/bookmarks/[id]/route');
    const res = await DELETE(createRequest('/api/bookmarks/bm-1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'bm-1' }),
    });

    expect(res.status).toBe(200);
    expect(prisma.bookmark.delete).toHaveBeenCalled();
  });

  it('POST /api/progress still creates progress and returns 201', async () => {
    vi.mocked(prisma.episode.findUnique).mockResolvedValue({
      id: EPISODE_ID,
      graphId: GRAPH_ID,
    } as never);
    vi.mocked(prisma.userProgress.create).mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      graphId: GRAPH_ID,
      episodeId: EPISODE_ID,
      completedAt: new Date(),
    } as never);

    const { POST } = await import('@/app/api/progress/route');
    const res = await POST(
      createRequest('/api/progress', {
        method: 'POST',
        body: JSON.stringify({ graphId: GRAPH_ID, episodeId: EPISODE_ID }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(201);
    expect(prisma.userProgress.create).toHaveBeenCalled();
  });

  it('POST /api/favorites still toggles and returns 201 on create', async () => {
    vi.mocked(prisma.favorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.favorite.create).mockResolvedValue({
      id: 'f1',
      userId: 'user-1',
      auditBriefId: BRIEF_ID,
      createdAt: new Date(),
    } as never);

    const { POST } = await import('@/app/api/favorites/route');
    const res = await POST(
      createRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: BRIEF_ID }),
      })
    );

    expect(res.status).toBe(201);
    expect(prisma.favorite.create).toHaveBeenCalled();
  });

  it('POST /api/favorites still toggles and returns 200 on delete', async () => {
    vi.mocked(prisma.favorite.findUnique).mockResolvedValue({
      id: 'f1',
      userId: 'user-1',
      auditBriefId: BRIEF_ID,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.favorite.delete).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/favorites/route');
    const res = await POST(
      createRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: BRIEF_ID }),
      })
    );

    expect(res.status).toBe(200);
    expect(prisma.favorite.delete).toHaveBeenCalled();
  });

  it('POST /api/learning-graph-favorites still toggles and returns 201', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.learningGraphFavorite.create).mockResolvedValue({
      id: 'lf1',
      userId: 'user-1',
      learningGraphId: GRAPH_ID,
      createdAt: new Date(),
    } as never);

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const res = await POST(
      createRequest('/api/learning-graph-favorites', {
        method: 'POST',
        body: JSON.stringify({ learningGraphId: GRAPH_ID }),
      })
    );

    expect(res.status).toBe(201);
    expect(prisma.learningGraphFavorite.create).toHaveBeenCalled();
  });

  it('GET /api/search still returns results and 200', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const { GET } = await import('@/app/api/search/route');
    const res = await GET(createRequest('/api/search?q=audit'));

    expect(res.status).toBe(200);
  });

  it('POST /api/search still returns results and 200', async () => {
    vi.mocked(generateEmbedding).mockResolvedValue(Array(1536).fill(0));
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const { POST } = await import('@/app/api/search/route');
    const res = await POST(
      createRequest('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'risk' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(200);
  });

  it('POST /api/activity still returns 201 (the route fronts trackActivity directly)', async () => {
    const { POST } = await import('@/app/api/activity/route');
    const res = await POST(
      createRequest('/api/activity', {
        method: 'POST',
        body: JSON.stringify({ activityType: 'view_audit_brief', auditBriefId: BRIEF_ID }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(201);
  });
});
