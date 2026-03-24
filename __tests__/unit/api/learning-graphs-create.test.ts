/**
 * Unit tests for learning graph creation — auto-publish behaviour.
 *
 * Verifies that the POST /api/learning-graphs endpoint always sets
 * isPublished: true when creating a learning graph, regardless of
 * what the client sends.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    learningGraph: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';

/**
 * Creates a NextRequest for testing.
 *
 * @param url - Relative URL path
 * @param options - Standard RequestInit options
 * @returns NextRequest instance
 */
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(
    new URL(url, 'http://localhost:3000'),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

const ADMIN_USER = {
  userId: 'user-1',
  email: 'admin@test.com',
  role: 'admin',
};

const VALID_BODY = {
  title: 'Auto-Published Path',
  description: 'Should be published automatically',
  domain: 'Auditing',
  pathType: 'linear',
};

// ─── POST /api/learning-graphs — auto-publish ────────────────────────────────

describe('POST /api/learning-graphs — auto-publish', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(ADMIN_USER);
    vi.mocked(requireRole).mockReturnValue(undefined);
    const mod = await import('@/app/api/learning-graphs/route');
    POST = mod.POST;
  });

  it('creates a learning graph with isPublished set to true', async () => {
    const createdGraph = {
      id: 'new-graph-id',
      ...VALID_BODY,
      isPublished: true,
      createdBy: ADMIN_USER.userId,
      createdAt: new Date('2026-03-16'),
      updatedAt: new Date('2026-03-16'),
    };
    vi.mocked(prisma.learningGraph.create).mockResolvedValue(createdGraph as never);

    const req = createRequest('/api/learning-graphs', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.isPublished).toBe(true);

    // Verify prisma.create was called with isPublished: true in the data
    expect(prisma.learningGraph.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPublished: true,
        }),
      })
    );
  });

  it('forces isPublished to true even if client sends false', async () => {
    const bodyWithPublishedFalse = { ...VALID_BODY, isPublished: false };
    const createdGraph = {
      id: 'new-graph-id-2',
      ...VALID_BODY,
      isPublished: true,
      createdBy: ADMIN_USER.userId,
      createdAt: new Date('2026-03-16'),
      updatedAt: new Date('2026-03-16'),
    };
    vi.mocked(prisma.learningGraph.create).mockResolvedValue(createdGraph as never);

    const req = createRequest('/api/learning-graphs', {
      method: 'POST',
      body: JSON.stringify(bodyWithPublishedFalse),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);

    // Even though client sent isPublished: false, the API must force it to true
    expect(prisma.learningGraph.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPublished: true,
        }),
      })
    );
  });

  it('sets createdBy from the authenticated user', async () => {
    const createdGraph = {
      id: 'new-graph-id-3',
      ...VALID_BODY,
      isPublished: true,
      createdBy: ADMIN_USER.userId,
      createdAt: new Date('2026-03-16'),
      updatedAt: new Date('2026-03-16'),
    };
    vi.mocked(prisma.learningGraph.create).mockResolvedValue(createdGraph as never);

    const req = createRequest('/api/learning-graphs', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req);

    expect(prisma.learningGraph.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdBy: ADMIN_USER.userId,
          isPublished: true,
        }),
      })
    );
  });
});
