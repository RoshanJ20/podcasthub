/**
 * Unit tests for activity logging API route handler.
 *
 * Tests cover:
 * - POST /api/activity — log user activity
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

vi.mock('@/lib/auth/api-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  getAuthUser: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { ApiError, ErrorCode } from '@/lib/api/errors';

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

const mockUser = { userId: 'user-1', email: 'test@test.com', role: 'public' };

// ─── POST /api/activity ──────────────────────────────────────────────────────

describe('POST /api/activity', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockReturnValue(mockUser);
    const mod = await import('@/app/api/activity/route');
    POST = mod.POST;
  });

  it('logs activity and returns 201', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({
        activityType: 'listen',
        podcastId: '550e8400-e29b-41d4-a716-446655440000',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        activityType: 'listen',
        podcastId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    });
  });

  it('logs activity with all optional fields', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({
        activityType: 'complete_episode',
        podcastId: '550e8400-e29b-41d4-a716-446655440000',
        episodeId: 'ep-1',
        graphId: 'graph-1',
        metadata: { duration: 300 },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        activityType: 'complete_episode',
        podcastId: '550e8400-e29b-41d4-a716-446655440000',
        episodeId: 'ep-1',
        graphId: 'graph-1',
        metadata: { duration: 300 },
      }),
    });
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'listen' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid activityType', async () => {
    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType: 'invalid_type' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing activityType', async () => {
    const req = createRequest('/api/activity', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
