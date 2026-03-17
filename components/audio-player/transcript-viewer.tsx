/**
 * Transcript viewer with time-synced highlighting and Mercury-inspired animations.
 *
 * Segments cascade in from the left as they scroll into view (whileInView).
 * The active segment uses domain-colored left border and background, with
 * a soft glow in dark mode. Clicking a segment seeks to its timestamp.
 *
 * Dependencies:
 * - motion/react for segment entrance animations
 * - lib/animation for transition tokens
 * - lib/domain-colors for DomainColor type
 * - next-themes for dark/light mode detection
 * - hooks/use-transcript-sync for active segment tracking
 */
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { Search } from 'lucide-react';
import { useTranscriptSync, type TranscriptSegment } from '@/hooks/use-transcript-sync';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { getTransition } from '@/lib/animation';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

/** Highlights matching text with a styled mark element. */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200/60 px-0.5 dark:bg-yellow-500/30">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  fullText?: string;
  onSeek?: (time: number) => void;
  /** Domain color for active segment accent. */
  domainColor?: DomainColor;
  /** When true, show only ~5 segments around the active segment. */
  compact?: boolean;
}

export function TranscriptViewer({
  segments,
  fullText,
  onSeek,
  domainColor,
  compact,
}: TranscriptViewerProps) {
  const { activeIndex, containerRef } = useTranscriptSync(segments);
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');

  /** Filter segments by search query (case-insensitive). */
  const isSearching = searchQuery.trim().length > 0;
  const searchLower = searchQuery.trim().toLowerCase();

  /** Number of segments to show before and after the active segment in compact mode. */
  const COMPACT_WINDOW = 2;
  const visibleSegments = useMemo(() => {
    let result = segments.map((seg, i) => ({ seg, i }));
    if (compact) {
      result = result.filter(({ i }) => Math.abs(i - activeIndex) <= COMPACT_WINDOW);
    }
    if (isSearching) {
      result = result.filter(({ seg }) => seg.text.toLowerCase().includes(searchLower));
    }
    return result;
  }, [segments, compact, activeIndex, isSearching, searchLower]);

  if (segments.length === 0 && fullText) {
    return (
      <div className="h-[calc(100vh-300px)] min-h-100 overflow-y-auto p-4 space-y-4">
        {fullText.split('\n\n').map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  if (segments.length === 0) {
    return null;
  }

  /** Compute active segment styles using domain color. */
  const activeStyle = (isActive: boolean): React.CSSProperties | undefined => {
    if (!isActive) return undefined;
    return {
      borderLeftColor: domainColor?.border ?? 'var(--primary)',
      backgroundColor: isDark
        ? `${domainColor?.darkBg ?? 'var(--primary)'}40`
        : (domainColor?.bg ?? 'var(--primary-foreground)'),
      boxShadow: isDark && domainColor ? `0 0 20px ${domainColor.glow}` : undefined,
    };
  };

  const containerHeight = compact
    ? 'max-h-60 overflow-y-auto'
    : 'h-[calc(100vh-300px)] min-h-100 overflow-y-auto';

  return (
    <div ref={containerRef} className={containerHeight}>
      {/* Search bar — hidden in compact mode */}
      {!compact && (
        <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      )}
      <div className="space-y-1 p-4">
        {visibleSegments.map(({ seg: segment, i: index }) => {
          const isActive = index === activeIndex;
          const SegmentEl = reducedMotion ? 'div' : motion.div;
          const motionProps = reducedMotion
            ? {}
            : {
                initial: { opacity: 0, x: -20 },
                whileInView: { opacity: 1, x: 0 },
                viewport: { once: true, margin: '-50px' },
                transition: getTransition('normal'),
              };

          return (
            <SegmentEl
              key={index}
              data-segment
              data-segment-index={index}
              data-active={isActive ? 'true' : 'false'}
              className={cn(
                'flex gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted',
                isActive && 'border-l-2'
              )}
              style={activeStyle(isActive)}
              onClick={() => onSeek?.(segment.start)}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') onSeek?.(segment.start);
              }}
              {...motionProps}
            >
              <span className="text-xs text-muted-foreground font-mono w-10 shrink-0 pt-0.5">
                {formatTime(segment.start)}
              </span>
              <p className="text-sm leading-relaxed">
                {isSearching ? highlightMatch(segment.text, searchLower) : segment.text}
              </p>
            </SegmentEl>
          );
        })}
      </div>
    </div>
  );
}
