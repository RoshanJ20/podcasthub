/**
 * Home page for the public-facing Podcast Hub application.
 *
 * Server Component that displays a center-aligned hero section with
 * stats, a 2-column grid of recently added technical content and
 * learning series using unified HomeCard components with staggered
 * entrance animation.
 */
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { HomeCard } from '@/components/home/home-card';
import { HomeCardGrid } from '@/components/home/home-card-grid';
import { ArrowRight, Headphones, BookOpen, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [recentPodcasts, recentPaths, totalPodcasts, totalPaths] = await Promise.all([
    prisma.podcast.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, description: true, domain: true, year: true, tags: true },
    }),
    prisma.learningGraph.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { _count: { select: { episodes: true } } },
    }),
    prisma.podcast.count({ where: { isArchived: false } }),
    prisma.learningGraph.count({ where: { isPublished: true } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Hero section — center aligned with stats */}
      <section className="flex flex-col items-center gap-4 pb-14 pt-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/30 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <TrendingUp className="size-3.5" />
          Your professional development platform
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Podcast Hub</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Explore technical audio content across audit methodology, accounting, technology, and more
          — curated to sharpen your professional expertise.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            href="/bulletins"
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border border-orange-400 bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Browse technical content
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-10 group-hover:opacity-0" />
            <ArrowRight className="absolute right-4 size-3.5 -translate-x-10 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </Link>
          <Link
            href="/learning-path"
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border border-orange-400 bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Browse learning series
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-10 group-hover:opacity-0" />
            <ArrowRight className="absolute right-4 size-3.5 -translate-x-10 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </Link>
        </div>
        {/* Quick stats */}
        <div className="mt-4 flex items-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Headphones className="size-4" />
            <span>
              <strong className="text-foreground">{totalPodcasts}</strong> podcasts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="size-4" />
            <span>
              <strong className="text-foreground">{totalPaths}</strong> learning series
            </span>
          </div>
        </div>
      </section>

      {/* Two-column grid: Recent Technical Content + Recent Learning Series */}
      <div className="grid grid-cols-1 gap-10 pb-12 lg:grid-cols-2">
        {/* Recently Added Technical Content */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent Technical Content</h2>
            <Link
              href="/bulletins"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {recentPodcasts.length > 0 ? (
            <HomeCardGrid>
              {recentPodcasts.map((p) => (
                <HomeCard
                  key={p.id}
                  variant="podcast"
                  id={p.id}
                  title={p.title}
                  description={p.description}
                  domain={p.domain}
                  year={p.year}
                  tags={p.tags}
                />
              ))}
            </HomeCardGrid>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No technical content yet.
            </p>
          )}
        </section>

        {/* Recent Learning Series */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent Learning Series</h2>
            <Link
              href="/learning-path"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {recentPaths.length > 0 ? (
            <HomeCardGrid>
              {recentPaths.map((path) => (
                <HomeCard
                  key={path.id}
                  variant="series"
                  id={path.id}
                  title={path.title}
                  description={path.description}
                  domain={path.domain ?? ''}
                  episodeCount={path._count.episodes}
                  completedCount={0}
                />
              ))}
            </HomeCardGrid>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No learning series available yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
