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

import { getDomainColor } from '@/lib/domain-colors';
import { resolveStorageUrl } from '@/lib/storage-url';
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
    <Link href={`/audit-brief/${id}`} className="group block h-full" data-testid="audit-brief-card-link">
      <div className="press-scale flex h-full min-h-[88px] overflow-hidden rounded-xl border border-border-default bg-elevated shadow-card transition-[box-shadow,border-color,transform] duration-200 ease-[var(--ease-out)] hover:border-brand-500/20 hover:shadow-card-hover dark:border-border-subtle dark:hover:border-brand-400/20">
        {/* Gradient image accent line — uses the real gradient thumbnail */}
        <div className="relative w-2 shrink-0 overflow-hidden rounded-l-xl">
          <Image
            src={resolveStorageUrl(thumbnailUrl)}
            alt=""
            fill
            className="object-cover"
            sizes="8px"
          />
        </div>

        {/* Text content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: badgeBg, color: badgeText }}
              >
                {domain}
              </span>
              <span className="text-[11px] text-tertiary tabular-nums">{year}</span>
            </div>
            {onToggleFavorite && (
              <FavoriteButton isFavorite={isFavorite ?? false} onToggle={onToggleFavorite} />
            )}
          </div>
          <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-primary-text">{title}</p>
        </div>

        {/* Domain-colored accent strip — reveals on hover */}
        <div
          className="relative flex w-0 shrink-0 items-center justify-center opacity-0 transition-[width,opacity] duration-200 ease-[var(--ease-out)] group-hover:w-9 group-hover:opacity-100"
          style={{ backgroundColor: color.border }}
        >
          <ChevronRight
            className="absolute text-white"
            size={18}
            strokeWidth={2.5}
          />
        </div>
      </div>
    </Link>
  );
}
