/**
 * Learning path card component for the public listing page.
 *
 * Displays a card with title, description, domain badge, episode count,
 * and a domain-colored progress bar. A domain-colored left strip expands
 * on hover to reveal a chevron — consistent with the home page card system.
 *
 * Dependencies:
 * - next/link for navigation
 * - lucide-react for the ChevronRight icon
 * - next-themes for dark/light mode color selection
 * - lib/domain-colors for per-domain color tokens
 */
'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getDomainColor } from '@/lib/domain-colors';
import { FavoriteButton } from '@/components/ui/favorite-button';

interface PathCardProps {
  id: string;
  title: string;
  description: string | null;
  domain: string | null;
  episodeCount: number;
  completedCount: number;
  /** Whether this learning graph is favorited by the current user. */
  isFavorite?: boolean;
  /** Callback to toggle favorite state. */
  onToggleFavorite?: () => void;
}

export function PathCard({
  id,
  title,
  description,
  domain,
  episodeCount,
  completedCount,
  isFavorite = false,
  onToggleFavorite,
}: PathCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const color = getDomainColor(domain ?? '');
  const badgeBg = isDark ? color.darkBg : color.bg;
  const badgeText = isDark ? color.darkText : color.text;
  const progress = episodeCount > 0 ? Math.round((completedCount / episodeCount) * 100) : 0;

  return (
    <Link href={`/learning-path/${id}` as string}>
      <div className="group flex overflow-hidden rounded-xl border border-border bg-card transition-shadow duration-200 hover:shadow-md">
        {/* Domain-colored left strip — expands on hover to reveal chevron */}
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

        {/* Card content — fixed height via flex layout */}
        <div className="flex flex-1 flex-col justify-between p-3">
          <div>
            <div className="mb-1 flex items-start justify-between gap-3">
              <p className="line-clamp-1 text-sm font-medium leading-snug">{title}</p>
              <div className="flex shrink-0 items-center gap-1">
                {domain && (
                  <span
                    className="inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: badgeBg, color: badgeText }}
                  >
                    {domain}
                  </span>
                )}
                {onToggleFavorite && (
                  <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
                )}
              </div>
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">{description || '\u00A0'}</p>
          </div>

          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>{episodeCount} episodes</span>
              <span>{progress}% complete</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border/40">
              <div
                className="h-1.5 rounded-full transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ width: `${progress}%`, backgroundColor: color.border }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
