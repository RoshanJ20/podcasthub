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
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { ApiError, createErrorResponse, internalError } from '@/lib/api/errors';

/**
 * Builds a Prisma `createdAt` date range filter from optional `from` and `to` strings.
 *
 * @param from - ISO date string for the start of the range (inclusive), or null
 * @param to - ISO date string for the end of the range (inclusive), or null
 * @returns An object containing a `createdAt` filter suitable for Prisma `where`
 *          clauses, or an empty object when neither bound is provided
 */
function buildDateFilter(from: string | null, to: string | null): Record<string, unknown> {
  if (!from && !to) return {};
  const createdAt: Record<string, Date> = {};
  if (from) createdAt.gte = new Date(from);
  if (to) createdAt.lte = new Date(to);
  return { createdAt };
}

/**
 * Aggregates a list of audit-brief-bearing activities into per-domain listen counts.
 *
 * @param activities - Array of activity objects, each containing an optional
 *                     `auditBrief` relation with a `domain` field
 * @returns An array of `{ domain, count }` objects sorted by insertion order
 */
function aggregateDomainCounts(
  activities: Array<{ auditBrief: { domain: string } | null }>
): Array<{ domain: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const activity of activities) {
    const domain = activity.auditBrief?.domain ?? 'Unknown';
    counts[domain] = (counts[domain] ?? 0) + 1;
  }
  return Object.entries(counts).map(([domain, count]) => ({ domain, count }));
}

/**
 * Aggregates activities by calendar month (YYYY-MM) and returns them
 * in chronological order.
 *
 * @param activities - Array of activity objects with a `createdAt` timestamp
 * @returns An array of `{ month, count }` objects sorted chronologically
 */
function aggregateMonthlyTrends(
  activities: Array<{ createdAt: Date }>
): Array<{ month: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const activity of activities) {
    const date = new Date(activity.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    counts[month] = (counts[month] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Resolves top audit brief IDs from grouped activity counts into labelled
 * `{ topic, count }` entries by fetching audit brief titles from the database.
 *
 * @param groupedTopics - Grouped activity rows with `auditBriefId` and `_count.id`
 * @returns An array of `{ topic, count }` objects with human-readable titles
 */
async function resolveTopTopics(
  groupedTopics: Array<{ auditBriefId: string | null; _count: { id: number } }>
): Promise<Array<{ topic: string; count: number }>> {
  const auditBriefIds = groupedTopics
    .filter((t) => t.auditBriefId !== null)
    .map((t) => t.auditBriefId as string);

  const auditBriefs =
    auditBriefIds.length > 0
      ? await prisma.auditBrief.findMany({
          where: { id: { in: auditBriefIds } },
          select: { id: true, title: true },
        })
      : [];

  const titleMap = new Map(auditBriefs.map((p) => [p.id, p.title]));
  return groupedTopics.map((t) => ({
    topic: titleMap.get(t.auditBriefId as string) ?? 'Unknown',
    count: t._count.id,
  }));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    requireRole(user, ['admin', 'superadmin']);

    const url = new URL(request.url);
    const dateFilter = buildDateFilter(url.searchParams.get('from'), url.searchParams.get('to'));
    const activityDateFilter = { activityType: 'listen' as const, ...dateFilter };

    const [
      totalAuditBriefs,
      totalPaths,
      totalListens,
      uniqueListeners,
      listenActivities,
      monthlyActivities,
      topTopics,
    ] = await Promise.all([
      prisma.auditBrief.count({ where: { isArchived: false, ...dateFilter } }),
      prisma.learningGraph.count({ where: { isPublished: true, ...dateFilter } }),
      prisma.userActivity.count({ where: activityDateFilter }),
      prisma.userActivity
        .groupBy({ by: ['userId'], where: activityDateFilter })
        .then((groups) => groups.length),
      prisma.userActivity.findMany({
        where: activityDateFilter,
        select: { auditBrief: { select: { domain: true } } },
      }),
      prisma.userActivity.findMany({
        where: activityDateFilter,
        select: { createdAt: true },
      }),
      prisma.userActivity.groupBy({
        by: ['auditBriefId'],
        where: { ...activityDateFilter, auditBriefId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const [listensByDomain, monthlyTrends, topTopicsFormatted] = await Promise.all([
      Promise.resolve(aggregateDomainCounts(listenActivities)),
      Promise.resolve(aggregateMonthlyTrends(monthlyActivities)),
      resolveTopTopics(topTopics),
    ]);

    return NextResponse.json({
      totalAuditBriefs,
      totalPaths,
      totalListens,
      uniqueListeners,
      listensByDomain,
      monthlyTrends,
      topTopics: topTopicsFormatted,
    });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    return createErrorResponse(internalError(), requestId);
  }
}
