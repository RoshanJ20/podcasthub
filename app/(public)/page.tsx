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
import { Library, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryGrid } from '@/components/home/category-grid';
import type { PodcastData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [recentPodcasts, domainCounts] = await Promise.all([
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
      <section className="flex flex-col items-center gap-4 pb-16 pt-12 text-center">
        <Library className="size-12 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Podcast Hub</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Your central platform for technical audio content. Explore podcasts across audit
          methodology, accounting, technology, and more to sharpen your professional expertise.
        </p>
        <Button render={<Link href="/bulletins" />} size="lg" className="mt-2">
          Browse Library
          <ArrowRight className="size-4" />
        </Button>
      </section>

      {/* Recently Added */}
      <section className="pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Recently Added</h2>
          <Link
            href="/bulletins"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="size-3" />
          </Link>
        </div>
        <PodcastGrid podcasts={recentPodcastData} />
      </section>

      {/* Browse by Category */}
      <section className="pb-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Browse by Category</h2>
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
