/**
 * AuditBriefDetailHeader — back-navigation link with domain badge and metadata tags.
 *
 * Key responsibilities:
 * - Renders the "Back to library" breadcrumb link above the audit brief hero card.
 * - Displays the domain badge styled with per-domain color tokens.
 * - Renders the publication year and all content tags as inline chips.
 *
 * Dependencies:
 * - next/link for client-side navigation.
 * - lucide-react for the ArrowLeft icon.
 * - lib/domain-colors for per-domain color token shape (via ReturnType).
 *
 * Usage example:
 *   <AuditBriefDetailHeader
 *     domain="Audit"
 *     year={2024}
 *     tags={['IFRS', 'Revenue']}
 *     badgeText="#0369a1"
 *     sectionProps={{}}
 *   />
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Props consumed by AuditBriefDetailHeader. */
export interface AuditBriefDetailHeaderProps {
  /** Audit domain label shown in the colored badge (e.g. "Financial Audit"). */
  domain: string;
  /** Publication year displayed beside the domain badge. */
  year: number;
  /** Content tags rendered as small secondary chips. */
  tags: string[];
  /** Resolved text color for the domain badge (light or dark variant). */
  badgeText: string;
  /** Whether this audit brief is favorited by the current user. */
  isFavorite?: boolean;
  /** Callback to toggle the favorite state. */
  onToggleFavorite?: () => void;
  /**
   * Additional props spread onto the wrapper element to support motion.div
   * animation variants supplied by the parent layout.
   */
  sectionProps: Record<string, unknown>;
  /**
   * The wrapper element to use — either a plain `div` (reduced-motion) or a
   * motion.div (standard). Passed down from the parent so this component does
   * not import motion directly.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Section: React.ElementType<any>;
}

/**
 * Renders the breadcrumb, domain badge, year, and tag chips above the hero card.
 *
 * @param props.domain - Domain label for the colored badge.
 * @param props.year - Publication year displayed as plain text.
 * @param props.tags - Array of content tag strings rendered as small chips.
 * @param props.badgeText - Computed text color string for the domain badge (and the dot color).
 * @param props.sectionProps - Motion variant props (or empty object) spread on the wrapper.
 * @param props.Section - Element type (div or motion.div) used as the wrapper.
 * @returns A section containing the back link, domain badge, year, and tag chips.
 */
export function AuditBriefDetailHeader({
  domain,
  year,
  tags,
  badgeText,
  isFavorite,
  onToggleFavorite,
  sectionProps,
  Section,
}: AuditBriefDetailHeaderProps) {
  return (
    <Section {...sectionProps}>
      <Link
        href="/bulletins"
        className="label-eyebrow mb-5 inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to library
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: badgeText }}
            aria-hidden
          />
          <span className="text-xs font-medium text-foreground/85">{domain}</span>
        </span>
        <span className="text-xs text-muted-foreground">· {year}</span>
        {tags.length > 0 && (
          <span className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
        {onToggleFavorite && (
          <span className="ml-auto">
            <FavoriteToggleButton isFavorite={isFavorite ?? false} onToggle={onToggleFavorite} />
          </span>
        )}
      </div>
    </Section>
  );
}

/**
 * Favorite toggle button with two states:
 * - Unfavorited: full "Add to favorites" button with burst hearts animation on click
 * - Favorited: collapses to a small filled heart icon, expands to
 *   "Remove from favorites" on hover
 */
const BURST_HEARTS = [
  { x: -14, y: -16, delay: 0, scale: 0.5 },
  { x: 12, y: -18, delay: 30, scale: 0.45 },
  { x: -18, y: 4, delay: 60, scale: 0.4 },
  { x: 16, y: 6, delay: 40, scale: 0.5 },
  { x: -8, y: -22, delay: 20, scale: 0.35 },
  { x: 20, y: -10, delay: 50, scale: 0.4 },
] as const;

function FavoriteToggleButton({
  isFavorite,
  onToggle,
}: {
  isFavorite: boolean;
  onToggle: () => void;
}) {
  const [showSplash, setShowSplash] = useState(false);

  const handleClick = () => {
    if (!isFavorite) {
      setShowSplash(true);
      // Delay the toggle so the burst animation plays on the unfavorited button
      // before it switches to the compact heart
      setTimeout(() => onToggle(), 50);
      setTimeout(() => setShowSplash(false), 600);
      return;
    }
    onToggle();
  };

  /* ── Favorited state: compact heart that expands on hover ── */
  // Keep showing the unfavorited button while the splash animation plays
  if (isFavorite && !showSplash) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'group/unfav relative inline-flex items-center rounded-full border px-2 py-1.5',
          'border-transparent bg-transparent',
          'hover:gap-2 hover:rounded-lg hover:border-red-200 hover:bg-red-50 hover:px-3',
          'dark:hover:border-red-500/30 dark:hover:bg-red-500/10',
          'transition-all duration-200 active:scale-95 active:duration-[100ms]'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
      >
        <Heart className="size-4 fill-red-500 text-red-500 shrink-0" />
        <span
          className={cn(
            'max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium text-red-600 opacity-0',
            'group-hover/unfav:max-w-48 group-hover/unfav:opacity-100',
            'dark:text-red-400',
            'transition-[max-width,opacity] duration-200'
          )}
          style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
        >
          Remove from favorites
        </span>
      </button>
    );
  }

  /* ── Unfavorited state: full button with burst animation ── */
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group relative inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium',
        'border-border bg-card text-muted-foreground',
        'hover:border-red-200 hover:bg-red-50 hover:text-red-500',
        'dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400',
        'transition-[color,background-color,border-color,transform] duration-150 active:scale-95 active:duration-[100ms]'
      )}
    >
      <span className="relative flex items-center justify-center">
        <Heart
          className={cn(
            'size-4 fill-transparent transition-[color,fill,transform] duration-200',
            showSplash && 'fill-red-500 text-red-500 scale-[1.3]'
          )}
          style={
            showSplash ? { transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' } : undefined
          }
        />
        {showSplash && (
          <span
            className="absolute size-8 rounded-full border-2 border-red-400/60"
            style={{ animation: 'favorite-ring 500ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}
          />
        )}
        {showSplash &&
          BURST_HEARTS.map((h, i) => (
            <Heart
              key={i}
              className="absolute size-2.5 fill-red-400 text-red-400"
              style={
                {
                  animation: `favorite-burst 450ms cubic-bezier(0.23, 1, 0.32, 1) ${h.delay}ms forwards`,
                  '--burst-x': `${h.x}px`,
                  '--burst-y': `${h.y}px`,
                  '--burst-scale': h.scale,
                } as React.CSSProperties
              }
            />
          ))}
      </span>
      Add to favorites
    </button>
  );
}

/* Keyframes `favorite-ring` and `favorite-burst` live in app/globals.css —
   moved out of an inline <style> block to comply with strict CSP
   `style-src 'self' 'nonce-…'`. */
