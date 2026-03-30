/**
 * Home page for the public-facing The Audit Brief application.
 *
 * Server Component that presents a modern product-style dashboard landing with
 * quick stats, action shortcuts, and latest content across bulletins and paths.
 */
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { HomeCard } from '@/components/home/home-card';
import { HomeCardGrid } from '@/components/home/home-card-grid';
import { HomeAuditBriefList } from '@/components/home/home-audit-brief-list';
import { ArrowRight, BookOpen, Headphones, Sparkles, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [recentAuditBriefs, recentPaths, totalAuditBriefs, totalPaths] = await Promise.all([
    prisma.auditBrief.findMany({
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
    prisma.auditBrief.count({ where: { isArchived: false } }),
    prisma.learningGraph.count({ where: { isPublished: true } }),
  ]);

  return (
    <div className="space-y-10 pb-12 pt-6">
      <section className="overflow-hidden rounded-3xl border border-border-default bg-gradient-to-br from-elevated via-elevated to-subtle p-6 shadow-card dark:border-border-subtle sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full border border-border-default bg-canvas/80 px-3 py-1 text-xs font-medium text-secondary-text dark:border-border-subtle dark:bg-subtle/80">
              <Sparkles className="size-3.5 text-link dark:text-brand-400" />
              Enterprise learning workspace
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary-text sm:text-4xl">
              Audit intelligence, redesigned for action.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary-text sm:text-base">
              Find technical bulletins faster, follow structured learning paths, and move from
              discovery to application in one secure platform.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/bulletins" className="inline-flex items-center gap-1.5 rounded-lg bg-interactive px-4 py-2 text-sm font-medium text-on-brand shadow-sm transition-colors hover:bg-interactive-hover press-scale">
                Explore bulletins
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/learning-path"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-canvas px-4 py-2 text-sm font-medium text-primary-text transition-colors hover:bg-subtle dark:border-border-subtle dark:bg-elevated"
              >
                Open learning paths
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-border-subtle bg-canvas/85 p-4 dark:bg-subtle/50">
              <p className="text-xs text-secondary-text">Technical bulletins</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums text-primary-text">
                <Headphones className="size-5 text-link dark:text-brand-400" />
                {totalAuditBriefs}
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-canvas/85 p-4 dark:bg-subtle/50">
              <p className="text-xs text-secondary-text">Published learning paths</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums text-primary-text">
                <BookOpen className="size-5 text-link dark:text-brand-400" />
                {totalPaths}
              </p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-canvas/85 p-4 dark:bg-subtle/50 sm:col-span-2 lg:col-span-1">
              <p className="flex items-center gap-2 text-sm font-medium text-primary-text">
                <ShieldCheck className="size-4 text-link dark:text-brand-400" />
                Curated, role-relevant content
              </p>
              <p className="mt-1 text-xs text-secondary-text">
                Designed for audit professionals navigating accounting, methodology, and technology
                updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-primary-text">Latest bulletins</h2>
              <p className="text-sm text-secondary-text">Newly added technical content.</p>
            </div>
            <Link href="/bulletins" className="inline-flex items-center gap-1 text-sm font-medium text-tertiary transition-colors hover:text-primary-text">
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <HomeAuditBriefList auditBriefs={recentAuditBriefs} />
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-primary-text">Latest learning paths</h2>
              <p className="text-sm text-secondary-text">Structured journeys to build mastery.</p>
            </div>
            <Link href="/learning-path" className="inline-flex items-center gap-1 text-sm font-medium text-tertiary transition-colors hover:text-primary-text">
              View all
              <ArrowRight className="size-3.5" />
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
            <p className="rounded-xl border border-dashed border-border-default py-8 text-center text-sm text-secondary-text dark:border-border-subtle">
              No learning series available yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
