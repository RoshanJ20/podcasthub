/**
 * Unit tests for transcript API route handlers.
 *
 * Tests cover:
 * - GET /api/audit-briefs/[id]/transcript — list transcripts for an audit brief
 * - PUT /api/audit-briefs/[id]/transcript — upsert transcript
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

const auditBriefId = '550e8400-e29b-41d4-a716-446655440000';

const mockTranscript = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  auditBriefId,
  fullText: 'This is a transcript.',
  segments: [{ start: 0, end: 5, text: 'This is a transcript.' }],
  transcriptType: 'short',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// ─── GET /api/audit-briefs/[id]/transcript ───────────────────────────────────────

describe('GET /api/audit-briefs/[id]/transcript', () => {
  let GET: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/audit-briefs/[id]/transcript/route');
    GET = mod.GET;
  });

  it('returns transcripts for an audit brief', async () => {
    vi.mocked(prisma.transcript.findMany).mockResolvedValue([mockTranscript] as never);

    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`);
    const res = await GET(req, { params: Promise.resolve({ id: auditBriefId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].fullText).toBe('This is a transcript.');
  });

  it('returns empty array when no transcripts exist', async () => {
    vi.mocked(prisma.transcript.findMany).mockResolvedValue([]);

    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`);
    const res = await GET(req, { params: Promise.resolve({ id: auditBriefId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(prisma.transcript.findMany).mockRejectedValue(new Error('DB down'));

    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`);
    const res = await GET(req, { params: Promise.resolve({ id: auditBriefId }) });

    expect(res.status).toBe(500);
  });
});

// ─── PUT /api/audit-briefs/[id]/transcript ───────────────────────────────────────

describe('PUT /api/audit-briefs/[id]/transcript', () => {
  let PUT: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  const validBody = {
    fullText: 'Updated transcript text.',
    segments: [{ start: 0, end: 10, text: 'Updated transcript text.' }],
    transcriptType: 'short' as const,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/audit-briefs/[id]/transcript/route');
    PUT = mod.PUT;
  });

  it('upserts a transcript and returns 200', async () => {
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    } as never);
    const upserted = { ...mockTranscript, ...validBody };
    vi.mocked(prisma.transcript.upsert).mockResolvedValue(upserted as never);

    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: auditBriefId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.fullText).toBe('Updated transcript text.');
    expect(prisma.transcript.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          auditBriefId_transcriptType: {
            auditBriefId,
            transcriptType: 'short',
          },
        },
      })
    );
  });

  it('accepts long transcript type', async () => {
    vi.mocked(prisma.auditBrief.findUnique).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    } as never);
    const longBody = { ...validBody, transcriptType: 'long' };
    const upserted = { ...mockTranscript, ...longBody };
    vi.mocked(prisma.transcript.upsert).mockResolvedValue(upserted as never);

    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify(longBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: auditBriefId }) });

    expect(res.status).toBe(200);
    expect(prisma.transcript.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          auditBriefId_transcriptType: {
            auditBriefId,
            transcriptType: 'long',
          },
        },
      })
    );
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: auditBriefId }) });

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

    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: auditBriefId }) });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body (missing fullText)', async () => {
    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify({ segments: [], transcriptType: 'short' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: auditBriefId }) });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid transcriptType', async () => {
    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify({ ...validBody, transcriptType: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: auditBriefId }) });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid segment structure', async () => {
    const req = createRequest(`/api/audit-briefs/${auditBriefId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify({
        fullText: 'text',
        segments: [{ start: 'not-a-number', end: 5, text: 'hello' }],
        transcriptType: 'short',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: auditBriefId }) });

    expect(res.status).toBe(400);
  });
});
