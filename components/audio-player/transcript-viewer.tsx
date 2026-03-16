/**
 * Transcript viewer component with time-synced highlighting.
 *
 * Renders a scrollable list of transcript segments with timestamps.
 * The currently active segment (based on player store's currentTime)
 * is highlighted and auto-scrolled into view. Clicking a segment
 * triggers a seek to that segment's start time.
 */
'use client';
import { useTranscriptSync, type TranscriptSegment } from '@/hooks/use-transcript-sync';
import { cn } from '@/lib/utils';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  fullText?: string;
  onSeek?: (time: number) => void;
}

/** Format seconds as m:ss timestamp. */
function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TranscriptViewer({ segments, fullText, onSeek }: TranscriptViewerProps) {
  const { activeIndex, containerRef } = useTranscriptSync(segments);

  if (segments.length === 0 && fullText) {
    return (
      <div className="h-[500px] overflow-y-auto p-4 space-y-4">
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

  return (
    <div ref={containerRef} className="h-[500px] overflow-y-auto">
      <div className="space-y-1 p-4">
        {segments.map((segment, index) => (
          <div
            key={index}
            data-segment
            data-segment-index={index}
            data-active={index === activeIndex ? 'true' : 'false'}
            className={cn(
              'flex gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted',
              index === activeIndex && 'bg-primary/10 border-l-2 border-primary'
            )}
            onClick={() => onSeek?.(segment.start)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSeek?.(segment.start);
            }}
          >
            <span className="text-xs text-muted-foreground font-mono w-10 flex-shrink-0 pt-0.5">
              {formatTimestamp(segment.start)}
            </span>
            <p className="text-sm leading-relaxed">{segment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
