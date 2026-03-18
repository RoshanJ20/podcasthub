/**
 * PodcastDetailHeader — back-navigation link with domain badge and metadata tags.
 *
 * Key responsibilities:
 * - Renders the "Back to library" breadcrumb link above the podcast hero card.
 * - Displays the domain badge styled with per-domain color tokens.
 * - Renders the publication year and all content tags as inline chips.
 *
 * Dependencies:
 * - next/link for client-side navigation.
 * - lucide-react for the ArrowLeft icon.
 * - lib/domain-colors for per-domain color token shape (via ReturnType).
 *
 * Usage example:
 *   <PodcastDetailHeader
 *     domain="Audit"
 *     year={2024}
 *     tags={['IFRS', 'Revenue']}
 *     badgeBg="#e0f2fe"
 *     badgeText="#0369a1"
 *     sectionProps={{}}
 *   />
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** Props consumed by PodcastDetailHeader. */
export interface PodcastDetailHeaderProps {
  /** Audit domain label shown in the colored badge (e.g. "Financial Audit"). */
  domain: string;
  /** Publication year displayed beside the domain badge. */
  year: number;
  /** Content tags rendered as small secondary chips. */
  tags: string[];
  /** Resolved background color for the domain badge (light or dark variant). */
  badgeBg: string;
  /** Resolved text color for the domain badge (light or dark variant). */
  badgeText: string;
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
 * @param props.badgeBg - Computed background color string for the domain badge.
 * @param props.badgeText - Computed text color string for the domain badge.
 * @param props.sectionProps - Motion variant props (or empty object) spread on the wrapper.
 * @param props.Section - Element type (div or motion.div) used as the wrapper.
 * @returns A section containing the back link, domain badge, year, and tag chips.
 */
export function PodcastDetailHeader({
  domain,
  year,
  tags,
  badgeBg,
  badgeText,
  sectionProps,
  Section,
}: PodcastDetailHeaderProps) {
  return (
    <Section {...sectionProps}>
      <Link
        href="/bulletins"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: badgeBg, color: badgeText }}
        >
          {domain}
        </span>
        <span className="text-xs text-muted-foreground">{year}</span>
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </Section>
  );
}
