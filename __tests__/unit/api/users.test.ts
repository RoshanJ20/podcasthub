/**
 * Unit tests for user management API routes.
 *
 * Tests cover:
 * - GET /api/users — list users (superadmin only)
 * - PUT /api/users/[id]/role — update user role (superadmin only)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '@/lib/api/errors';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    userRole: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/api-helpers', () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  getAuthUser: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

// ─── GET /api/users ─────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/users/route');
    GET = mod.GET;
  });

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/users');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-superadmin', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest('/api/users');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns user list for superadmin', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'super-1',
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'user-1',
        displayName: 'Test User',
        email: 'user@test.com',
        createdAt: new Date('2026-01-01'),
        role: { role: 'public' },
      },
    ] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    const req = createRequest('/api/users');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toHaveProperty('role', 'public');
    expect(body.data[0]).toHaveProperty('email', 'user@test.com');
    // Should NOT include passwordHash
    expect(body.data[0]).not.toHaveProperty('passwordHash');
  });

  it('supports search filter', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'super-1',
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    const req = createRequest('/api/users?search=test');
    await GET(req);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              email: { contains: 'test', mode: 'insensitive' },
            }),
          ]),
        }),
      })
    );
  });
});

// ─── PUT /api/users/[id]/role ───────────────────────────────────────────────

describe('PUT /api/users/[id]/role', () => {
  let PUT: (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/users/[id]/role/route');
    PUT = mod.PUT;
  });

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/users/user-1/role', {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'user-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-superadmin', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest('/api/users/user-1/role', {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'user-1' }) });
    expect(res.status).toBe(403);
  });

  it('updates user role successfully', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'super-1',
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      displayName: 'Test User',
      email: 'user@test.com',
    } as never);
    vi.mocked(prisma.userRole.upsert).mockResolvedValue({
      id: 'role-1',
      userId: 'user-1',
      role: 'admin',
    } as never);

    const req = createRequest('/api/users/user-1/role', {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'user-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role).toBe('admin');
  });

  it('returns 400 for invalid role', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'super-1',
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const req = createRequest('/api/users/user-1/role', {
      method: 'PUT',
      body: JSON.stringify({ role: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'user-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent user', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'super-1',
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = createRequest('/api/users/nonexistent/role', {
      method: 'PUT',
      body: JSON.stringify({ role: 'admin' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  it('prevents changing own role', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'super-1',
      email: 'super@test.com',
      role: 'superadmin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const req = createRequest('/api/users/super-1/role', {
      method: 'PUT',
      body: JSON.stringify({ role: 'public' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req, {
      params: Promise.resolve({ id: 'super-1' }),
    });
    expect(res.status).toBe(400);
  });
});
