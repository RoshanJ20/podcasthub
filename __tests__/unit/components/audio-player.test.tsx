/**
 * Unit tests for the AudioPlayer component.
 *
 * Verifies rendering of play/pause buttons, time display, skip buttons,
 * volume control, playback speed selector, and audio type toggle based
 * on the Zustand player store state. Uses container queries to handle
 * React strict mode double-rendering in jsdom.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { AudioPlayer } from '@/components/audio-player/audio-player';
import { usePlayerStore } from '@/stores/player-store';

// Mock HLS.js
vi.mock('hls.js', () => ({
  default: class MockHls {
    static isSupported() {
      return true;
    }
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
  },
}));

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
  cleanup();
  resetStore();
});

describe('AudioPlayer', () => {
  it('renders play button when paused', () => {
    usePlayerStore.setState({
      currentAuditBrief: { id: '1', title: 'Test', audioShortUrl: '/test.mp3' },
    });
    const { container } = render(<AudioPlayer />);
    expect(container.querySelector('button[aria-label="Play"]')).not.toBeNull();
  });

  it('renders pause button when playing', () => {
    usePlayerStore.setState({
      currentAuditBrief: { id: '1', title: 'Test', audioShortUrl: '/test.mp3' },
      isPlaying: true,
    });
    const { container } = render(<AudioPlayer />);
    expect(container.querySelector('button[aria-label="Pause"]')).not.toBeNull();
  });

  it('displays current time and duration', () => {
    usePlayerStore.setState({ currentTime: 65, duration: 300 });
    const { container } = render(<AudioPlayer />);
    expect(container.textContent).toContain('1:05');
    expect(container.textContent).toContain('5:00');
  });

  it('renders skip forward and backward buttons', () => {
    const { container } = render(<AudioPlayer />);
    expect(container.querySelector('button[aria-label="Skip forward"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Skip backward"]')).not.toBeNull();
  });

  it('does not render volume slider (full player omits inline volume)', () => {
    const { container } = render(<AudioPlayer />);
    const volumeSlider = container.querySelector('[aria-label="Volume"]');
    expect(volumeSlider).toBeNull();
  });

  it('renders playback speed button', () => {
    const { container } = render(<AudioPlayer />);
    const speedBtn = container.querySelector('button[aria-label="1x"]');
    expect(speedBtn).not.toBeNull();
    expect(speedBtn!.textContent).toContain('1x');
  });

  it('renders audio type toggle when long version available', () => {
    usePlayerStore.setState({
      currentAuditBrief: {
        id: '1',
        title: 'Test',
        audioShortUrl: '/short.mp3',
        audioLongUrl: '/long.mp3',
      },
    });
    const { container } = render(<AudioPlayer />);
    const toggleBtn = container.querySelector(
      'button[aria-label="Brief Summary version"], button[aria-label="Detailed Overview version"]'
    );
    expect(toggleBtn).not.toBeNull();
  });

  it('does not render audio type toggle when no long version', () => {
    usePlayerStore.setState({
      currentAuditBrief: { id: '1', title: 'Test', audioShortUrl: '/short.mp3' },
    });
    const { container } = render(<AudioPlayer />);
    const toggleBtn = container.querySelector(
      'button[aria-label="Brief Summary version"], button[aria-label="Detailed Overview version"]'
    );
    expect(toggleBtn).toBeNull();
  });

  it('renders domain-colored strip when domainColor is provided', () => {
    const color = {
      border: '#93c5fd',
      bg: '#eff6ff',
      text: '#2563eb',
      darkBg: '#1e3a5f',
      darkText: '#bfdbfe',
      glow: 'rgba(147, 197, 253, 0.15)',
      chart: '#2563eb',
    };
    const { container } = render(<AudioPlayer domainColor={color} />);
    const strip = container.querySelector('[style*="background-color"]');
    expect(strip).toBeTruthy();
  });

  it('formats hours correctly', () => {
    usePlayerStore.setState({ currentTime: 3661, duration: 7200 });
    const { container } = render(<AudioPlayer />);
    expect(container.textContent).toContain('1:01:01');
    expect(container.textContent).toContain('2:00:00');
  });
});
