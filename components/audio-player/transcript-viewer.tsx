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

import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useTranscriptSync, type TranscriptSegment } from '@/hooks/use-transcript-sync';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { getTransition } from '@/lib/animation';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  fullText?: string;
  onSeek?: (time: number) => void;
  /** Domain color for active segment accent. */
  domainColor?: DomainColor;
}

export function TranscriptViewer({
  segments,
  fullText,
  onSeek,
  domainColor,
}: TranscriptViewerProps) {
  const { activeIndex, containerRef } = useTranscriptSync(segments);
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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
    return <p className="text-muted-foreground text-center py-8">No transcript available.</p>;
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

  return (
    <div ref={containerRef} className="h-[calc(100vh-300px)] min-h-100 overflow-y-auto">
      <div className="space-y-1 p-4">
        {segments.map((segment, index) => {
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
              <p className="text-sm leading-relaxed">{segment.text}</p>
            </SegmentEl>
          );
        })}
      </div>
    </div>
  );
}
