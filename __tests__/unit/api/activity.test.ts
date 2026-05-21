/**
 * Unit tests for the activity logging API route handler.
 *
 * Tests cover:
 * - POST /api/activity — validates the discriminated-union request schema
 *   (lib/schemas/activity.ts), persists via trackActivity (lib/analytics/),
 *   and returns 201 on success.
 *
 * The route is a thin wrapper around `trackActivity`; metadata-shape coverage
 * lives in the schema test file. This file focuses on the route's
 * authentication, validation rejection, and persistence wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    userActivity: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session-helpers';
import { ApiError, ErrorCode } from '@/lib/api/errors';

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const mockUser = { userId: 'user-1', email: 'test@test.com', role: 'public' };
const uuid = '550e8400-e29b-41d4-a716-446655440000';

describe('POST /api/activity', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);
    const mod = await import('@/app/api/activity/route');
    POST = mod.POST;
  });

  it('persists a listen ping (no metadata) and returns 201', async () => {
    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'listen', auditBriefId: uuid }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        activityType: 'listen',
        auditBriefId: uuid,
        metadata: {},
      }),
    });
  });

  it('persists an enriched listen ping with full metadata', async () => {
    const metadata = {
      positionSeconds: 42.5,
      playbackRate: 1.5,
      audioType: 'long' as const,
      sessionId: uuid,
      elapsedSinceLastPingMs: 30000,
    };

    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'listen', auditBriefId: uuid, metadata }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ metadata }),
    });
  });

  it('persists a view_audit_brief event', async () => {
    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({
        activityType: 'view_audit_brief',
        auditBriefId: uuid,
        metadata: { source: 'home' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activityType: 'view_audit_brief',
        auditBriefId: uuid,
        metadata: { source: 'home' },
      }),
    });
  });

  it('persists a view_path event for a learning graph', async () => {
    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'view_path', graphId: uuid }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activityType: 'view_path',
        graphId: uuid,
      }),
    });
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'listen' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown activityType', async () => {
    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'invalid_type' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });

  it('returns 400 for a missing activityType', async () => {
    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when search metadata is malformed', async () => {
    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({
        activityType: 'search',
        metadata: { query: 'risk', resultCount: 5, kind: 'fuzzy' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });

  it('still returns 201 when the underlying prisma write fails (fire-and-forget)', async () => {
    vi.mocked(prisma.userActivity.create).mockRejectedValue(new Error('db down'));

    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'listen', auditBriefId: uuid }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });
});
