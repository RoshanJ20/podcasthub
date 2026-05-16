/**
 * Home page for the public-facing The Audit Brief application.
 *
 * Server Component. Editorial-style layout: left-aligned masthead with
 * volume/month, a domain-tinted featured-brief hero, a row of domain
 * shortcuts, then "This week" and "Continue your series" rails populated
 * from the existing recent-content queries.
 */
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { HomeCard } from '@/components/home/home-card';
import { HomeCardGrid } from '@/components/home/home-card-grid';
import { HomeAuditBriefList } from '@/components/home/home-audit-brief-list';
import { getDomainColor } from '@/lib/domain-colors';
import { ArrowRight, Headphones } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** Podcast domains surfaced as one-click filter shortcuts on the home page. */
const PODCAST_DOMAINS = [
  'Audit Methodology',
  'Accounting and Reporting',
  'Audit Technology',
  'Quality and Risk',
  'LEAP',
] as const;

export default async function HomePage() {
  const [recentAuditBriefs, recentPaths] = await Promise.all([
    prisma.auditBrief.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, title: true, description: true, domain: true, year: true, tags: true },
    }),
    prisma.learningGraph.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { _count: { select: { episodes: true } } },
    }),
  ]);

  const featured = recentAuditBriefs[0];
  const restBriefs = recentAuditBriefs.slice(1);
  const featuredColor = featured ? getDomainColor(featured.domain) : null;
  const featuredVars = featuredColor
    ? ({ '--domain-color': featuredColor.border } as CSSProperties)
    : undefined;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString('en-US', { month: 'long' });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* ─── Masthead ───────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4 border-b border-border-subtle pb-6 pt-10 sm:pt-14">
        <div>
          <p className="label-eyebrow">
            The <span className="text-brand-500">·</span>
          </p>
          <h1 className="text-mast mt-1 text-foreground">Audit Brief</h1>
        </div>
        <p className="label-eyebrow mb-1 hidden sm:block">
          Vol. {year} <span className="text-brand-500">·</span> {month}
        </p>
      </header>

      {/* ─── Featured brief ─────────────────────────────────────────── */}
      {featured && (
        <section className="mt-8" aria-label="This week's brief">
          <Link href={`/audit-brief/${featured.id}`} className="group block" style={featuredVars}>
            <article className="gradient-domain relative overflow-hidden rounded-2xl border border-border-subtle p-6 transition-shadow duration-200 hover:shadow-card-hover sm:p-10">
              <div className="flex flex-col gap-6 sm:max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="label-eyebrow">This week&rsquo;s brief</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="domain-dot size-2 shrink-0 rounded-full" />
                  <span className="text-xs font-medium text-foreground/80">{featured.domain}</span>
                  <span className="text-xs text-muted-foreground">· {featured.year}</span>
                </div>
                <h2 className="text-display-lg text-foreground sm:text-[clamp(24px,3.5vw,36px)]">
                  {featured.title}
                </h2>
                {featured.description && (
                  <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {featured.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3">
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

      {/* ─── Domain shortcuts ───────────────────────────────────────── */}
      <section className="mt-10" aria-label="Browse by domain">
        <p className="label-eyebrow mb-3">Browse by domain</p>
        <div className="flex flex-wrap gap-2">
          {PODCAST_DOMAINS.map((domain) => {
            const color = getDomainColor(domain);
            const chipVars = { '--domain-color': color.border } as CSSProperties;
            return (
              <Link
                key={domain}
                href={`/bulletins?domain=${encodeURIComponent(domain)}`}
                className="group inline-flex items-center gap-2 rounded-full border border-border-subtle bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-border-default hover:bg-subtle hover:text-foreground"
                style={chipVars}
              >
                <span className="domain-dot size-1.5 rounded-full" />
                {domain}
              </Link>
            );
          })}
          <Link
            href="/bulletins"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            All briefs
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </section>

      {/* ─── This week rail ─────────────────────────────────────────── */}
      {restBriefs.length > 0 && (
        <section className="mt-12 border-t border-border-subtle pt-8">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-display-lg text-foreground">This week</h2>
            <Link
              href="/bulletins"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              All briefs
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <HomeAuditBriefList auditBriefs={restBriefs} />
        </section>
      )}

      {/* ─── Continue your series rail ──────────────────────────────── */}
      <section className="mt-12 border-t border-border-subtle pb-16 pt-8">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-display-lg text-foreground">Learning series</h2>
          <Link
            href="/learning-path"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            All series
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
              />
            ))}
          </HomeCardGrid>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            Learning series are being curated. Check the brief library while we publish the first
            paths.
          </p>
        )}
      </section>
    </div>
  );
}
