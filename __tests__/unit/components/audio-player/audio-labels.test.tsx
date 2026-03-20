/**
 * Unit tests for audio label renaming in the AudioPlayer component.
 *
 * Verifies that the audio type toggle displays "Brief Summary" and
 * "Detailed Overview" instead of the legacy "Short" / "Long" labels.
 * Both the visible button text and the aria-labels are tested.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { AudioPlayer } from '@/components/audio-player/audio-player';
import { usePlayerStore } from '@/stores/player-store';

// Mock HLS.js — AudioPlayer depends on useHlsPlayer which imports hls.js
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

/** Reset the Zustand player store to a clean state between tests. */
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

describe('AudioPlayer audio labels', () => {
  it('displays "Brief Summary" text when audioType is short', () => {
    usePlayerStore.setState({
      currentAuditBrief: {
        id: '1',
        title: 'Test Audit Brief',
        audioShortUrl: '/short.mp3',
        audioLongUrl: '/long.mp3',
      },
      audioType: 'short',
    });

    const { container } = render(<AudioPlayer />);
    const toggleBtn = container.querySelector('button[aria-label="Brief Summary version"]');

    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn!.textContent).toBe('Brief Summary');
  });

  it('displays "Detailed Overview" text when audioType is long', () => {
    usePlayerStore.setState({
      currentAuditBrief: {
        id: '1',
        title: 'Test Audit Brief',
        audioShortUrl: '/short.mp3',
        audioLongUrl: '/long.mp3',
      },
      audioType: 'long',
    });

    const { container } = render(<AudioPlayer />);
    const toggleBtn = container.querySelector('button[aria-label="Detailed Overview version"]');

    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn!.textContent).toBe('Detailed Overview');
  });

  it('has aria-label "Brief Summary version" when audioType is short', () => {
    usePlayerStore.setState({
      currentAuditBrief: {
        id: '1',
        title: 'Test Audit Brief',
        audioShortUrl: '/short.mp3',
        audioLongUrl: '/long.mp3',
      },
      audioType: 'short',
    });

    const { container } = render(<AudioPlayer />);
    const btn = container.querySelector('button[aria-label="Brief Summary version"]');
    expect(btn).not.toBeNull();
  });

  it('has aria-label "Detailed Overview version" when audioType is long', () => {
    usePlayerStore.setState({
      currentAuditBrief: {
        id: '1',
        title: 'Test Audit Brief',
        audioShortUrl: '/short.mp3',
        audioLongUrl: '/long.mp3',
      },
      audioType: 'long',
    });

    const { container } = render(<AudioPlayer />);
    const btn = container.querySelector('button[aria-label="Detailed Overview version"]');
    expect(btn).not.toBeNull();
  });

  it('does not display legacy "Short" or "Long" labels', () => {
    usePlayerStore.setState({
      currentAuditBrief: {
        id: '1',
        title: 'Test Audit Brief',
        audioShortUrl: '/short.mp3',
        audioLongUrl: '/long.mp3',
      },
      audioType: 'short',
    });

    const { container } = render(<AudioPlayer />);

    // The toggle button should not have the old labels
    const oldShortBtn = container.querySelector('button[aria-label="Short version"]');
    const oldLongBtn = container.querySelector('button[aria-label="Long version"]');
    expect(oldShortBtn).toBeNull();
    expect(oldLongBtn).toBeNull();
  });
});
