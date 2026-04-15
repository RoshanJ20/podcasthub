/**
 * Unit tests for audit brief API route handlers.
 *
 * Tests cover:
 * - GET  /api/audit-briefs              — paginated list with filtering/sorting
 * - GET  /api/audit-briefs/[id]         — single audit brief with transcripts
 * - POST /api/audit-briefs              — create audit brief (admin/superadmin)
 * - PUT  /api/audit-briefs/[id]         — update + opt-in concurrency + orphan cleanup
 * - DELETE /api/audit-briefs/[id]        — default soft archive
 * - DELETE /api/audit-briefs/[id]?hard=true — typed-confirmation hard delete with blob purge
 * - PATCH /api/audit-briefs/batch       — batch update sort orders (admin/superadmin)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    auditBrief: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transcript: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
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
    const keys: string[] = [];
    const add = (v: unknown) => {
      if (typeof v === 'string' && v.length && !/^https?:/i.test(v)) keys.push(v);
    };
    add((source as { thumbnailUrl?: string }).thumbnailUrl);
    add((source as { audioShortUrl?: string }).audioShortUrl);
    add((source as { audioLongUrl?: string }).audioLongUrl);
    const bulletins = (source as { bulletinUrls?: string[] }).bulletinUrls;
    if (Array.isArray(bulletins)) bulletins.forEach(add);
    return keys;
  }),
  diffOrphanedKeys: vi.fn(() => []),
  deleteKeys: vi.fn().mockResolvedValue({ deleted: [], failed: [] }),
}));

import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { writeAuditLog } from '@/lib/admin/audit-log';
import { revalidateAuditBrief } from '@/lib/admin/revalidate';
import { deleteKeys, diffOrphanedKeys } from '@/lib/storage-cleanup';
import { ApiError, ErrorCode } from '@/lib/api/errors';

/**
 * Creates a NextRequest for testing with the given URL and options.
 */
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const mockAuditBrief = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Test Audit Brief',
  description: 'A test audit brief',
  domain: 'Auditing',
  year: 2025,
  tags: ['audit', 'test'],
  thumbnailUrl: 'thumbs/test.jpg',
  audioShortUrl: 'audio/short.m3u8',
  audioLongUrl: null,
  bulletinUrls: [],
  sortOrder: 0,
  isArchived: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockAuditBriefWithTranscripts = {
  ...mockAuditBrief,
  transcripts: [
    {
      id: '660e8400-e29b-41d4-a716-446655440000',
      auditBriefId: mockAuditBrief.id,
      fullText: 'Hello world',
      segments: [{ start: 0, end: 5, text: 'Hello world' }],
      transcriptType: 'short',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ],
};

// ─── GET /api/audit-briefs ───────────────────────────────────────────────────────

describe('GET /api/audit-briefs', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/audit-briefs/route');
    GET = mod.GET;
  });

  it('returns paginated audit brief list with defaults', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([mockAuditBrief]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(1);

    const req = createRequest('/api/audit-briefs');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Test Audit Brief');
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1,
    });
  });

  it('always filters out archived audit briefs', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/audit-briefs');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isArchived: false }),
      })
    );
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockRejectedValue(new Error('DB down'));

    const req = createRequest('/api/audit-briefs');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

// ─── GET /api/audit-briefs/[id] ──────────────────────────────────────────────────

describe('GET /api/audit-briefs/[id]', () => {
  let GET: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/audit-briefs/[id]/route');
    GET = mod.GET;
  });

  it('returns audit brief with transcripts', async () => {
    vi.mocked(prisma.auditBrief.findFirst).mockResolvedValue(
      mockAuditBriefWithTranscripts as never
    );

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`);
    const res = await GET(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(mockAuditBrief.id);
  });

  it('returns 404 for non-existent audit brief', async () => {
    vi.mocked(prisma.auditBrief.findFirst).mockResolvedValue(null);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`);
    const res = await GET(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(404);
  });
});

// ─── POST /api/audit-briefs ──────────────────────────────────────────────────────

