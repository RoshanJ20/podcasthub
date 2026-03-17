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
      <div className="group flex overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
        {/* Domain-colored left strip — expands on hover to reveal chevron */}
        <div
          className="relative flex w-1.5 shrink-0 items-center justify-center transition-all duration-300 ease-out group-hover:w-9"
          style={{ backgroundColor: color.border }}
        >
          <ChevronRight
            className="absolute text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            size={18}
            strokeWidth={2.5}
          />
        </div>

        {/* Card content */}
        <div className="flex-1 p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-sm font-medium leading-snug">{title}</p>
            {domain && (
              <span
                className="inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: badgeBg, color: badgeText }}
              >
                {domain}
              </span>
            )}
          </div>

          {description && <p className="mb-4 text-xs text-muted-foreground">{description}</p>}

          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>{episodeCount} episodes</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border/40">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: color.border }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
