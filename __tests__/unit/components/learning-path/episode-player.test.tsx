/**
 * Unit tests for the EpisodePlayer component.
 *
 * Covers:
 * - Transcript rendering behaviour
 * - Playback mutex: pauses global player when episode plays and vice versa
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import type { EpisodePlayerProps } from '@/components/learning-path/episode-player';
import { EpisodePlayer } from '@/components/learning-path/episode-player';
import { usePlayerStore } from '@/stores/player-store';

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
  beforeEach(() => {
    /** Reset global player store to initial state before each test. */
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
  });

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

  describe('Playback mutex — global player coordination', () => {
    it('pauses global player when episode play is triggered', () => {
      /**
       * Spy on the store's pause action by replacing it with a tracked mock.
       * usePlayerStore.getState().pause is called directly in togglePlay,
       * so we patch the store's state to capture the call.
       */
      const pauseMock = vi.fn();
      usePlayerStore.setState({ pause: pauseMock } as never);

      render(<EpisodePlayer {...DEFAULT_PROPS} />);

      const playButton = screen.getByRole('button', { name: /play/i });
      fireEvent.click(playButton);

      expect(pauseMock).toHaveBeenCalled();
    });

    it('pauses episode audio when global player starts playing', () => {
      render(<EpisodePlayer {...DEFAULT_PROPS} />);

      /**
       * Get the audio element and spy on its pause method.
       * The audio element is rendered inside EpisodePlayer with the test id.
       */
      const container = screen.getByTestId('episode-player-ep-1');
      const audioElement = container.querySelector('audio') as HTMLAudioElement;
      const pauseSpy = vi.spyOn(audioElement, 'pause');

      /** Simulate global player starting — e.g. user clicks play in sidebar. */
      act(() => {
        usePlayerStore.setState({ isPlaying: true });
      });

      expect(pauseSpy).toHaveBeenCalled();
    });
  });
});
