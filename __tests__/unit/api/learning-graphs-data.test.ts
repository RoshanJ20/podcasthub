/**
 * Unit tests for learning graph bulk data API route.
 *
 * Tests cover:
 * - PUT /api/learning-graphs/[id]/data — bulk save episodes and edges
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockTx = {
  episode: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  learningPathEdge: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    learningGraph: {
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
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import { ApiError, ErrorCode } from '@/lib/api/errors';

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

type RouteContext = { params: Promise<{ id: string }> };

const graphId = '550e8400-e29b-41d4-a716-446655440010';

const validPayload = {
  episodes: [
    {
      tempId: 'temp-1',
      title: 'Episode 1',
      description: 'First episode',
      audioUrl: 'https://example.com/ep1.mp3',
      positionX: 0,
      positionY: 0,
      nodeType: 'start',
      sortOrder: 0,
    },
    {
      tempId: 'temp-2',
      title: 'Episode 2',
      description: 'Second episode',
      audioUrl: 'https://example.com/ep2.mp3',
      positionX: 200,
      positionY: 100,
      nodeType: 'end',
      sortOrder: 1,
    },
  ],
  edges: [
    {
      sourceEpisodeId: 'temp-1',
      targetEpisodeId: 'temp-2',
      label: 'Next',
    },
  ],
};

// ─── PUT /api/learning-graphs/[id]/data ─────────────────────────────────────

describe('PUT /api/learning-graphs/[id]/data', () => {
  let PUT: (req: NextRequest, context: RouteContext) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    // Graph exists
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue({ id: graphId } as never);

    // Transaction episode creates return IDs
    mockTx.episode.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.learningPathEdge.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.episode.create
      .mockResolvedValueOnce({ id: 'real-1', title: 'Episode 1' })
      .mockResolvedValueOnce({ id: 'real-2', title: 'Episode 2' });
    mockTx.learningPathEdge.createMany.mockResolvedValue({ count: 1 });

    const mod = await import('@/app/api/learning-graphs/[id]/data/route');
    PUT = mod.PUT;
  });

  it('bulk saves episodes and edges in a transaction and returns 200', async () => {
    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.episodes).toHaveLength(2);
    expect(mockTx.episode.deleteMany).toHaveBeenCalledWith({ where: { graphId } });
    expect(mockTx.learningPathEdge.deleteMany).toHaveBeenCalledWith({ where: { graphId } });
    expect(mockTx.episode.create).toHaveBeenCalledTimes(2);
    expect(mockTx.learningPathEdge.createMany).toHaveBeenCalledTimes(1);
  });

  it('replaces existing episodes and edges (deletes then creates)', async () => {
    mockTx.episode.deleteMany.mockResolvedValue({ count: 5 });
    mockTx.learningPathEdge.deleteMany.mockResolvedValue({ count: 3 });
    mockTx.episode.create
      .mockReset()
      .mockResolvedValueOnce({ id: 'real-1', title: 'Episode 1' })
      .mockResolvedValueOnce({ id: 'real-2', title: 'Episode 2' });

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(200);
    expect(mockTx.episode.deleteMany).toHaveBeenCalledWith({ where: { graphId } });
    expect(mockTx.learningPathEdge.deleteMany).toHaveBeenCalledWith({ where: { graphId } });
  });

  it('returns 400 if edge references non-existent episode tempId', async () => {
    const badPayload = {
      episodes: validPayload.episodes,
      edges: [
        {
          sourceEpisodeId: 'temp-1',
          targetEpisodeId: 'non-existent',
        },
      ],
    };

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(badPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(400);
  });

  it('returns 400 if episodes array is missing', async () => {
    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify({ edges: [] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(400);
  });

  it('handles empty edges array', async () => {
    mockTx.episode.create
      .mockReset()
      .mockResolvedValueOnce({ id: 'real-1', title: 'Episode 1' })
      .mockResolvedValueOnce({ id: 'real-2', title: 'Episode 2' });

    const payload = {
      episodes: validPayload.episodes,
      edges: [],
    };

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(200);
    expect(mockTx.learningPathEdge.createMany).not.toHaveBeenCalled();
  });

  it('returns 404 if graph does not exist', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(null);

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(404);
  });

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-2',
      email: 'user@test.com',
      role: 'public',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(403);
  });
});
