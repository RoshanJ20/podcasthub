/**
 * Audit brief card component for the public library grid.
 *
 * Horizontal layout: square thumbnail on the left, metadata on the right.
 * A domain-colored left strip slides over on hover to reveal a chevron,
 * matching the home page card interaction.
 *
 * Dependencies:
 * - next/link, next/image for navigation and optimised images
 * - lucide-react for the ChevronRight icon
 * - next-themes for dark/light mode color selection
 * - lib/domain-colors for per-domain color tokens
 * - lib/storage-url for resolving MinIO/Azure Blob URLs
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { resolveStorageUrl } from '@/lib/storage-url';
import { getDomainColor } from '@/lib/domain-colors';
import { FavoriteButton } from '@/components/ui/favorite-button';

export interface AuditBriefCardProps {
  id: string;
  title: string;
  description: string;
  domain: string;
  year: number;
  /** Retained in interface for callers — not rendered on the card. */
  tags: string[];
  thumbnailUrl: string;
  /** Whether this audit brief is favorited by the current user. */
  isFavorite?: boolean;
  /** Callback to toggle the favorite state. */
  onToggleFavorite?: () => void;
}

export function AuditBriefCard({
  id,
  title,
  description,
  domain,
  year,
  thumbnailUrl,
  isFavorite,
  onToggleFavorite,
}: AuditBriefCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const color = getDomainColor(domain);
  const badgeBg = isDark ? color.darkBg : color.bg;
  const badgeText = isDark ? color.darkText : color.text;

  return (
    <Link href={`/audit-brief/${id}`} className="group block" data-testid="audit-brief-card-link">
      <div className="flex h-full overflow-hidden rounded-xl border border-border/70 bg-card transition-[box-shadow,border-color] duration-200 hover:border-primary/25 hover:shadow-[0_10px_30px_-26px_oklch(45.6%_0.311_264.1/.6)]">
        {/* Domain-colored left strip — expands on hover to reveal arrow */}
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

        {/* Square thumbnail */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-muted sm:h-28 sm:w-28">
          <Image
            src={resolveStorageUrl(thumbnailUrl)}
            alt={title}
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>

        {/* Text content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center p-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: badgeBg, color: badgeText }}
              >
                {domain}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{year}</span>
            </div>
            {onToggleFavorite && (
              <FavoriteButton isFavorite={isFavorite ?? false} onToggle={onToggleFavorite} />
            )}
          </div>
          <p className="line-clamp-1 text-sm font-medium leading-snug">{title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}
