/**
 * Home page for the public-facing Podcast Hub application.
 *
 * Server Component that displays a hero section, the 4 most recently
 * added podcasts, and a "Browse by Category" grid showing domain names
 * with their respective podcast counts.
 */
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DOMAINS } from '@/lib/schemas/common';
import { PodcastGrid } from '@/components/library/podcast-grid';
import { PathCard } from '@/components/learning-path/path-card';
import { ArrowRight } from 'lucide-react';
import { CategoryGrid } from '@/components/home/category-grid';
import type { PodcastData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [recentPodcasts, domainCounts, recentPaths] = await Promise.all([
    prisma.podcast.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.podcast.groupBy({
      by: ['domain'],
      where: { isArchived: false },
      _count: { id: true },
    }),
    prisma.learningGraph.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { _count: { select: { episodes: true } } },
    }),
  ]);

  const recentPodcastData: PodcastData[] = recentPodcasts.map((p) => ({
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

  const countByDomain = new Map(
    domainCounts.map((d: { domain: string; _count: { id: number } }) => [d.domain, d._count.id])
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero section */}
      <section className="flex flex-col gap-3 pb-12 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight">Podcast Hub</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your central platform for technical audio content. Explore podcasts across audit
          methodology, accounting, technology, and more to sharpen your professional expertise.
        </p>
        <div className="mt-1">
          <Link
            href="/bulletins"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Browse Library
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* Recently Added */}
      <section className="pb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recently Added</h2>
          <Link
            href="/bulletins"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowRight className="size-3" />
          </Link>
        </div>
        <PodcastGrid podcasts={recentPodcastData} />
      </section>

      {/* Recent Learning Paths */}
      {recentPaths.length > 0 && (
        <section className="pb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Learning Paths</h2>
            <Link
              href="/learning-path"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentPaths.map((path) => (
              <PathCard
                key={path.id}
                id={path.id}
                title={path.title}
                description={path.description}
                domain={path.domain}
                episodeCount={path._count.episodes}
                completedCount={0}
              />
            ))}
          </div>
        </section>
      )}

      {/* Browse by Category */}
      <section className="pb-12">
        <h2 className="mb-6 text-lg font-semibold tracking-tight">Browse by Category</h2>
        <CategoryGrid
          domains={DOMAINS.map((domain) => ({
            name: domain,
            count: countByDomain.get(domain) ?? 0,
          }))}
        />
      </section>
    </div>
  );
}
