/**
 * Unit tests for learning graph favorites API route handlers.
 *
 * Tests cover:
 * - GET /api/learning-graph-favorites — returns favorited learning graph IDs
 * - POST /api/learning-graph-favorites — toggles a favorite (add/remove)
 * - Authentication enforcement on both endpoints
 * - Validation of learningGraphId on POST
 * - Race condition handling (P2025, P2002 Prisma errors)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    learningGraphFavorite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    userActivity: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session-helpers', () => ({
  requireAuth: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session-helpers';
import { ApiError, ErrorCode } from '@/lib/api/errors';
import { Prisma } from '@prisma/client';

/**
 * Creates a NextRequest for testing with the given URL and options.
 */
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockGraphId = '660e8400-e29b-41d4-a716-446655440001';

describe('GET /api/learning-graph-favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns favorited learning graph IDs for authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: mockUserId,
      email: 'test@example.com',
      role: 'public',
    });
    vi.mocked(prisma.learningGraphFavorite.findMany).mockResolvedValue([
      { id: '1', userId: mockUserId, learningGraphId: mockGraphId, createdAt: new Date() },
    ] as never);

    const { GET } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([mockGraphId]);
    expect(prisma.learningGraphFavorite.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      select: { learningGraphId: true },
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const { GET } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});

describe('POST /api/learning-graph-favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: mockUserId,
      email: 'test@example.com',
      role: 'public',
    });
  });

  it('creates a favorite when it does not exist', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.learningGraphFavorite.create).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      learningGraphId: mockGraphId,
      createdAt: new Date(),
    } as never);

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: mockGraphId }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.favorited).toBe(true);
  });

  it('deletes a favorite when it already exists', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      learningGraphId: mockGraphId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.learningGraphFavorite.delete).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: mockGraphId }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.favorited).toBe(false);
  });

  it('returns 400 when learningGraphId is missing', async () => {
    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 when learningGraphId is empty string', async () => {
    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: '  ' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('handles P2002 race condition (duplicate insert)', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.learningGraphFavorite.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      })
    );

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: mockGraphId }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.favorited).toBe(true);
  });

  it('handles P2025 race condition (record deleted between find and delete)', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      learningGraphId: mockGraphId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.learningGraphFavorite.delete).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })
    );

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: mockGraphId }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.favorited).toBe(false);
  });

  it('emits a `favorite` UserActivity row when creating a favorite', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.learningGraphFavorite.create).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      learningGraphId: mockGraphId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: mockGraphId }),
    });
    await POST(request);

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: mockUserId,
        activityType: 'favorite',
        graphId: mockGraphId,
        auditBriefId: null,
      }),
    });
  });

  it('emits an `unfavorite` UserActivity row when removing a favorite', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      learningGraphId: mockGraphId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.learningGraphFavorite.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: mockGraphId }),
    });
    await POST(request);

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: mockUserId,
        activityType: 'unfavorite',
        graphId: mockGraphId,
      }),
    });
  });

  it('emits `favorite` even on P2002 race (intent preserved)', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.learningGraphFavorite.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      })
    );
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: mockGraphId }),
    });
    await POST(request);

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ activityType: 'favorite' }),
    });
  });

  it('emits `unfavorite` even on P2025 race (intent preserved)', async () => {
    vi.mocked(prisma.learningGraphFavorite.findUnique).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      learningGraphId: mockGraphId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.learningGraphFavorite.delete).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })
    );
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/learning-graph-favorites/route');
    const request = createRequest('/api/learning-graph-favorites', {
      method: 'POST',
      body: JSON.stringify({ learningGraphId: mockGraphId }),
    });
    await POST(request);

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ activityType: 'unfavorite' }),
    });
  });
});
