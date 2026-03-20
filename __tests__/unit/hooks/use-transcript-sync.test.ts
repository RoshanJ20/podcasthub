/**
 * Unit tests for the useTranscriptSync hook.
 *
 * Verifies active index calculation based on currentTime from the
 * player store, and that the hook provides a containerRef.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranscriptSync } from '@/hooks/use-transcript-sync';
import { usePlayerStore } from '@/stores/player-store';

const mockSegments = [
  { start: 0, end: 10, text: 'First segment.' },
  { start: 10, end: 25, text: 'Second segment.' },
  { start: 25, end: 40, text: 'Third segment.' },
];

/** Reset store state between tests. */
function resetStore() {
  usePlayerStore.setState({
    currentAuditBrief: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    audioType: 'short',
    isMiniPlayerVisible: false,
  });
}

beforeEach(() => {
  resetStore();
});

describe('useTranscriptSync', () => {
  it('returns activeIndex of -1 when no segments match', () => {
    usePlayerStore.setState({ currentTime: 50 });
    const { result } = renderHook(() => useTranscriptSync(mockSegments));
    expect(result.current.activeIndex).toBe(-1);
  });

  it('returns correct activeIndex for first segment', () => {
    usePlayerStore.setState({ currentTime: 5 });
    const { result } = renderHook(() => useTranscriptSync(mockSegments));
    expect(result.current.activeIndex).toBe(0);
  });

  it('returns correct activeIndex for second segment', () => {
    usePlayerStore.setState({ currentTime: 15 });
    const { result } = renderHook(() => useTranscriptSync(mockSegments));
    expect(result.current.activeIndex).toBe(1);
  });

  it('returns correct activeIndex for third segment', () => {
    usePlayerStore.setState({ currentTime: 30 });
    const { result } = renderHook(() => useTranscriptSync(mockSegments));
    expect(result.current.activeIndex).toBe(2);
  });

  it('returns activeIndex 0 at time 0', () => {
    usePlayerStore.setState({ currentTime: 0 });
    const { result } = renderHook(() => useTranscriptSync(mockSegments));
    expect(result.current.activeIndex).toBe(0);
  });

  it('returns -1 for empty segments', () => {
    const { result } = renderHook(() => useTranscriptSync([]));
    expect(result.current.activeIndex).toBe(-1);
  });

  it('provides a containerRef', () => {
    const { result } = renderHook(() => useTranscriptSync(mockSegments));
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull();
  });
});
