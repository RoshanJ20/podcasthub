/**
 * Unit tests for the TranscriptViewer component.
 *
 * Verifies rendering of transcript segments with timestamps, active
 * segment highlighting based on currentTime, seek on click, and
 * empty state when no segments are provided.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranscriptViewer } from '@/components/audio-player/transcript-viewer';
import { usePlayerStore } from '@/stores/player-store';

/** Mock IntersectionObserver for motion/react whileInView support in jsdom. */
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

const mockSegments = [
  { start: 0, end: 10, text: 'Welcome to the audit methodology podcast.' },
  { start: 10, end: 25, text: 'Today we discuss the new framework.' },
  { start: 25, end: 40, text: 'Let us begin with the key changes.' },
];

/** Reset store state between tests. */
function resetStore() {
  usePlayerStore.setState({
    currentPodcast: null,
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
  cleanup();
  resetStore();
});

describe('TranscriptViewer', () => {
  it('renders all transcript segments', () => {
    const { container } = render(<TranscriptViewer segments={mockSegments} />);
    expect(container.textContent).toContain('Welcome to the audit methodology podcast.');
    expect(container.textContent).toContain('Today we discuss the new framework.');
    expect(container.textContent).toContain('Let us begin with the key changes.');
  });

  it('displays timestamps for each segment', () => {
    const { container } = render(<TranscriptViewer segments={mockSegments} />);
    expect(container.textContent).toContain('0:00');
    expect(container.textContent).toContain('0:10');
    expect(container.textContent).toContain('0:25');
  });

  it('highlights the active segment based on currentTime', () => {
    usePlayerStore.setState({ currentTime: 15 });
    const { container } = render(<TranscriptViewer segments={mockSegments} />);
    const segments = container.querySelectorAll('[data-segment]');
    expect(segments[1].getAttribute('data-active')).toBe('true');
  });

  it('does not highlight non-active segments', () => {
    usePlayerStore.setState({ currentTime: 15 });
    const { container } = render(<TranscriptViewer segments={mockSegments} />);
    const segments = container.querySelectorAll('[data-segment]');
    expect(segments[0].getAttribute('data-active')).toBe('false');
    expect(segments[2].getAttribute('data-active')).toBe('false');
  });

  it('calls onSeek when a segment is clicked', async () => {
    const onSeek = vi.fn();
    const { container } = render(<TranscriptViewer segments={mockSegments} onSeek={onSeek} />);
    const user = userEvent.setup();
    const segments = container.querySelectorAll('[data-segment]');
    await user.click(segments[1]);
    expect(onSeek).toHaveBeenCalledWith(10);
  });

  it('calls onSeek with correct time for first segment', async () => {
    const onSeek = vi.fn();
    const { container } = render(<TranscriptViewer segments={mockSegments} onSeek={onSeek} />);
    const user = userEvent.setup();
    const segments = container.querySelectorAll('[data-segment]');
    await user.click(segments[0]);
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('shows empty state when no segments', () => {
    const { container } = render(<TranscriptViewer segments={[]} />);
    expect(container.textContent).toContain('No transcript available.');
  });

  it('renders correct number of segments', () => {
    const { container } = render(<TranscriptViewer segments={mockSegments} />);
    const segments = container.querySelectorAll('[data-segment]');
    expect(segments.length).toBe(3);
  });

  // --- Compact mode tests ---

  it('shows only segments around active in compact mode', () => {
    const manySegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `Segment ${i}`,
    }));
    usePlayerStore.setState({ currentTime: 75 }); // Active index = 7
    const { container } = render(<TranscriptViewer segments={manySegments} compact />);
    const segments = container.querySelectorAll('[data-segment]');
    expect(segments.length).toBeLessThanOrEqual(5);
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });

  it('includes the active segment in compact mode', () => {
    const manySegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `Segment ${i}`,
    }));
    usePlayerStore.setState({ currentTime: 75 });
    const { container } = render(<TranscriptViewer segments={manySegments} compact />);
    const active = container.querySelector('[data-active="true"]');
    expect(active).not.toBeNull();
  });

  it('still calls onSeek in compact mode', async () => {
    const onSeek = vi.fn();
    const manySegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `Segment ${i}`,
    }));
    usePlayerStore.setState({ currentTime: 75 });
    const { container } = render(
      <TranscriptViewer segments={manySegments} onSeek={onSeek} compact />
    );
    const user = userEvent.setup();
    const segments = container.querySelectorAll('[data-segment]');
    await user.click(segments[0]);
    expect(onSeek).toHaveBeenCalled();
  });

  it('renders all segments when compact is false', () => {
    const manySegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `Segment ${i}`,
    }));
    const { container } = render(<TranscriptViewer segments={manySegments} />);
    const segments = container.querySelectorAll('[data-segment]');
    expect(segments.length).toBe(20);
  });
});
