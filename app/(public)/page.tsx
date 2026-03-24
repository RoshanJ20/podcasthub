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
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-secondary p-6 shadow-[0_12px_45px_-30px_oklch(45.6%_0.311_264.1/.65)] sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Enterprise learning workspace
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Audit intelligence, redesigned for action.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Find technical bulletins faster, follow structured learning paths, and move from
              discovery to application in one secure platform.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/bulletins" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Explore bulletins
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/learning-path"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Open learning paths
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
              <p className="text-xs text-muted-foreground">Technical bulletins</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
                <Headphones className="size-5 text-primary" />
                {totalAuditBriefs}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
              <p className="text-xs text-muted-foreground">Published learning paths</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums">
                <BookOpen className="size-5 text-primary" />
                {totalPaths}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/85 p-4 sm:col-span-2 lg:col-span-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4 text-primary" />
                Curated, role-relevant content
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
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
              <h2 className="text-lg font-semibold tracking-tight">Latest bulletins</h2>
              <p className="text-sm text-muted-foreground">Newly added technical content.</p>
            </div>
            <Link href="/bulletins" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <HomeAuditBriefList auditBriefs={recentAuditBriefs} />
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Latest learning paths</h2>
              <p className="text-sm text-muted-foreground">Structured journeys to build mastery.</p>
            </div>
            <Link href="/learning-path" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
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
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No learning series available yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
