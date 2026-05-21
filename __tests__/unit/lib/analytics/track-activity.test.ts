/**
 * Unit tests for the trackActivity helper.
 *
 * Behaviour under test:
 * - Persists a UserActivity row via prisma with the supplied input.
 * - Defaults nullable foreign keys to null and metadata to {}.
 * - Never throws when prisma rejects — logs a warn-level entry instead.
 * - ACTIVITY_TYPES exposes the full readonly enum for server-side and Zod use.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    userActivity: {
      create: vi.fn(),
    },
  },
}));

const { warnSpy } = vi.hoisted(() => ({ warnSpy: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: warnSpy,
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { prisma } from '@/lib/db';
import { trackActivity, ACTIVITY_TYPES } from '@/lib/analytics/track-activity';

describe('trackActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy.mockClear();
  });

  it('persists a UserActivity row with defaulted nulls and empty metadata', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    await trackActivity({ userId: 'user-1', activityType: 'listen' });

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        activityType: 'listen',
        auditBriefId: null,
        episodeId: null,
        graphId: null,
        metadata: {},
      },
    });
  });

  it('passes provided metadata through verbatim', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const metadata = { positionSeconds: 42.5, playbackRate: 1.5 };
    await trackActivity({
      userId: 'user-2',
      activityType: 'listen',
      auditBriefId: 'brief-1',
      metadata,
    });

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-2',
        activityType: 'listen',
        auditBriefId: 'brief-1',
        metadata,
      }),
    });
  });

  it('forwards all three foreign keys when provided', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    await trackActivity({
      userId: 'user-3',
      activityType: 'complete_episode',
      auditBriefId: 'brief-9',
      episodeId: 'ep-9',
      graphId: 'graph-9',
    });

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        auditBriefId: 'brief-9',
        episodeId: 'ep-9',
        graphId: 'graph-9',
      }),
    });
  });

  it('does not throw when prisma rejects, and logs a warning', async () => {
    const error = new Error('db connection lost');
    vi.mocked(prisma.userActivity.create).mockRejectedValue(error);

    await expect(
      trackActivity({ userId: 'user-4', activityType: 'search' })
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error,
        activityType: 'search',
        userId: 'user-4',
      }),
      expect.stringContaining('Failed to write UserActivity')
    );
  });

  it.each([
    new Error('generic'),
    Object.assign(new Error('p2002'), { code: 'P2002' }),
    new TypeError('bad input'),
  ])('swallows %s without rethrowing', async (error) => {
    vi.mocked(prisma.userActivity.create).mockRejectedValue(error);

    await expect(
      trackActivity({ userId: 'user-5', activityType: 'listen' })
    ).resolves.toBeUndefined();
  });

  it('exposes the full activity type allowlist', () => {
    expect(ACTIVITY_TYPES).toEqual(
      expect.arrayContaining([
        'listen',
        'bookmark',
        'unbookmark',
        'complete_episode',
        'view_audit_brief',
        'view_path',
        'search',
        'favorite',
        'unfavorite',
        'signin',
        'signout',
        'signin_failed',
      ])
    );
    expect(ACTIVITY_TYPES).toHaveLength(12);
  });
});
