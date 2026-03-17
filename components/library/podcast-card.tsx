/**
 * Podcast card component for the public library grid.
 *
 * Displays a podcast's thumbnail, domain badge, year, title, and
 * truncated description. A domain-colored left strip expands on hover
 * to reveal a play icon — mirroring the home page card animation language
 * but using a play icon to signal audio content.
 *
 * Dependencies:
 * - next/link, next/image for navigation and optimised images
 * - lucide-react for the Play icon
 * - next-themes for dark/light mode color selection
 * - lib/domain-colors for per-domain color tokens
 * - lib/storage-url for resolving MinIO/Azure Blob URLs
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { useTheme } from 'next-themes';
import { resolveStorageUrl } from '@/lib/storage-url';
import { getDomainColor } from '@/lib/domain-colors';

export interface PodcastCardProps {
  id: string;
  title: string;
  description: string;
  domain: string;
  year: number;
  /** Retained in interface for callers — not rendered on the card. */
  tags: string[];
  thumbnailUrl: string;
}

export function PodcastCard({
  id,
  title,
  description,
  domain,
  year,
  thumbnailUrl,
}: PodcastCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const color = getDomainColor(domain);
  const badgeBg = isDark ? color.darkBg : color.bg;
  const badgeText = isDark ? color.darkText : color.text;

  return (
    // WORKAROUND: Next.js App Router typed routes don't support dynamic segments — safe to cast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link href={`/podcast/${id}` as any} className="group block" data-testid="podcast-card-link">
      <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md active:scale-[0.98]">
        {/* Domain-colored left strip — expands on hover to reveal play icon */}
        <div
          className="relative flex w-1.5 shrink-0 items-center justify-center transition-all duration-300 ease-out group-hover:w-9"
          style={{ backgroundColor: color.border }}
        >
          <Play
            className="absolute text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            size={16}
            strokeWidth={2.5}
          />
        </div>

        {/* Card content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative aspect-video w-full overflow-hidden">
            <Image
              src={resolveStorageUrl(thumbnailUrl)}
              alt={title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: badgeBg, color: badgeText }}
              >
                {domain}
              </span>
              <span className="text-[11px] text-muted-foreground">{year}</span>
            </div>
            <p className="line-clamp-1 text-sm font-medium leading-snug">{title}</p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
