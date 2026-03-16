/**
 * Unit tests for learning graph bulk data API route (upsert-based).
 *
 * Tests cover:
 * - PUT /api/learning-graphs/[id]/data — upsert episodes (update existing, create new, delete removed)
 * - Temp ID to real ID mapping for edges
 * - Error cases: 400, 401, 403, 404
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    learningGraph: {
      findUnique: vi.fn(),
    },
    episode: {
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    learningPathEdge: {
      deleteMany: vi.fn(),
      create: vi.fn(),
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

/** Creates a NextRequest for testing. */
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

type RouteContext = { params: Promise<{ id: string }> };

const graphId = '550e8400-e29b-41d4-a716-446655440010';

/** Existing episode IDs already in the database. */
const existingEpisodeId1 = 'existing-ep-1';
const existingEpisodeId2 = 'existing-ep-2';

/** Payload with a mix of existing and new (temp) episodes. */
const upsertPayload = {
  episodes: [
    {
      id: existingEpisodeId1,
      title: 'Updated Episode 1',
      description: 'Updated description',
      audioUrl: 'https://example.com/ep1.mp3',
      positionX: 10,
      positionY: 20,
      nodeType: 'start',
      sortOrder: 0,
    },
    {
      id: 'temp-new-1',
      title: 'Brand New Episode',
      description: 'New episode description',
      audioUrl: 'https://example.com/new.mp3',
      positionX: 200,
      positionY: 100,
      nodeType: 'end',
      sortOrder: 1,
    },
  ],
  edges: [
    {
      sourceEpisodeId: existingEpisodeId1,
      targetEpisodeId: 'temp-new-1',
      label: 'Next',
    },
  ],
};

// ─── PUT /api/learning-graphs/[id]/data ─────────────────────────────────────

