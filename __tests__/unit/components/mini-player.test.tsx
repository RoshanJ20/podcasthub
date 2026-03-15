/**
 * Unit tests for the MiniPlayer component.
 *
 * Verifies visibility based on store state, rendering of podcast title,
 * play/pause button, progress bar, and close button functionality.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiniPlayer } from '@/components/audio-player/mini-player';
import { usePlayerStore } from '@/stores/player-store';

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

describe('MiniPlayer', () => {
  it('is hidden when no podcast is loaded', () => {
    const { container } = render(<MiniPlayer />);
    expect(container.querySelector('[data-testid="mini-player"]')).toBeNull();
  });

  it('is hidden when isMiniPlayerVisible is false', () => {
    usePlayerStore.setState({
      currentPodcast: { id: '1', title: 'Test Pod', audioShortUrl: '/test.mp3' },
      isMiniPlayerVisible: false,
    });
    const { container } = render(<MiniPlayer />);
    expect(container.querySelector('[data-testid="mini-player"]')).toBeNull();
  });

  it('shows when a podcast is loaded and isMiniPlayerVisible is true', () => {
    usePlayerStore.setState({
      currentPodcast: { id: '1', title: 'Test Pod', audioShortUrl: '/test.mp3' },
      isMiniPlayerVisible: true,
    });
    const { container } = render(<MiniPlayer />);
    expect(container.querySelector('[data-testid="mini-player"]')).not.toBeNull();
    expect(container.textContent).toContain('Test Pod');
  });

  it('shows play button when paused', () => {
    usePlayerStore.setState({
      currentPodcast: { id: '1', title: 'Test', audioShortUrl: '/test.mp3' },
      isMiniPlayerVisible: true,
      isPlaying: false,
    });
    const { container } = render(<MiniPlayer />);
    const playBtn = container.querySelector('button[aria-label="Play"]');
    expect(playBtn).not.toBeNull();
  });

  it('shows pause button when playing', () => {
    usePlayerStore.setState({
      currentPodcast: { id: '1', title: 'Test', audioShortUrl: '/test.mp3' },
      isMiniPlayerVisible: true,
      isPlaying: true,
    });
    const { container } = render(<MiniPlayer />);
    const pauseBtn = container.querySelector('button[aria-label="Pause"]');
    expect(pauseBtn).not.toBeNull();
  });

  it('shows progress bar', () => {
    usePlayerStore.setState({
      currentPodcast: { id: '1', title: 'Test', audioShortUrl: '/test.mp3' },
      isMiniPlayerVisible: true,
      currentTime: 50,
      duration: 100,
    });
    const { container } = render(<MiniPlayer />);
    expect(container.querySelector('[data-testid="mini-player-progress"]')).not.toBeNull();
  });

  it('closes when close button is clicked', async () => {
    usePlayerStore.setState({
      currentPodcast: { id: '1', title: 'Test', audioShortUrl: '/test.mp3' },
      isMiniPlayerVisible: true,
    });
    const { container } = render(<MiniPlayer />);
    const user = userEvent.setup();
    const closeBtn = container.querySelector('button[aria-label="Close player"]')!;
    await user.click(closeBtn);
    expect(container.querySelector('[data-testid="mini-player"]')).toBeNull();
  });

  it('links to the podcast detail page', () => {
    usePlayerStore.setState({
      currentPodcast: { id: 'abc-123', title: 'Test Pod', audioShortUrl: '/test.mp3' },
      isMiniPlayerVisible: true,
    });
    const { container } = render(<MiniPlayer />);
    const link = container.querySelector('a[href="/podcast/abc-123"]');
    expect(link).not.toBeNull();
    expect(link!.textContent).toContain('Test Pod');
  });
});
