/**
 * Unit tests for GET /api/admin/analytics.
 *
 * Tests cover:
 * - 401 for unauthenticated users
 * - 403 for non-admin users
 * - Correct analytics shape for admin
 * - Date range filtering
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError, ErrorCode } from '@/lib/api/errors';

vi.mock('@/lib/db', () => ({
  prisma: {
    auditBrief: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    learningGraph: {
      count: vi.fn(),
    },
    userActivity: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
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

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/admin/analytics', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/admin/analytics/route');
    GET = mod.GET;
  });

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(requireAuth).mockImplementation(() => {
      throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    });

    const req = createRequest('/api/admin/analytics');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'user-1',
      email: 'user@test.com',
      role: 'public',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    });

    const req = createRequest('/api/admin/analytics');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns analytics summary with correct shape for admin', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    vi.mocked(prisma.auditBrief.count).mockResolvedValue(10);
    vi.mocked(prisma.learningGraph.count).mockResolvedValue(3);
    vi.mocked(prisma.userActivity.count).mockResolvedValue(3);
    vi.mocked(prisma.userActivity.findMany).mockResolvedValue([
      { auditBrief: { domain: 'Auditing' }, createdAt: new Date('2026-01-15') },
      { auditBrief: { domain: 'Auditing' }, createdAt: new Date('2026-01-20') },
      { auditBrief: { domain: 'LEAP' }, createdAt: new Date('2026-02-10') },
    ] as never);
    vi.mocked(prisma.userActivity.groupBy).mockResolvedValue([
      { auditBriefId: 'pod-1', _count: { id: 5 } },
      { auditBriefId: 'pod-2', _count: { id: 3 } },
    ] as never);
    vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([
      { id: 'pod-1', title: 'Audit Basics' },
      { id: 'pod-2', title: 'LEAP Overview' },
    ] as never);

    const req = createRequest('/api/admin/analytics');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('totalAuditBriefs', 10);
    expect(body).toHaveProperty('totalPaths', 3);
    expect(body).toHaveProperty('listensByDomain');
    expect(body).toHaveProperty('monthlyTrends');
    expect(body).toHaveProperty('topTopics');
    expect(Array.isArray(body.listensByDomain)).toBe(true);
    expect(Array.isArray(body.monthlyTrends)).toBe(true);
    expect(Array.isArray(body.topTopics)).toBe(true);
  });

  it('passes date range filtering params', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    vi.mocked(prisma.auditBrief.count).mockResolvedValue(5);
    vi.mocked(prisma.learningGraph.count).mockResolvedValue(1);
    vi.mocked(prisma.userActivity.count).mockResolvedValue(1);
    vi.mocked(prisma.userActivity.findMany).mockResolvedValue([
      { auditBrief: { domain: 'Auditing' }, createdAt: new Date('2026-01-15') },
    ] as never);
    vi.mocked(prisma.userActivity.groupBy).mockResolvedValue([] as never);

    const req = createRequest('/api/admin/analytics?from=2026-01-01&to=2026-01-31');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalAuditBriefs).toBe(5);

    // Verify date filter was passed to auditBrief.count
    expect(prisma.auditBrief.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('returns correct aggregation values for listensByDomain', async () => {
    vi.mocked(requireAuth).mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    vi.mocked(prisma.auditBrief.count).mockResolvedValue(0);
    vi.mocked(prisma.learningGraph.count).mockResolvedValue(0);
    vi.mocked(prisma.userActivity.count).mockResolvedValue(3);

    // First findMany call returns listen activities, second returns monthly trends
    // Since both calls use the same mock, we use mockResolvedValue
    const activities = [
      { auditBrief: { domain: 'Auditing' }, createdAt: new Date('2026-01-15') },
      { auditBrief: { domain: 'Auditing' }, createdAt: new Date('2026-01-20') },
      { auditBrief: { domain: 'LEAP' }, createdAt: new Date('2026-02-10') },
    ];
    vi.mocked(prisma.userActivity.findMany).mockResolvedValue(activities as never);
    vi.mocked(prisma.userActivity.groupBy).mockResolvedValue([] as never);

    const req = createRequest('/api/admin/analytics');
    const res = await GET(req);
    const body = await res.json();

    // listensByDomain should have aggregated counts
    const auditing = body.listensByDomain.find((d: { domain: string }) => d.domain === 'Auditing');
    const leap = body.listensByDomain.find((d: { domain: string }) => d.domain === 'LEAP');
    expect(auditing?.count).toBe(2);
    expect(leap?.count).toBe(1);
  });
});
