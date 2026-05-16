/**
 * Audit brief card component for the public library grid.
 *
 * Vertical-stacked layout: 4px domain-color top band, then a horizontal row of
 * thumbnail + metadata. The whole card receives a subtle domain-tinted wash on
 * hover via the `.card-domain-tint` utility, which reads `--domain-color` from
 * the card root.
 *
 * Dependencies:
 * - next/link, next/image for navigation and optimised images
 * - lib/domain-colors for per-domain color tokens (border hex used as --domain-color)
 * - lib/storage-url for resolving MinIO/Azure Blob URLs
 */
'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { resolveStorageUrl } from '@/lib/storage-url';
import { getDomainColor } from '@/lib/domain-colors';
import { FavoriteButton } from '@/components/ui/favorite-button';

export interface AuditBriefCardProps {
  id: string;
  title: string;
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
  domain,
  year,
  thumbnailUrl,
  isFavorite,
  onToggleFavorite,
}: AuditBriefCardProps) {
  const color = getDomainColor(domain);
  const cssVars = { '--domain-color': color.border } as CSSProperties;

  return (
    <Link
      href={`/audit-brief/${id}`}
      className="group block"
      data-testid="audit-brief-card-link"
      style={cssVars}
    >
      <div className="card-domain-tint flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-card shadow-card transition-shadow duration-200 hover:shadow-card-hover">
        {/* 4px domain-color top band — replaces the old 1.5px hover-expanding strip */}
        <div className="domain-band h-1 w-full shrink-0" />

        <div className="flex min-h-0 flex-1">
          {/* Thumbnail — larger for editorial weight */}
          <div className="relative h-32 w-32 shrink-0 overflow-hidden sm:h-40 sm:w-40">
            <Image
              src={resolveStorageUrl(thumbnailUrl)}
              alt={title}
              fill
              className="object-cover"
              sizes="160px"
            />
          </div>

          {/* Text content */}
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="domain-dot size-2 shrink-0 rounded-full" />
                <span className="truncate text-xs font-medium text-muted-foreground">{domain}</span>
                <span className="shrink-0 text-xs text-muted-foreground/70">· {year}</span>
              </div>
              <p className="line-clamp-2 text-[15px] font-medium leading-snug">{title}</p>
            </div>
            {onToggleFavorite && (
              <div className="flex justify-end">
                <FavoriteButton isFavorite={isFavorite ?? false} onToggle={onToggleFavorite} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
