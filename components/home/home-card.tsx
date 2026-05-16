/**
 * Unified home page card for both audit brief and learning series content.
 *
 * Vertical-stacked layout: 4px domain-color top band, then text content.
 * Receives a subtle domain-tinted hover wash via `.card-domain-tint` utility,
 * which reads `--domain-color` from the card root.
 *
 * Dependencies:
 * - next/link for navigation
 * - lib/domain-colors for accent colors (border hex used as --domain-color)
 */
'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { getDomainColor } from '@/lib/domain-colors';
import { FavoriteButton } from '@/components/ui/favorite-button';

interface HomeCardBaseProps {
  /** Unique ID used to build the detail page link. */
  id: string;
  /** Card title (bold, top). */
  title: string;
  /** Card description (muted, 1-line clamp). */
  description: string | null;
  /** Domain name for color accent and badge. */
  domain: string;
}

interface AuditBriefCardProps extends HomeCardBaseProps {
  variant: 'auditBrief';
  year: number;
  /** Whether this audit brief is favorited by the current user. */
  isFavorite?: boolean;
  /** Callback to toggle the favorite state. */
  onToggleFavorite?: () => void;
}

interface SeriesCardProps extends HomeCardBaseProps {
  variant: 'series';
  episodeCount: number;
}

export type HomeCardProps = AuditBriefCardProps | SeriesCardProps;

/**
 * Renders a unified home page card with a 4px domain-color top band.
 *
 * On hover the card receives a subtle domain-tinted wash and an elevated shadow.
 *
 * @param props - Card props, discriminated by `variant`.
 * @returns A linked card element with domain accent styling.
 */
export function HomeCard(props: HomeCardProps) {
  const { id, variant, title, description, domain } = props;
  const color = getDomainColor(domain);
  const cssVars = { '--domain-color': color.border } as CSSProperties;
  const href = variant === 'auditBrief' ? `/audit-brief/${id}` : `/learning-path/${id}`;
  const metadata = variant === 'auditBrief' ? `${props.year}` : `${props.episodeCount} episodes`;

  return (
    <Link href={href} className="group block" style={cssVars}>
      <div className="card-domain-tint flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-card shadow-card transition-shadow duration-200 hover:shadow-card-hover">
        {/* 4px domain-color top band */}
        <div className="domain-band h-1 w-full shrink-0" />

        <div className="flex flex-1 flex-col p-4">
          {/* Top row: domain dot + label + metadata + favorite */}
          <div className="mb-2 flex items-center gap-2">
            <span className="domain-dot size-2 shrink-0 rounded-full" />
            <span className="truncate text-xs font-medium text-muted-foreground">{domain}</span>
            <span className="shrink-0 text-xs text-muted-foreground/70">· {metadata}</span>
            {variant === 'auditBrief' && props.onToggleFavorite && (
              <span className="ml-auto">
                <FavoriteButton
                  isFavorite={props.isFavorite ?? false}
                  onToggle={props.onToggleFavorite}
                />
              </span>
            )}
          </div>

          {/* Title */}
          <p className="line-clamp-2 text-[15px] font-medium leading-snug">{title}</p>

          {/* Description */}
          {description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
