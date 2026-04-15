/**
 * Unit tests for single learning graph API routes.
 *
 * Tests cover:
 * - GET /api/learning-graphs/[id]    — single graph with episodes and edges
 * - PUT /api/learning-graphs/[id]    — update with opt-in concurrency, audit, revalidate
 * - DELETE /api/learning-graphs/[id] — typed-confirmation hard delete with blob purge
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

vi.mock('@/lib/admin/audit-log', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/admin/revalidate', () => ({
  revalidateAuditBrief: vi.fn(),
  revalidateLearningGraph: vi.fn(),
  CACHE_TAGS: { auditBriefsList: 'audit-briefs:list', learningGraphsList: 'learning-graphs:list' },
}));

vi.mock('@/lib/storage-cleanup', () => ({
  collectKeys: vi.fn((source) => {
    if (!source) return [];
    const out: string[] = [];
    const push = (v: unknown) => {
      if (typeof v === 'string' && v.length && !/^https?:/i.test(v)) out.push(v);
    };
    push((source as { thumbnailUrl?: string }).thumbnailUrl);
    push((source as { audioUrl?: string }).audioUrl);
    return out;
  }),
  diffOrphanedKeys: vi.fn(() => []),
  deleteKeys: vi.fn().mockResolvedValue({ deleted: [], failed: [] }),
}));

import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { writeAuditLog } from '@/lib/admin/audit-log';
import { revalidateLearningGraph } from '@/lib/admin/revalidate';
import { deleteKeys } from '@/lib/storage-cleanup';
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

const mockGraph = {
  id: graphId,
  title: 'Test Path',
  description: 'A test path',
  domain: 'Auditing',
  pathType: 'graph',
  thumbnailUrl: 'thumbs/path.png',
  isPublished: true,
  createdBy: 'user-1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockGraphWithRelations = {
  ...mockGraph,
  episodes: [
    {
      id: 'ep-1',
      title: 'Episode 1',
      thumbnailUrl: 'thumbs/ep1.png',
      audioUrl: 'audio/ep1.m3u8',
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

    expect(res.status).toBe(400);
    expect(prisma.learningGraph.findUnique).not.toHaveBeenCalled();
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

  it('updates a learning graph, audits, and revalidates', async () => {
    const updated = { ...mockGraph, title: 'Updated Title' };
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(mockGraph as never);
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
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', entityType: 'learning_graph' })
    );
    expect(revalidateLearningGraph).toHaveBeenCalledWith(graphId);
  });

  it('returns 409 when expectedUpdatedAt does not match', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(mockGraph as never);

    const req = createRequest(`/api/learning-graphs/${graphId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Stale',
        expectedUpdatedAt: new Date('2020-01-01').toISOString(),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(409);
    expect(prisma.learningGraph.update).not.toHaveBeenCalled();
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

  it('returns 400 without touching Prisma when id is not a UUID', async () => {
    const req = createRequest(`/api/learning-graphs/${invalidGraphId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'X' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: invalidGraphId }) });

    expect(res.status).toBe(400);
    expect(prisma.learningGraph.findUnique).not.toHaveBeenCalled();
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

  it('deletes a graph with typed confirmation, purges blobs, audits, and revalidates', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(mockGraphWithRelations as never);
    vi.mocked(prisma.learningGraph.delete).mockResolvedValue(mockGraph as never);

    const req = createRequest(`/api/learning-graphs/${graphId}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: graphId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.message).toBeDefined();
    expect(prisma.learningGraph.delete).toHaveBeenCalledWith({ where: { id: graphId } });
    expect(deleteKeys).toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'hard_delete', entityType: 'learning_graph' })
    );
    expect(revalidateLearningGraph).toHaveBeenCalledWith(graphId);
  });

  it('rejects DELETE without { confirm: "DELETE" }', async () => {
    const req = createRequest(`/api/learning-graphs/${graphId}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'wrong' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(400);
    expect(prisma.learningGraph.delete).not.toHaveBeenCalled();
  });

  it('returns 404 for non-existent graph', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue(null);

    const req = createRequest(`/api/learning-graphs/${missingGraphId}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: missingGraphId }) });

    expect(res.status).toBe(404);
  });

  it('returns 400 without touching Prisma when id is not a UUID', async () => {
    const req = createRequest(`/api/learning-graphs/${invalidGraphId}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: invalidGraphId }) });

    expect(res.status).toBe(400);
    expect(prisma.learningGraph.findUnique).not.toHaveBeenCalled();
    expect(prisma.learningGraph.delete).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest(`/api/learning-graphs/${graphId}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: graphId }) });

    expect(res.status).toBe(401);
  });
});
