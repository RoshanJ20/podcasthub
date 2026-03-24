/**
 * Unit tests for audit brief API route handlers.
 *
 * Tests cover:
 * - GET /api/audit-briefs — paginated list with filtering and sorting
 * - GET /api/audit-briefs/[id] — single audit brief with transcripts
 * - POST /api/audit-briefs — create audit brief (admin/superadmin)
 * - PUT /api/audit-briefs/[id] — update audit brief (admin/superadmin)
 * - DELETE /api/audit-briefs/[id] — soft delete audit brief (superadmin)
 * - PATCH /api/audit-briefs/batch — batch update sort orders (admin/superadmin)
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

import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
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
  thumbnailUrl: 'https://example.com/thumb.jpg',
  audioShortUrl: 'https://example.com/short.mp3',
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

  it('filters by domain when domain query param is provided', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/audit-briefs?domain=Auditing');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          domain: 'Auditing',
        }),
      })
    );
  });

  it('filters by year when year query param is provided', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/audit-briefs?year=2025');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          year: 2025,
        }),
      })
    );
  });

  it('filters by tags using hasSome when tags query param is provided', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/audit-briefs?tags=audit,risk');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { hasSome: ['audit', 'risk'] },
        }),
      })
    );
  });

  it('sorts by newest (createdAt desc) by default', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/audit-briefs');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('sorts by oldest when sort=oldest', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/audit-briefs?sort=oldest');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      })
    );
  });

  it('sorts by title when sort=title', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/audit-briefs?sort=title');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { title: 'asc' },
      })
    );
  });

  it('paginates correctly with custom page and limit', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(50);

    const req = createRequest('/api/audit-briefs?page=3&limit=10');
    const res = await GET(req);
    const body = await res.json();

    expect(body.pagination.page).toBe(3);
    expect(body.pagination.limit).toBe(10);
    expect(body.pagination.total).toBe(50);
    expect(body.pagination.total_pages).toBe(5);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it('always filters out archived audit briefs', async () => {
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);

    const req = createRequest('/api/audit-briefs');
    await GET(req);

    expect(prisma.auditBrief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isArchived: false,
        }),
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
    expect(body.data.transcripts).toHaveLength(1);
  });

  it('returns 404 for non-existent audit brief', async () => {
    vi.mocked(prisma.auditBrief.findFirst).mockResolvedValue(null);

    const req = createRequest('/api/audit-briefs/non-existent-id');
    const res = await GET(req, { params: Promise.resolve({ id: 'non-existent-id' }) });

    expect(res.status).toBe(404);
  });

  it('returns 404 for archived audit brief', async () => {
    vi.mocked(prisma.auditBrief.findFirst).mockResolvedValue(null);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`);
    const res = await GET(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(404);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.auditBrief.findFirst).mockRejectedValue(new Error('DB down'));

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`);
    const res = await GET(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(500);
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
    thumbnailUrl: 'https://example.com/thumb.jpg',
    audioShortUrl: 'https://example.com/short.mp3',
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

  it('returns 403 when user lacks admin role', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'user@test.com',
      role: 'public',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest('/api/audit-briefs', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body', async () => {
    const req = createRequest('/api/audit-briefs', {
      method: 'POST',
      body: JSON.stringify({ title: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
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

  it('updates an audit brief and returns 200', async () => {
    const updated = { ...mockAuditBrief, title: 'Updated Title' };
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue({ id: mockAuditBrief.id } as never);
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
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(401);
  });

  it('returns 400 for empty update body', async () => {
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
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/audit-briefs/[id]/route');
    DELETE = mod.DELETE;
  });

  it('soft deletes an audit brief and returns 200', async () => {
    const archived = { ...mockAuditBrief, isArchived: true };
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue({ id: mockAuditBrief.id } as never);
    vi.mocked(prisma.auditBrief.update).mockResolvedValue(archived as never);

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.auditBrief.update).toHaveBeenCalledWith({
      where: { id: mockAuditBrief.id },
      data: { isArchived: true },
    });
    expect(body.data.message).toBeDefined();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not superadmin', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest(`/api/audit-briefs/${mockAuditBrief.id}`, { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: mockAuditBrief.id }) });

    expect(res.status).toBe(403);
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

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest('/api/audit-briefs/batch', {
      method: 'PATCH',
      body: JSON.stringify([{ id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 1 }]),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(401);
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

  it('returns 400 for invalid body', async () => {
    const req = createRequest('/api/audit-briefs/batch', {
      method: 'PATCH',
      body: JSON.stringify([{ id: 'not-a-uuid', sortOrder: 'abc' }]),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});
