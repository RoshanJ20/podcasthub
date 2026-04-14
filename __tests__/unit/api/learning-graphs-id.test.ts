/**
 * Unit tests for single learning graph API routes.
 *
 * Tests cover:
 * - GET /api/learning-graphs/[id] — single graph with episodes and edges
 * - PUT /api/learning-graphs/[id] — update graph (admin/superadmin only)
 * - DELETE /api/learning-graphs/[id] — delete graph (admin/superadmin only)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    learningGraph: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

type RouteContext = { params: Promise<{ id: string }> };

const graphId = '550e8400-e29b-41d4-a716-446655440010';
const missingGraphId = '550e8400-e29b-41d4-a716-446655440099';
const invalidGraphId = 'new';

const mockGraphWithRelations = {
  id: graphId,
  title: 'Test Path',
  description: 'A test path',
  domain: 'Auditing',
  pathType: 'graph',
  thumbnailUrl: null,
  isPublished: true,
  createdBy: 'user-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  episodes: [
    {
      id: 'ep-1',
      graphId,
      title: 'Episode 1',
      description: null,
      audioUrl: 'https://example.com/ep1.mp3',
      transcript: [],
      positionX: 0,
      positionY: 0,
      nodeType: 'start',
      sortOrder: 0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ],
  edges: [
    {
      id: 'edge-1',
      graphId,
      sourceEpisodeId: 'ep-1',
      targetEpisodeId: 'ep-2',
      label: null,
      createdAt: new Date('2025-01-01'),
    },
  ],
};

const unpublishedGraph = {
  ...mockGraphWithRelations,
  isPublished: false,
};

// ─── GET /api/learning-graphs/[id] ──────────────────────────────────────────

describe('GET /api/learning-graphs/[id]', () => {
  let GET: (req: NextRequest, context: RouteContext) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/learning-graphs/[id]/route');
    GET = mod.GET;
  });

  it('returns graph with episodes and edges', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(mockGraphWithRelations as never);

    const req = createRequest(`/api/learning-graphs/${graphId}`);
    const res = await GET(req, { params: Promise.resolve({ id: graphId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(graphId);
    expect(body.data.episodes).toHaveLength(1);
    expect(body.data.edges).toHaveLength(1);
  });

  it('returns 404 for non-existent graph', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(null);

    const req = createRequest(`/api/learning-graphs/${missingGraphId}`);
    const res = await GET(req, { params: Promise.resolve({ id: missingGraphId }) });

    expect(res.status).toBe(404);
  });

  it('returns 400 without calling Prisma when id is not a UUID', async () => {
    const req = createRequest(`/api/learning-graphs/${invalidGraphId}`);
    const res = await GET(req, { params: Promise.resolve({ id: invalidGraphId }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
    expect(prisma.learningGraph.findUnique).not.toHaveBeenCalled();
  });

  it('returns graph regardless of isPublished status for any user', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(unpublishedGraph as never);

    const req = createRequest(`/api/learning-graphs/${graphId}`);
    const res = await GET(req, { params: Promise.resolve({ id: graphId }) });
    const body = await res.json();

    /* All paths are auto-published, so no isPublished check is needed */
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(graphId);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockRejectedValue(new Error('DB error'));

    const req = createRequest(`/api/learning-graphs/${graphId}`);
    const res = await GET(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(500);
  });
});

// ─── PUT /api/learning-graphs/[id] ──────────────────────────────────────────

describe('PUT /api/learning-graphs/[id]', () => {
  let PUT: (req: NextRequest, context: RouteContext) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/learning-graphs/[id]/route');
    PUT = mod.PUT;
  });

  it('updates a learning graph and returns 200', async () => {
    const updated = { ...mockGraphWithRelations, title: 'Updated Title' };
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue({ id: graphId } as never);
    vi.mocked(prisma.learningGraph.update).mockResolvedValue(updated as never);

    const req = createRequest(`/api/learning-graphs/${graphId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe('Updated Title');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest(`/api/learning-graphs/${graphId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'X' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

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

    const req = createRequest(`/api/learning-graphs/${graphId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'X' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(403);
  });

  it('returns 400 without touching Prisma when id is not a UUID', async () => {
    const req = createRequest(`/api/learning-graphs/${invalidGraphId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'X' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: invalidGraphId }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
    expect(prisma.learningGraph.findUnique).not.toHaveBeenCalled();
    expect(prisma.learningGraph.update).not.toHaveBeenCalled();
  });
});

// ─── DELETE /api/learning-graphs/[id] ───────────────────────────────────────

describe('DELETE /api/learning-graphs/[id]', () => {
  let DELETE: (req: NextRequest, context: RouteContext) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/learning-graphs/[id]/route');
    DELETE = mod.DELETE;
  });

  it('deletes a learning graph and returns 200', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue({ id: graphId } as never);
    vi.mocked(prisma.learningGraph.delete).mockResolvedValue(mockGraphWithRelations as never);

    const req = createRequest(`/api/learning-graphs/${graphId}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: graphId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.message).toBeDefined();
    expect(prisma.learningGraph.delete).toHaveBeenCalledWith({ where: { id: graphId } });
  });

  it('returns 404 for non-existent graph', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(null);

    const req = createRequest(`/api/learning-graphs/${missingGraphId}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: missingGraphId }) });

    expect(res.status).toBe(404);
  });

  it('returns 400 without touching Prisma when id is not a UUID', async () => {
    const req = createRequest(`/api/learning-graphs/${invalidGraphId}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: invalidGraphId }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error_code).toBe('BAD_REQUEST');
    expect(prisma.learningGraph.findUnique).not.toHaveBeenCalled();
    expect(prisma.learningGraph.delete).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest(`/api/learning-graphs/${graphId}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: graphId }) });

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

    const req = createRequest(`/api/learning-graphs/${graphId}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(403);
  });
});
