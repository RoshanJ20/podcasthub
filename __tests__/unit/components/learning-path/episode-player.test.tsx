/**
 * Unit tests for the EpisodePlayer component.
 *
 * Covers transcript download button behaviour:
 * - Renders download button when transcript text is present
 * - Does not render download button when transcript is absent
 * - Clicking download creates a blob and triggers file download
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  describe('Transcript download button', () => {
    it('renders download button when transcript text is present', () => {
      render(<EpisodePlayer {...DEFAULT_PROPS} transcript="Hello, this is a transcript." />);

      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('does not render download button when transcript is absent', () => {
      render(<EpisodePlayer {...DEFAULT_PROPS} transcript={null} />);

      const downloadButton = screen.queryByRole('button', {
        name: /download/i,
      });
      expect(downloadButton).not.toBeInTheDocument();
    });

    it('does not render download button when transcript is empty string', () => {
      render(<EpisodePlayer {...DEFAULT_PROPS} transcript="" />);

      const downloadButton = screen.queryByRole('button', {
        name: /download/i,
      });
      expect(downloadButton).not.toBeInTheDocument();
    });

    it('creates a blob and triggers download on click', async () => {
      const user = userEvent.setup();
      const transcriptContent = 'This is the full transcript text.';

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockObjectUrl = 'blob:http://localhost/fake-blob-url';
      const createObjectURLSpy = vi.fn().mockReturnValue(mockObjectUrl);
      const revokeObjectURLSpy = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLSpy;
      globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

      // Spy on document.createElement to intercept anchor creation
      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation(
        (tagName: string, options?: ElementCreationOptions) => {
          const element = originalCreateElement(tagName, options);
          if (tagName === 'a') {
            element.click = clickSpy;
          }
          return element;
        }
      );

      render(<EpisodePlayer {...DEFAULT_PROPS} transcript={transcriptContent} />);

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      // Verify blob was created with the transcript text
      expect(createObjectURLSpy).toHaveBeenCalledOnce();
      const blobArg = createObjectURLSpy.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('text/plain');

      // Verify the blob content
      const blobText = await blobArg.text();
      expect(blobText).toBe(transcriptContent);

      // Verify anchor click was triggered
      expect(clickSpy).toHaveBeenCalledOnce();

      // Verify URL was revoked after download
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockObjectUrl);
    });
  });
});