describe('POST /api/audit-briefs', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  const validBody = {
    title: 'New Audit Brief',
    description: 'Description here',
    domain: 'Auditing',
    year: 2025,
    tags: ['audit'],
    thumbnailUrl: 'thumbs/new.jpg',
    audioShortUrl: 'audio/new-short.m3u8',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/audit-briefs/route');
    POST = mod.POST;
  });

  it('creates an audit brief and returns 201', async () => {
    const created = { ...mockAuditBrief, ...validBody };
    vi.mocked(prisma.auditBrief.create).mockResolvedValue(created as never);

    const req = createRequest('/api/audit-briefs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.title).toBe('New Audit Brief');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest('/api/audit-briefs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/audit-briefs/[id] ──────────────────────────────────────────────────

describe('PUT /api/audit-briefs/[id]', () => {
  let PUT: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/audit-briefs/[id]/route');
    PUT = mod.PUT;
  });

  it('updates an audit brief, audits, and revalidates', async () => {
    const updated = { ...mockAuditBrief, title: 'Updated Title' };
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue(mockAuditBrief as never);
    vi.mocked(prisma.auditBrief.update).mockResolvedValue(updated as never);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe('Updated Title');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', entityType: 'audit_brief' })
    );
    expect(revalidateAuditBrief).toHaveBeenCalledWith(mockAuditBrief.id);
  });

  it('returns 409 when expectedUpdatedAt does not match', async () => {
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue(mockAuditBrief as never);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Conflicting',
        expectedUpdatedAt: new Date('2020-01-01').toISOString(),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(409);
    expect(prisma.auditBrief.update).not.toHaveBeenCalled();
  });

  it('cleans up orphaned blobs when URL fields change', async () => {
    const updated = { ...mockAuditBrief, thumbnailUrl: 'thumbs/new.jpg' };
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue(mockAuditBrief as never);
    vi.mocked(prisma.auditBrief.update).mockResolvedValue(updated as never);
    vi.mocked(diffOrphanedKeys).mockReturnValueOnce(['thumbs/test.jpg']);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, {
      method: 'PUT',
      body: JSON.stringify({ thumbnailUrl: 'thumbs/new.jpg' }),
      headers: { 'Content-Type': 'application/json' },
    });
    await PUT(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(deleteKeys).toHaveBeenCalledWith(['thumbs/test.jpg'], expect.anything());
  });

  it('returns 404 when the audit brief does not exist', async () => {
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue(null);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(404);
  });

  it('returns 400 for an update body with no mutation fields', async () => {
    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/audit-briefs/[id] ───────────────────────────────────────────────

describe('DELETE /api/audit-briefs/[id]', () => {
  let DELETE: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/audit-briefs/[id]/route');
    DELETE = mod.DELETE;
  });

  it('soft-archives by default and writes an audit log entry', async () => {
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue(mockAuditBrief as never);
    vi.mocked(prisma.auditBrief.update).mockResolvedValue({
      ...mockAuditBrief,
      isArchived: true,
    } as never);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(200);
    expect(prisma.auditBrief.update).toHaveBeenCalledWith({
      where: { id: mockAuditBrief.id },
      data: { isArchived: true },
    });
    expect(prisma.auditBrief.delete).not.toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'archive', entityType: 'audit_brief' })
    );
    expect(revalidateAuditBrief).toHaveBeenCalledWith(mockAuditBrief.id);
  });

  it('hard-deletes with body { confirm: "DELETE" } and purges blobs', async () => {
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue({
      ...mockAuditBrief,
      bulletinUrls: ['docs/bulletin-1.pdf'],
    } as never);
    vi.mocked(prisma.auditBrief.delete).mockResolvedValue(mockAuditBrief as never);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}?hard=true`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(200);
    expect(prisma.auditBrief.delete).toHaveBeenCalledWith({ where: { id: mockAuditBrief.id } });
    expect(deleteKeys).toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'hard_delete', entityType: 'audit_brief' })
    );
  });

  it('rejects hard-delete without { confirm: "DELETE" }', async () => {
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue(mockAuditBrief as never);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}?hard=true`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'wrong' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(400);
    expect(prisma.auditBrief.delete).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/audit-briefs/batch ───────────────────────────────────────────────

describe('PATCH /api/audit-briefs/batch', () => {
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/audit-briefs/batch/route');
    PATCH = mod.PATCH;
  });

  it('batch updates sort orders and returns 200', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    const updates = [
      { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 1 },
      { id: '550e8400-e29b-41d4-a716-446655440001', sortOrder: 2 },
    ];

    const req = createRequest('/api/audit-briefs/batch', {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('returns 400 for empty array', async () => {
    const req = createRequest('/api/audit-briefs/batch', {
      method: 'PATCH',
      body: JSON.stringify([]),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});
