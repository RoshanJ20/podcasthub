/**
 * Unified home page card for both audit brief and learning series content.
 *
 * Renders a text-based card with a domain-colored left strip that expands
 * on hover to reveal an arrow, pushing the card content to the right.
 * Domain badge uses dark-mode-aware colors.
 *
 * Dependencies:
 * - next/link for navigation
 * - lucide-react for arrow icon
 * - lib/domain-colors for accent colors
 */
'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getDomainColor } from '@/lib/domain-colors';
import { FavoriteButton } from '@/components/ui/favorite-button';
import { useTheme } from 'next-themes';

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
 * Renders a unified home page card with domain-colored left strip.
 *
 * On hover the strip expands to reveal a chevron arrow, pushing the
 * card content to the right with a smooth transition.
 *
 * @param props - Card props, discriminated by `variant`.
 * @returns A linked card element with domain accent styling and hover animation.
 */
export function HomeCard(props: HomeCardProps) {
  const { id, variant, title, description, domain } = props;
  const color = getDomainColor(domain);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const href = variant === 'auditBrief' ? `/audit-brief/${id}` : `/learning-path/${id}`;

  const badgeBg = isDark ? color.darkBg : color.bg;
  const badgeText = isDark ? color.darkText : color.text;

  return (
    <Link href={href as string}>
      <div className="group flex overflow-hidden rounded-xl border border-border bg-card transition-shadow duration-200 hover:shadow-md">
        {/* Domain-colored strip — expands on hover to show arrow */}
        <div
          className="relative flex w-1.5 shrink-0 items-center justify-center transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:w-9"
          style={{ backgroundColor: color.border }}
        >
          <ChevronRight
            className="absolute text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            size={18}
            strokeWidth={2.5}
          />
        </div>

        {/* Card content */}
        <div className="flex-1 p-4">
          {/* Top row: domain badge + metadata + favorite */}
          <div className="mb-2 flex items-center justify-between">
            <span
              className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: badgeBg, color: badgeText }}
            >
              {domain}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">
                {variant === 'auditBrief' ? props.year : `${props.episodeCount} episodes`}
              </span>
              {variant === 'auditBrief' && props.onToggleFavorite && (
                <FavoriteButton
                  isFavorite={props.isFavorite ?? false}
                  onToggle={props.onToggleFavorite}
                />
              )}
            </div>
          </div>

          {/* Title */}
          <p className="text-sm font-medium leading-snug">{title}</p>

          {/* Description */}
          {description && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
