/**
 * Unit tests for toast notifications in EpisodePlayer.
 *
 * Verifies that the "Mark as Complete" operation shows success/error toasts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { EpisodePlayer } from '@/components/learning-path/episode-player';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/storage-url', () => ({
  resolveStorageUrl: (url: string) => url,
}));

const defaultProps = {
  episodeId: 'ep-1',
  title: 'Test Episode',
  description: 'A test episode',
  audioUrl: '/audio/test.mp3',
  isCompleted: false,
  graphId: 'graph-1',
  onComplete: vi.fn(),
};

describe('EpisodePlayer toast notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows success toast when marking episode as complete succeeds', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    });

    render(<EpisodePlayer {...defaultProps} />);

    const markButton = screen.getByRole('button', { name: /mark as complete/i });
    fireEvent.click(markButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Episode marked as complete');
    });
    expect(defaultProps.onComplete).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows error toast when marking episode as complete fails with non-ok response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<EpisodePlayer {...defaultProps} />);

    const markButton = screen.getByRole('button', { name: /mark as complete/i });
    fireEvent.click(markButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to mark episode as complete');
    });
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows error toast when marking episode as complete throws a network error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<EpisodePlayer {...defaultProps} />);

    const markButton = screen.getByRole('button', { name: /mark as complete/i });
    fireEvent.click(markButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to mark episode as complete');
    });
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it('does not show mark complete button when already completed', () => {
    render(<EpisodePlayer {...defaultProps} isCompleted={true} />);

    expect(screen.queryByRole('button', { name: /mark as complete/i })).toBeNull();
    expect(screen.getByText('Completed')).toBeDefined();
  });
});
