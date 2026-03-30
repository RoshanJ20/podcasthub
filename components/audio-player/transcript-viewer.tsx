/**
 * Transcript viewer with time-synced highlighting, search, and copy.
 *
 * Segments cascade in from the left as they scroll into view (whileInView).
 * The active segment uses domain-colored left border and background, with
 * a soft glow in dark mode. Clicking a segment seeks to its timestamp.
 *
 * A sticky toolbar provides search, a "Copy all" button, and segment count.
 *
 * Dependencies:
 * - motion/react for segment entrance animations
 * - lib/animation for transition tokens
 * - lib/domain-colors for DomainColor type
 * - next-themes for dark/light mode detection
 * - hooks/use-transcript-sync for active segment tracking
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { Search, Copy, Check } from 'lucide-react';
import { useTranscriptSync, type TranscriptSegment } from '@/hooks/use-transcript-sync';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { getTransition } from '@/lib/animation';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';
import { Button } from '@/components/ui/button';

/** Highlights matching text with a styled mark element. */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-accent-warm/30 px-0.5 dark:bg-accent-warm/20">
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

/**
 * Renders a scrollable transcript with time-synced segment highlighting,
 * search filtering, and a copy-to-clipboard button.
 *
 * @param props.segments - Array of transcript segments with start/end/text.
 * @param props.fullText - Fallback full text when segments are unavailable.
 * @param props.onSeek - Callback to seek audio to a segment's start time.
 * @param props.domainColor - Domain color tokens for active segment accent.
 * @param props.compact - When true, shows only segments near the active one.
 */
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
  const [copied, setCopied] = useState(false);

  /** Copy the full transcript text to clipboard. */
  const handleCopy = useCallback(async () => {
    const text =
      fullText ||
      segments.map((s) => `[${formatTime(s.start)}] ${s.text}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard API not available — non-critical */
    }
  }, [fullText, segments]);

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

  /** Full-text fallback when no segments are available. */
  if (segments.length === 0 && fullText) {
    return (
      <div className="flex h-[calc(100vh-300px)] min-h-100 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5 dark:border-border-subtle">
          <span className="text-xs text-tertiary">Full transcript</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check className="size-3 text-positive" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mx-auto max-w-2xl space-y-4">
            {fullText.split('\n\n').map((paragraph, index) => (
              <p
                key={index}
                className="text-[0.9375rem] leading-[1.75] text-primary-text"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-tertiary">
        No transcript available for this bulletin.
      </div>
    );
  }

  /** Compute active segment styles using domain color. */
  const activeStyle = (isActive: boolean): React.CSSProperties | undefined => {
    if (!isActive) return undefined;
    return {
      borderLeftColor: domainColor?.border ?? 'var(--interactive-primary)',
      backgroundColor: isDark
        ? `${domainColor?.darkBg ?? 'var(--interactive-primary)'}40`
        : (domainColor?.bg ?? 'var(--interactive-primary-soft)'),
      boxShadow: isDark && domainColor ? `0 0 20px ${domainColor.glow}` : undefined,
    };
  };

  const containerHeight = compact
    ? 'max-h-60 overflow-y-auto'
    : 'flex h-[calc(100vh-300px)] min-h-100 flex-col';

  return (
    <div ref={containerRef} className={containerHeight}>
      {/* Toolbar — search + copy, hidden in compact mode */}
      {!compact && (
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border-default bg-elevated px-4 py-2.5 dark:border-border-subtle">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full rounded-lg border border-border-default bg-canvas py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-tertiary/60 focus:border-focus-ring focus:ring-1 focus:ring-focus-ring dark:border-border-subtle dark:bg-subtle"
            />
          </div>
          {/* Segment count */}
          {isSearching && (
            <span className="shrink-0 text-xs tabular-nums text-tertiary">
              {visibleSegments.length} / {segments.length}
            </span>
          )}
          {/* Copy button */}
          <Button
            variant="outline"
            size="xs"
            onClick={handleCopy}
            className="gap-1.5 shrink-0"
          >
            {copied ? (
              <Check className="size-3 text-positive" />
            ) : (
              <Copy className="size-3" />
            )}
            {copied ? 'Copied' : 'Copy all'}
          </Button>
        </div>
      )}

      {/* Segments list */}
      <div className={cn('space-y-0.5 p-3', !compact && 'flex-1 overflow-y-auto')}>
        {visibleSegments.map(({ seg: segment, i: index }) => {
          const isActive = index === activeIndex;
          const SegmentEl = reducedMotion ? 'div' : motion.div;
          const motionProps = reducedMotion
            ? {}
            : {
                initial: { opacity: 0, x: -12 },
                whileInView: { opacity: 1, x: 0 },
                viewport: { once: true, margin: '-30px' },
                transition: getTransition('normal'),
              };

          return (
            <SegmentEl
              key={index}
              data-segment
              data-segment-index={index}
              data-active={isActive ? 'true' : 'false'}
              className={cn(
                'group flex gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150',
                isActive
                  ? 'border-l-[3px]'
                  : 'border-l-[3px] border-l-transparent hover:bg-subtle dark:hover:bg-surface-muted/40',
                onSeek && 'cursor-pointer'
              )}
              style={activeStyle(isActive)}
              onClick={() => onSeek?.(segment.start)}
              role={onSeek ? 'button' : undefined}
              tabIndex={onSeek ? 0 : undefined}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && onSeek) onSeek(segment.start);
              }}
              {...motionProps}
            >
              <span
                className={cn(
                  'shrink-0 pt-0.5 font-mono text-[11px] tabular-nums',
                  isActive ? 'text-secondary-text font-medium' : 'text-tertiary'
                )}
              >
                {formatTime(segment.start)}
              </span>
              <p
                className={cn(
                  'text-[0.9375rem] leading-[1.7]',
                  isActive ? 'text-primary-text font-medium' : 'text-secondary-text'
                )}
              >
                {isSearching ? highlightMatch(segment.text, searchLower) : segment.text}
              </p>
            </SegmentEl>
          );
        })}
      </div>
    </div>
  );
}
