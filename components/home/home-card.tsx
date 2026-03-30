/**
 * Unified home page card for both audit brief and learning series content.
 *
 * Renders a polished product-style card with domain accents, concise metadata,
 * and variant-specific actions for technical bulletins and learning paths.
 */
'use client';

import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, CalendarDays, Layers3 } from 'lucide-react';
import { getDomainColor } from '@/lib/domain-colors';
import { FavoriteButton } from '@/components/ui/favorite-button';

interface HomeCardBaseProps {
  /** Unique ID used to build the detail page link. */
  id: string;
  /** Card title (bold, top). */
  title: string;
  /** Card description (muted, multi-line clamp). */
  description: string | null;
  /** Domain name for color accent and badge. */
  domain: string;
}

interface AuditBriefCardProps extends HomeCardBaseProps {
  variant: 'auditBrief';
  year: number;
  tags: string[];
  /** Whether this audit brief is favorited by the current user. */
  isFavorite?: boolean;
  /** Callback to toggle the favorite state. */
  onToggleFavorite?: () => void;
}

interface SeriesCardProps extends HomeCardBaseProps {
  variant: 'series';
  episodeCount: number;
  completedCount: number;
}

export type HomeCardProps = AuditBriefCardProps | SeriesCardProps;

/**
 * Renders a unified home page card with enterprise-ready visual hierarchy.
 *
 * @param props - Card props, discriminated by `variant`.
 * @returns A linked card element with domain accent styling and action affordance.
 */
export function HomeCard(props: HomeCardProps) {
  const { id, variant, title, description, domain } = props;
  const color = getDomainColor(domain);
  const href = variant === 'auditBrief' ? `/audit-brief/${id}` : `/learning-path/${id}`;

  return (
    <Link href={href} className="group block">
      <article className="relative overflow-hidden rounded-2xl border border-border-default bg-elevated/95 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/25 hover:shadow-card-hover dark:border-border-subtle dark:hover:border-brand-400/25">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, ${color.border}, transparent)` }}
        />

        <header className="mb-3 flex items-center justify-between gap-3">
          <span
            className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium"
            style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
          >
            {domain}
          </span>

          {variant === 'auditBrief' && props.onToggleFavorite && (
            <FavoriteButton
              isFavorite={props.isFavorite ?? false}
              onToggle={props.onToggleFavorite}
            />
          )}
        </header>

        <h3 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight text-primary-text">
          {title}
        </h3>

        {description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary-text">
            {description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-secondary-text">
          {variant === 'auditBrief' ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-1 dark:bg-surface-muted/50">
                <CalendarDays className="size-3" />
                {props.year}
              </span>
              <span>Open bulletin</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-1 dark:bg-surface-muted/50">
                <Layers3 className="size-3" />
                {props.episodeCount} episodes
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-1 dark:bg-surface-muted/50">
                <CheckCircle2 className="size-3" />
                {props.completedCount} complete
              </span>
              <span>Continue path</span>
            </>
          )}
        </div>

        <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-secondary-text transition-colors group-hover:text-primary-text">
          View details
          <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </article>
    </Link>
  );
}
