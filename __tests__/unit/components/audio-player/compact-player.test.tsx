/**
 * Unit tests for the CompactPlayer component.
 *
 * Key responsibilities:
 * - Verify essential controls render: title, play/pause, progress bar, time, speed
 * - Verify play/pause state toggling via aria-labels
 * - Verify speed cycling through SPEED_OPTIONS
 * - Verify absence of full-player-only controls (volume, skip, bookmark, audio type)
 *
 * Dependencies:
 * - stores/player-store (Zustand) for playback state
 * - hls.js mock to avoid real audio initialization
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompactPlayer } from '@/components/audio-player/compact-player';
import { usePlayerStore } from '@/stores/player-store';

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

/** Reset the Zustand player store to a known state between tests. */
function resetStore() {
  usePlayerStore.setState({
    currentAuditBrief: {
      id: '1',
      title: 'Test Audit Brief Title',
      audioShortUrl: '/short.mp3',
      audioLongUrl: '/long.mp3',
    },
    isPlaying: false,
    currentTime: 30,
    duration: 120,
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

describe('CompactPlayer', () => {
  it('renders the audit brief title', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.textContent).toContain('Test Audit Brief Title');
  });

  it('renders play/pause button', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.querySelector('button[aria-label="Play"]')).not.toBeNull();
  });

  it('renders pause button when playing', () => {
    usePlayerStore.setState({ isPlaying: true });
    const { container } = render(<CompactPlayer />);
    expect(container.querySelector('button[aria-label="Pause"]')).not.toBeNull();
  });

  it('renders speed button', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.textContent).toContain('1x');
  });

  it('cycles speed on click', async () => {
    const { container } = render(<CompactPlayer />);
    const user = userEvent.setup();
    const speedBtn = container.querySelector('button[aria-label="1x"]')!;
    await user.click(speedBtn);
    expect(container.textContent).toContain('1.25x');
  });

  it('renders progress bar (seek slider)', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.querySelector('[aria-label="Seek"]')).not.toBeNull();
  });

  it('renders current time', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.textContent).toContain('0:30');
  });

  it('does NOT render volume control', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.querySelector('[aria-label="Volume"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Mute"]')).toBeNull();
  });

  it('does NOT render skip buttons', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.querySelector('button[aria-label="Skip forward"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Skip backward"]')).toBeNull();
  });

  it('does NOT render bookmark button', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.querySelector('button[aria-label="Add bookmark"]')).toBeNull();
  });

  it('renders audio type toggle when long version is available', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.querySelector('button[aria-label="Brief Summary version"]')).not.toBeNull();
  });
});
