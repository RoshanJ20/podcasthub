/**
 * Unit tests for the SidebarNowPlaying component.
 *
 * Verifies:
 * - Returns nothing when no audit brief is loaded
 * - Renders episode title and progress bar when an audit brief is loaded
 * - Shows a Play button when paused, Pause button when playing
 * - In collapsed mode renders only the circular play/pause button
 * - Progress bar width reflects currentTime / duration ratio
 * - formatTime helper produces correct mm:ss strings
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SidebarNowPlaying } from '@/components/layout/sidebar-now-playing';
import { formatTime } from '@/lib/format-time';
import { usePlayerStore } from '@/stores/player-store';

// Mock next/image — jsdom does not implement it; replace with a plain <img>.
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

/** Minimal audit brief fixture used across tests. */
const TEST_PODCAST = {
  id: 'ep-1',
  title: 'Introduction to IFRS 17',
  audioShortUrl: '/audio/ep-1.mp3',
  thumbnailUrl: 'image/ep-1/thumb.jpg',
};

/** Reset the player store to a clean baseline before each test. */
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
  cleanup();
  resetStore();
});

// ─── formatTime helper ────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds below one minute', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats exactly one minute', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(187)).toBe('3:07');
  });

  it('zero-pads single-digit seconds', () => {
    expect(formatTime(61)).toBe('1:01');
  });

  it('floors fractional seconds', () => {
    expect(formatTime(59.9)).toBe('0:59');
  });

  it('clamps negative values to zero', () => {
    expect(formatTime(-5)).toBe('0:00');
  });
});

// ─── SidebarNowPlaying component ─────────────────────────────────────────────

describe('SidebarNowPlaying', () => {
  describe('when no audit brief is loaded', () => {
    it('renders nothing', () => {
      const { container } = render(<SidebarNowPlaying />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when an audit brief is loaded', () => {
    beforeEach(() => {
      usePlayerStore.setState({ currentAuditBrief: TEST_PODCAST, duration: 300 });
    });

    it('renders the episode title', () => {
      const { container } = render(<SidebarNowPlaying />);
      expect(container.textContent).toContain('Introduction to IFRS 17');
    });

    it('renders the progress bar element', () => {
      const { container } = render(<SidebarNowPlaying />);
      expect(container.querySelector('[data-testid="now-playing-progress"]')).not.toBeNull();
    });

    it('renders a Play button when paused', () => {
      usePlayerStore.setState({ isPlaying: false });
      const { container } = render(<SidebarNowPlaying />);
      expect(container.querySelector('button[aria-label="Play"]')).not.toBeNull();
    });

    it('renders a Pause button when playing', () => {
      usePlayerStore.setState({ isPlaying: true });
      const { container } = render(<SidebarNowPlaying />);
      expect(container.querySelector('button[aria-label="Pause"]')).not.toBeNull();
    });

    it('shows current time and total duration as formatted text', () => {
      usePlayerStore.setState({ currentTime: 65, duration: 300 });
      const { container } = render(<SidebarNowPlaying />);
      expect(container.textContent).toContain('1:05');
      expect(container.textContent).toContain('5:00');
    });

    it('sets progress bar aria-valuenow to reflect progress percentage', () => {
      usePlayerStore.setState({ currentTime: 150, duration: 300 });
      const { container } = render(<SidebarNowPlaying />);
      const bar = container.querySelector('[data-testid="now-playing-progress"]');
      expect(bar?.getAttribute('aria-valuenow')).toBe('50');
    });
  });

  describe('collapsed mode', () => {
    beforeEach(() => {
      usePlayerStore.setState({ currentAuditBrief: TEST_PODCAST, duration: 300 });
    });

    it('renders a play button in collapsed mode when paused', () => {
      usePlayerStore.setState({ isPlaying: false });
      const { container } = render(<SidebarNowPlaying collapsed />);
      expect(container.querySelector('button[aria-label="Play"]')).not.toBeNull();
    });

    it('renders a pause button in collapsed mode when playing', () => {
      usePlayerStore.setState({ isPlaying: true });
      const { container } = render(<SidebarNowPlaying collapsed />);
      expect(container.querySelector('button[aria-label="Pause"]')).not.toBeNull();
    });

    it('does not render the progress bar in collapsed mode', () => {
      const { container } = render(<SidebarNowPlaying collapsed />);
      expect(container.querySelector('[data-testid="now-playing-progress"]')).toBeNull();
    });

    it('does not render the episode title in collapsed mode', () => {
      const { container } = render(<SidebarNowPlaying collapsed />);
      expect(container.textContent).not.toContain('Introduction to IFRS 17');
    });

    it('returns null in collapsed mode when no audit brief is loaded', () => {
      usePlayerStore.setState({ currentAuditBrief: null });
      const { container } = render(<SidebarNowPlaying collapsed />);
      expect(container.firstChild).toBeNull();
    });
  });
});