describe('PUT /api/learning-graphs/[id]/data', () => {
  let PUT: (req: NextRequest, context: RouteContext) => Promise<Response>;

  /** Mock the saved graph returned at the end of the handler. */
  const mockSavedGraph = {
    id: graphId,
    title: 'Test Path',
    episodes: [
      { id: existingEpisodeId1, title: 'Updated Episode 1', sortOrder: 0 },
      { id: 'real-new-1', title: 'Brand New Episode', sortOrder: 1 },
    ],
    edges: [
      {
        id: 'edge-1',
        graphId,
        sourceEpisodeId: existingEpisodeId1,
        targetEpisodeId: 'real-new-1',
        label: 'Next',
      },
    ],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    // Graph exists with two existing episodes
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue({
      id: graphId,
      episodes: [{ id: existingEpisodeId1 }, { id: existingEpisodeId2 }],
    } as never);

    // Default mocks for episode operations
    vi.mocked(prisma.episode.update).mockResolvedValue({
      id: existingEpisodeId1,
      title: 'Updated Episode 1',
    } as never);
    vi.mocked(prisma.episode.create).mockResolvedValue({
      id: 'real-new-1',
      title: 'Brand New Episode',
    } as never);
    vi.mocked(prisma.episode.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.learningPathEdge.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.learningPathEdge.create).mockResolvedValue({
      id: 'edge-1',
      graphId,
      sourceEpisodeId: existingEpisodeId1,
      targetEpisodeId: 'real-new-1',
      label: 'Next',
    } as never);

    // The final findUnique call to return the saved graph
    vi.mocked(prisma.learningGraph.findUnique)
      .mockResolvedValueOnce({
        id: graphId,
        episodes: [{ id: existingEpisodeId1 }, { id: existingEpisodeId2 }],
      } as never)
      .mockResolvedValueOnce(mockSavedGraph as never);

    const mod = await import('@/app/api/learning-graphs/[id]/data/route');
    PUT = mod.PUT;
  });

  it('updates existing episodes in place, preserving their IDs', async () => {
    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(upsertPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(200);
    // Should update existing episode, not delete and recreate it
    expect(prisma.episode.update).toHaveBeenCalledWith({
      where: { id: existingEpisodeId1 },
      data: expect.objectContaining({
        title: 'Updated Episode 1',
        positionX: 10,
        positionY: 20,
      }),
    });
  });

  it('creates new episodes from temp IDs', async () => {
    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(upsertPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(200);
    // Should create a new episode for the temp-id entry
    expect(prisma.episode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        graphId,
        title: 'Brand New Episode',
      }),
    });
  });

  it('deletes episodes that were removed by the user', async () => {
    // existingEpisodeId2 is in the DB but NOT in the payload => should be deleted
    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(upsertPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(200);
    // Should delete edges referencing the removed episode first
    expect(prisma.learningPathEdge.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          graphId,
          OR: [
            { sourceEpisodeId: { in: [existingEpisodeId2] } },
            { targetEpisodeId: { in: [existingEpisodeId2] } },
          ],
        }),
      })
    );
    // Then delete the removed episode
    expect(prisma.episode.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [existingEpisodeId2] } },
    });
  });

  it('maps temp IDs to real IDs when creating edges', async () => {
    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(upsertPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    await PUT(req, { params: Promise.resolve({ id: graphId }) });

    // Edge should use real ID for the temp episode
    expect(prisma.learningPathEdge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        graphId,
        sourceEpisodeId: existingEpisodeId1,
        targetEpisodeId: 'real-new-1', // mapped from 'temp-new-1'
        label: 'Next',
      }),
    });
  });

  it('returns the full saved graph in the response', async () => {
    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(upsertPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.episodes).toHaveLength(2);
    expect(body.data.edges).toHaveLength(1);
    expect(body.data.id).toBe(graphId);
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

  it('returns 404 if graph does not exist', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockReset();
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(null);

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(upsertPayload),
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
      body: JSON.stringify(upsertPayload),
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
      body: JSON.stringify(upsertPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(403);
  });

  it('handles empty edges array without creating edges', async () => {
    const payload = {
      episodes: [
        {
          id: existingEpisodeId1,
          title: 'Episode 1',
          audioUrl: 'https://example.com/ep1.mp3',
        },
      ],
      edges: [],
    };

    // Only one existing episode in payload, so no deletion needed
    vi.mocked(prisma.learningGraph.findUnique)
      .mockReset()
      .mockResolvedValueOnce({
        id: graphId,
        episodes: [{ id: existingEpisodeId1 }],
      } as never)
      .mockResolvedValueOnce({
        id: graphId,
        episodes: [{ id: existingEpisodeId1, title: 'Episode 1' }],
        edges: [],
      } as never);

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(200);
    expect(prisma.learningPathEdge.create).not.toHaveBeenCalled();
  });

  it('does not delete episodes when all existing episodes are in the payload', async () => {
    const payload = {
      episodes: [
        { id: existingEpisodeId1, title: 'Ep 1', audioUrl: 'url1' },
        { id: existingEpisodeId2, title: 'Ep 2', audioUrl: 'url2' },
      ],
      edges: [],
    };

    vi.mocked(prisma.episode.update)
      .mockReset()
      .mockResolvedValueOnce({ id: existingEpisodeId1 } as never)
      .mockResolvedValueOnce({ id: existingEpisodeId2 } as never);

    vi.mocked(prisma.learningGraph.findUnique)
      .mockReset()
      .mockResolvedValueOnce({
        id: graphId,
        episodes: [{ id: existingEpisodeId1 }, { id: existingEpisodeId2 }],
      } as never)
      .mockResolvedValueOnce({
        id: graphId,
        episodes: [
          { id: existingEpisodeId1, title: 'Ep 1' },
          { id: existingEpisodeId2, title: 'Ep 2' },
        ],
        edges: [],
      } as never);

    const req = createRequest(`/api/learning-graphs/${graphId}/data`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(200);
    // No episodes should be deleted since all existing ones are still present
    expect(prisma.episode.deleteMany).not.toHaveBeenCalled();
  });
});
