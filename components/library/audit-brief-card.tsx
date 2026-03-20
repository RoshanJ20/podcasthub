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

export interface AuditBriefCardProps {
  id: string;
  title: string;
  description: string;
  domain: string;
  year: number;
  /** Retained in interface for callers — not rendered on the card. */
  tags: string[];
  thumbnailUrl: string;
}

export function AuditBriefCard({
  id,
  title,
  description,
  domain,
  year,
  thumbnailUrl,
}: AuditBriefCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const color = getDomainColor(domain);
  const badgeBg = isDark ? color.darkBg : color.bg;
  const badgeText = isDark ? color.darkText : color.text;

  return (
    // WORKAROUND: Next.js App Router typed routes don't support dynamic segments — safe to cast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link
      href={`/audit-brief/${id}` as any}
      className="group block"
      data-testid="audit-brief-card-link"
    >
      <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
        {/* Domain-colored left strip — expands on hover to reveal arrow */}
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

        {/* Square thumbnail */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden sm:h-28 sm:w-28">
          <Image
            src={resolveStorageUrl(thumbnailUrl)}
            alt={title}
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>

        {/* Text content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: badgeBg, color: badgeText }}
            >
              {domain}
            </span>
            <span className="text-[11px] text-muted-foreground">{year}</span>
          </div>
          <p className="line-clamp-1 text-sm font-medium leading-snug">{title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}
