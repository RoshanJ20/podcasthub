/**
 * Custom hook for syncing transcript segments with audio playback.
 *
 * Determines which transcript segment is currently active based on
 * the player store's currentTime, and auto-scrolls the container
 * to keep the active segment visible.
 */
'use client';
import { useMemo, useRef, useEffect } from 'react';
import { usePlayerStore } from '@/stores/player-store';

/** A single transcript segment with start/end times and text. */
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export function useTranscriptSync(segments: TranscriptSegment[]) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Find the index of the segment that contains the current playback time. */
  const activeIndex = useMemo(() => {
    return segments.findIndex((seg) => currentTime >= seg.start && currentTime < seg.end);
  }, [segments, currentTime]);

  /** Auto-scroll to keep the active segment visible in the container. */
  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return;
    const activeElement = containerRef.current.querySelector(
      `[data-segment-index="${activeIndex}"]`
    );
    if (activeElement && typeof activeElement.scrollIntoView === 'function') {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  return { activeIndex, containerRef };
}
