/**
 * Unit tests for the EpisodePlayer component.
 *
 * Covers transcript rendering behaviour:
 * - Renders transcript text when present
 * - Does not render transcript section when absent
 * - Does not render transcript section when empty string
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { EpisodePlayerProps } from '@/components/learning-path/episode-player';
import { EpisodePlayer } from '@/components/learning-path/episode-player';

// Mock resolveStorageUrl to return input unchanged
vi.mock('@/lib/storage-url', () => ({
  resolveStorageUrl: (key: string) => key,
}));

/** Default props shared across tests. */
const DEFAULT_PROPS: EpisodePlayerProps = {
  episodeId: 'ep-1',
  title: 'Test Episode',
  description: 'A test episode description',
  audioUrl: '/audio/test.mp3',
  transcript: null,
  isCompleted: false,
  graphId: 'graph-1',
  onComplete: vi.fn(),
};

describe('EpisodePlayer', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Transcript display', () => {
    it('renders transcript text when present', () => {
      render(<EpisodePlayer {...DEFAULT_PROPS} transcript="Hello, this is a transcript." />);

      expect(screen.getByText('Transcript')).toBeInTheDocument();
      expect(screen.getByText('Hello, this is a transcript.')).toBeInTheDocument();
    });

    it('does not render transcript section when transcript is absent', () => {
      render(<EpisodePlayer {...DEFAULT_PROPS} transcript={null} />);

      expect(screen.queryByText('Transcript')).not.toBeInTheDocument();
    });

    it('does not render transcript section when transcript is empty string', () => {
      render(<EpisodePlayer {...DEFAULT_PROPS} transcript="" />);

      expect(screen.queryByText('Transcript')).not.toBeInTheDocument();
    });

    it('joins array transcript into newline-separated text', () => {
      render(
        <EpisodePlayer {...DEFAULT_PROPS} transcript={['Line one', 'Line two', 'Line three']} />
      );

      expect(screen.getByText('Transcript')).toBeInTheDocument();
      expect(screen.getByText(/Line one/)).toBeInTheDocument();
    });
  });
});
