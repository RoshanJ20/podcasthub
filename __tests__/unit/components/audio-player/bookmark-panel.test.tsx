/**
 * Unit tests for BookmarkPanel compact mode.
 *
 * Verifies that the BookmarkPanel component supports a compact/collapsed view
 * showing only a header with bookmark count badge, expandable on click.
 * Also verifies that the full (non-compact) mode remains unchanged.
 *
 * Dependencies:
 * - vitest for test runner and mocking
 * - @testing-library/react for rendering and assertions
 * - @testing-library/user-event for simulating user interactions
 * - @/stores/player-store for player state setup
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkPanel } from '@/components/audio-player/bookmark-panel';
import { usePlayerStore } from '@/stores/player-store';

const mockBookmarks = [
  {
    id: '1',
    auditBriefId: 'pod-1',
    timestampSeconds: 30,
    note: 'First note',
    createdAt: '2025-01-01',
  },
  { id: '2', auditBriefId: 'pod-1', timestampSeconds: 90, note: null, createdAt: '2025-01-01' },
];

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: mockBookmarks }),
}) as unknown as typeof fetch;

/**
 * Reset the player store to a known state with a test audit brief loaded.
 */
function resetStore() {
  usePlayerStore.setState({
    currentAuditBrief: { id: 'pod-1', title: 'Test', audioShortUrl: '/s.mp3', audioLongUrl: null },
    isPlaying: false,
    currentTime: 0,
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
  vi.clearAllMocks();
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockBookmarks }),
  });
});

describe('BookmarkPanel compact mode', () => {
  it('renders collapsed header with count in compact mode', async () => {
    const { container } = render(<BookmarkPanel auditBriefId="pod-1" compact />);
    await waitFor(() => {
      expect(container.textContent).toContain('Bookmarks');
      expect(container.textContent).toContain('2');
    });
  });

  it('does not show bookmark list when compact and collapsed', async () => {
    const { container } = render(<BookmarkPanel auditBriefId="pod-1" compact />);
    await waitFor(() => {
      expect(container.textContent).toContain('2');
    });
    expect(container.textContent).not.toContain('First note');
  });

  it('expands to show bookmarks on toggle click in compact mode', async () => {
    const { container } = render(<BookmarkPanel auditBriefId="pod-1" compact />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(container.textContent).toContain('2');
    });
    const toggle = container.querySelector('button[aria-label="Toggle bookmarks"]')!;
    await user.click(toggle);
    await waitFor(() => {
      expect(container.textContent).toContain('First note');
    });
  });

  it('renders full panel when compact is false', async () => {
    const { container } = render(<BookmarkPanel auditBriefId="pod-1" />);
    await waitFor(() => {
      expect(container.textContent).toContain('First note');
    });
  });
});
