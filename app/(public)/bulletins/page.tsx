/**
 * Public library page displaying all non-archived auditBriefs.
 *
 * Server Component that reads domain, sort, and page filters from
 * URL search params, queries the database, and renders the library
 * UI with an editorial masthead, an optional featured-brief hero on
 * page 1 (when no filters are active), the audit-brief grid, and
 * pagination controls.
 */
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Headphones, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth/session-helpers';
import { LibraryFilters } from '@/components/library/library-filters';
import { AuditBriefGrid } from '@/components/library/audit-brief-grid';
import { PaginationControls } from '@/components/library/pagination-controls';
import { DOMAINS } from '@/lib/schemas/common';
import { getDomainColor } from '@/lib/domain-colors';
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
    const session = await getAuthSession();
    const userId = session?.user?.id;
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

  /** Promote the first card to a featured hero on page 1 with no filters. */
  const showFeatured =
    page === 1 && !domain && !searchQuery && !showFavorites && auditBriefData.length > 0;
  const featured = showFeatured ? auditBriefData[0] : null;
  const gridBriefs = showFeatured ? auditBriefData.slice(1) : auditBriefData;

  const featuredColor = featured ? getDomainColor(featured.domain) : null;
  const featuredVars = featuredColor
    ? ({ '--domain-color': featuredColor.border } as CSSProperties)
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* ─── Masthead ───────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4 border-b border-border-subtle pb-6 pt-10 sm:pt-14">
        <div>
          <p className="label-eyebrow">
            The <span className="text-brand-500">·</span>
          </p>
          <h1 className="text-mast mt-1 text-foreground">Library</h1>
        </div>
        <p className="label-eyebrow mb-1 hidden sm:block">
          {totalCount} <span className="text-brand-500">·</span>{' '}
          {totalCount === 1 ? 'Brief' : 'Briefs'}
        </p>
      </header>

      {/* ─── Featured hero (page 1, no filters) ─────────────────────── */}
      {featured && (
        <section className="mt-8" aria-label="Latest brief">
          <Link href={`/audit-brief/${featured.id}`} className="group block" style={featuredVars}>
            <article className="gradient-domain relative overflow-hidden rounded-2xl border border-border-subtle p-6 transition-shadow duration-200 hover:shadow-card-hover sm:p-10">
              <div className="flex flex-col gap-5 sm:max-w-3xl">
                <span className="label-eyebrow">Latest brief</span>
                <div className="flex items-center gap-2">
                  <span className="domain-dot size-2 shrink-0 rounded-full" />
                  <span className="text-xs font-medium text-foreground/80">{featured.domain}</span>
                  <span className="text-xs text-muted-foreground">· {featured.year}</span>
                </div>
                <h2 className="text-display-lg text-foreground sm:text-[clamp(22px,3vw,32px)]">
                  {featured.title}
                </h2>
                {featured.description && (
                  <p className="line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {featured.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-interactive px-4 py-2 text-sm font-medium text-on-brand shadow-sm transition-colors group-hover:bg-interactive-hover">
                    <Headphones className="size-4" />
                    Listen now
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    Read brief
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </article>
          </Link>
        </section>
      )}

      {/* ─── Filter bar ─────────────────────────────────────────────── */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-y border-border-subtle py-4">
        <LibraryFilters />
      </div>

      {/* ─── Grid ───────────────────────────────────────────────────── */}
      <div className="mt-6">
        <AuditBriefGrid auditBriefs={gridBriefs} />
      </div>

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
