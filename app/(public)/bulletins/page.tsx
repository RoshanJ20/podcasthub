/**
 * Public library page displaying all non-archived auditBriefs.
 *
 * Server Component that reads domain, sort, and page filters from
 * URL search params, queries the database, and renders the library
 * UI with filters, audit brief grid, and pagination controls.
 */
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { LibraryFilters } from '@/components/library/library-filters';
import { AuditBriefGrid } from '@/components/library/audit-brief-grid';
import { PaginationControls } from '@/components/library/pagination-controls';
import { DOMAINS } from '@/lib/schemas/common';
import type { AuditBriefData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Technical Content | The Audit Brief',
  description: 'Browse the full library of technical audio content.',
};

const PAGE_SIZE = 12;

interface LibraryPageProps {
  searchParams: Promise<{
    domain?: string;
    sort?: string;
    page?: string;
    q?: string;
    favorites?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const domain = params.domain;
  const sort = params.sort ?? 'newest';
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const searchQuery = params.q?.trim() ?? '';
  const showFavorites = params.favorites === 'true';

  // When favorites filter is active, get the user's favorited audit brief IDs
  let favoriteIds: string[] = [];
  if (showFavorites) {
    const headerList = await headers();
    const userId = headerList.get('x-user-id');
    if (userId) {
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        select: { auditBriefId: true },
      });
      favoriteIds = favorites.map((f) => f.auditBriefId);
    }
  }

  // When searching, find IDs of audit briefs with tags containing the query
  // substring. Prisma's `hasSome` only matches exact strings, so we use a raw
  // query with array_to_string for partial/case-insensitive tag matching.
  let tagMatchIds: string[] = [];
  if (searchQuery) {
    const tagMatches = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM audit_briefs
      WHERE NOT is_archived
        AND array_to_string(tags, ' ') ILIKE ${'%' + searchQuery + '%'}
    `;
    tagMatchIds = tagMatches.map((r) => r.id);
  }

  const where = {
    isArchived: false,
    ...(showFavorites ? { id: { in: favoriteIds } } : {}),
    ...(domain && (DOMAINS as readonly string[]).includes(domain) ? { domain } : {}),
    ...(searchQuery
      ? {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' as const } },
            { description: { contains: searchQuery, mode: 'insensitive' as const } },
            { domain: { contains: searchQuery, mode: 'insensitive' as const } },
            ...(tagMatchIds.length > 0 ? [{ id: { in: tagMatchIds } }] : []),
          ],
        }
      : {}),
  };

  const orderBy = (() => {
    switch (sort) {
      case 'oldest':
        return { createdAt: 'asc' as const };
      case 'title-az':
        return { title: 'asc' as const };
      default:
        return { createdAt: 'desc' as const };
    }
  })();

  const [auditBriefs, totalCount] = await Promise.all([
    prisma.auditBrief.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditBrief.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const auditBriefData: AuditBriefData[] = auditBriefs.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    domain: p.domain,
    year: p.year,
    tags: p.tags,
    thumbnailUrl: p.thumbnailUrl,
    audioShortUrl: p.audioShortUrl,
    audioLongUrl: p.audioLongUrl,
    bulletinUrls: p.bulletinUrls,
    sortOrder: p.sortOrder,
    isArchived: p.isArchived,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Technical Content</h1>
        <LibraryFilters />
      </div>

      <AuditBriefGrid auditBriefs={auditBriefData} />

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
