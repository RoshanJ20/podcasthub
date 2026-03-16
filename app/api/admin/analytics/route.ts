/**
 * Admin analytics API route.
 *
 * @route GET /api/admin/analytics — Returns analytics summary (admin/superadmin only)
 *
 * Supports optional date range filtering via `from` and `to` query params.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import { ApiError, createErrorResponse, internalError } from '@/lib/api/errors';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // Build date filter for createdAt
    const dateFilter: Record<string, unknown> = {};
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      dateFilter.createdAt = createdAt;
    }

    // Build activity date filter
    const activityDateFilter: Record<string, unknown> = {
      activityType: 'listen',
    };
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      activityDateFilter.createdAt = createdAt;
    }

    const [totalPodcasts, totalPaths, listenActivities, monthlyTrends, topTopics] =
      await Promise.all([
        // Total non-archived podcasts
        prisma.podcast.count({
          where: { isArchived: false, ...dateFilter },
        }),

        // Total published learning graphs
        prisma.learningGraph.count({
          where: { isPublished: true, ...dateFilter },
        }),

        // Listens by domain: group UserActivity (listen) by podcast domain
        prisma.userActivity.findMany({
          where: activityDateFilter,
          select: {
            podcast: {
              select: { domain: true },
            },
          },
        }),

        // Monthly trends: group UserActivity by month
        prisma.userActivity.findMany({
          where: activityDateFilter,
          select: {
            createdAt: true,
          },
        }),

        // Top topics: podcasts with most listen activity
        prisma.userActivity.groupBy({
          by: ['podcastId'],
          where: {
            ...activityDateFilter,
            podcastId: { not: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

    // Aggregate listens by domain
    const domainCounts: Record<string, number> = {};
    for (const activity of listenActivities) {
      const domain = activity.podcast?.domain ?? 'Unknown';
      domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
    }
    const listensByDomain = Object.entries(domainCounts).map(([domain, count]) => ({
      domain,
      count,
    }));

    // Aggregate monthly trends
    const monthCounts: Record<string, number> = {};
    for (const activity of monthlyTrends) {
      const date = new Date(activity.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[month] = (monthCounts[month] ?? 0) + 1;
    }
    const monthlyTrendsFormatted = Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Resolve top topics with podcast titles
    const topPodcastIds = topTopics
      .filter((t) => t.podcastId !== null)
      .map((t) => t.podcastId as string);
    const topPodcasts =
      topPodcastIds.length > 0
        ? await prisma.podcast.findMany({
            where: { id: { in: topPodcastIds } },
            select: { id: true, title: true },
          })
        : [];
    const podcastTitleMap = new Map(topPodcasts.map((p) => [p.id, p.title]));
    const topTopicsFormatted = topTopics.map((t) => ({
      topic: podcastTitleMap.get(t.podcastId as string) ?? 'Unknown',
      count: t._count.id,
    }));

    return NextResponse.json({
      totalPodcasts,
      totalPaths,
      listensByDomain,
      monthlyTrends: monthlyTrendsFormatted,
      topTopics: topTopicsFormatted,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
