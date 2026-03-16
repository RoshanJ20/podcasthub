/**
 * Public library page displaying all non-archived podcasts.
 *
 * Server Component that reads domain, sort, and page filters from
 * URL search params, queries the database, and renders the library
 * UI with filters, podcast grid, and pagination controls.
 */
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { LibraryFilters } from '@/components/library/library-filters';
import { PodcastGrid } from '@/components/library/podcast-grid';
import { PaginationControls } from '@/components/library/pagination-controls';
import { DOMAINS } from '@/lib/schemas/common';
import type { PodcastData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Technical Content | Podcast Hub',
  description: 'Browse the full library of technical audio content.',
};

const PAGE_SIZE = 12;

interface LibraryPageProps {
  searchParams: Promise<{
    domain?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const domain = params.domain;
  const sort = params.sort ?? 'newest';
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const where = {
    isArchived: false,
    ...(domain && (DOMAINS as readonly string[]).includes(domain) ? { domain } : {}),
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

  const [podcasts, totalCount] = await Promise.all([
    prisma.podcast.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.podcast.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const podcastData: PodcastData[] = podcasts.map((p) => ({
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

      <PodcastGrid podcasts={podcastData} />

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
