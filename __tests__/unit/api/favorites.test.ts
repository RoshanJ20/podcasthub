/**
 * Unit tests for audit-brief favorites API route handlers.
 *
 * Tests cover:
 * - GET /api/favorites — returns favorited audit-brief IDs
 * - POST /api/favorites — toggles a favorite (add/remove)
 * - Race condition handling (P2002, P2025)
 * - Emission of `favorite` / `unfavorite` UserActivity rows on every toggle,
 *   including under race-condition recovery (intent preserved).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    favorite: {
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

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockBriefId = '660e8400-e29b-41d4-a716-446655440001';

describe('GET /api/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns favorited audit-brief IDs for an authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: mockUserId,
      email: 'test@example.com',
      role: 'public',
    });
    vi.mocked(prisma.favorite.findMany).mockResolvedValue([
      { id: '1', userId: mockUserId, auditBriefId: mockBriefId, createdAt: new Date() },
    ] as never);

    const { GET } = await import('@/app/api/favorites/route');
    const response = await GET(createRequest('/api/favorites'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([mockBriefId]);
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    );

    const { GET } = await import('@/app/api/favorites/route');
    const response = await GET(createRequest('/api/favorites'));

    expect(response.status).toBe(401);
  });
});

describe('POST /api/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: mockUserId,
      email: 'test@example.com',
      role: 'public',
    });
  });

  it('creates a favorite when none exists and returns 201', async () => {
    vi.mocked(prisma.favorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.favorite.create).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      auditBriefId: mockBriefId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/favorites/route');
    const response = await POST(
      createRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: mockBriefId }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.favorited).toBe(true);
  });

  it('deletes a favorite when one already exists and returns 200', async () => {
    vi.mocked(prisma.favorite.findUnique).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      auditBriefId: mockBriefId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.favorite.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/favorites/route');
    const response = await POST(
      createRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: mockBriefId }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.favorited).toBe(false);
  });

  it('returns 400 when auditBriefId is missing', async () => {
    const { POST } = await import('@/app/api/favorites/route');
    const response = await POST(
      createRequest('/api/favorites', { method: 'POST', body: JSON.stringify({}) })
    );

    expect(response.status).toBe(400);
  });

  it('emits a `favorite` UserActivity row when creating a favorite', async () => {
    vi.mocked(prisma.favorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.favorite.create).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      auditBriefId: mockBriefId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/favorites/route');
    await POST(
      createRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: mockBriefId }),
      })
    );

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: mockUserId,
        activityType: 'favorite',
        auditBriefId: mockBriefId,
        graphId: null,
      }),
    });
  });

  it('emits an `unfavorite` UserActivity row when removing a favorite', async () => {
    vi.mocked(prisma.favorite.findUnique).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      auditBriefId: mockBriefId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.favorite.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/favorites/route');
    await POST(
      createRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: mockBriefId }),
      })
    );

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: mockUserId,
        activityType: 'unfavorite',
        auditBriefId: mockBriefId,
      }),
    });
  });

  it('emits `favorite` on P2002 race (record created externally)', async () => {
    vi.mocked(prisma.favorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.favorite.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      })
    );
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/favorites/route');
    await POST(
      createRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: mockBriefId }),
      })
    );

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ activityType: 'favorite' }),
    });
  });

  it('emits `unfavorite` on P2025 race (record deleted externally)', async () => {
    vi.mocked(prisma.favorite.findUnique).mockResolvedValue({
      id: '1',
      userId: mockUserId,
      auditBriefId: mockBriefId,
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.favorite.delete).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })
    );
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/favorites/route');
    await POST(
      createRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ auditBriefId: mockBriefId }),
      })
    );

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ activityType: 'unfavorite' }),
    });
  });
});
