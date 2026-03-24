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

interface PathCardProps {
  id: string;
  title: string;
  description: string | null;
  domain: string | null;
  episodeCount: number;
  completedCount: number;
}

export function PathCard({
  id,
  title,
  description,
  domain,
  episodeCount,
  completedCount,
}: PathCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const color = getDomainColor(domain ?? '');
  const badgeBg = isDark ? color.darkBg : color.bg;
  const badgeText = isDark ? color.darkText : color.text;
  const progress = episodeCount > 0 ? Math.round((completedCount / episodeCount) * 100) : 0;

  return (
    <Link href={`/learning-path/${id}` as string}>
      <div className="group flex overflow-hidden rounded-xl border border-border/70 bg-card transition-[box-shadow,border-color] duration-200 hover:border-primary/25 hover:shadow-[0_10px_30px_-26px_oklch(45.6%_0.311_264.1/.6)]">
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
              {domain && (
                <span
                  className="inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: badgeBg, color: badgeText }}
                >
                  {domain}
                </span>
              )}
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">{description || '\u00A0'}</p>
          </div>

          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>{episodeCount} episodes</span>
              <span className="tabular-nums">{progress}% complete</span>
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
