/**
 * Integration tests for the podcast detail layout.
 *
 * Verifies the two-column layout with attachment sidebar,
 * slide-in PDF panel opening/closing, file switching,
 * compact mode activation, and active file highlighting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PodcastDetailLayout } from '@/components/audio-player/podcast-detail-layout';

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

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>
  ),
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' }, version: '4.0.0' },
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    measureElement: vi.fn(),
  }),
}));

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

/** Mock IntersectionObserver for motion/react whileInView support in jsdom. */
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
}) as unknown as typeof fetch;

const mockPodcast = {
  id: 'pod-1',
  title: 'Test Podcast',
  description: 'A test podcast description',
  domain: 'Audit Methodology',
  year: 2025,
  tags: ['audit', 'methodology'],
  thumbnailUrl: '/thumbnails/test.jpg',
  audioShortUrl: '/audio/short.mp3',
  audioLongUrl: '/audio/long.mp3',
  bulletinUrls: ['/bulletins/Q3-Bulletin.pdf', '/bulletins/Standards-Update.pdf'],
  transcripts: [
    {
      id: 't1',
      fullText: 'Full transcript text',
      segments: [
        { start: 0, end: 10, text: 'Segment one' },
        { start: 10, end: 20, text: 'Segment two' },
      ],
      transcriptType: 'short',
    },
  ],
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  });
});

describe('PodcastDetailLayout', () => {
  it('renders the attachment sidebar with filenames', () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    expect(container.textContent).toContain('Q3 Bulletin');
    expect(container.textContent).toContain('Standards Update');
  });

  it('renders sidebar header "Attachments"', () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    expect(container.textContent).toContain('Attachments');
  });

  it('renders the hero card with full audio player in default state', () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    expect(container.textContent).toContain('Test Podcast');
    expect(container.querySelector('[data-testid="audio-player"]')).not.toBeNull();
  });

  it('opens PDF panel when clicking an attachment', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const fileButton = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(fileButton);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).not.toBeNull();
    });
  });

  it('shows compact player when PDF panel is open', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const fileButton = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(fileButton);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="compact-player"]')).not.toBeNull();
    });
  });

  it('highlights the active file in the sidebar', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const fileButton = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(fileButton);
    await waitFor(() => {
      // Re-query after render since sidebar may have moved in the DOM
      const updatedButton = container.querySelector('[data-testid="attachment-file-0"]')!;
      expect(updatedButton.getAttribute('data-active')).toBe('true');
    });
  });

  it('closes PDF panel when clicking close button', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const fileButton = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(fileButton);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).not.toBeNull();
    });
    const closeBtn = container.querySelector('button[aria-label="Close PDF viewer"]')!;
    await user.click(closeBtn);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeNull();
    });
  });

  it('switches files when clicking a different attachment', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const file0 = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(file0);
    await waitFor(() => {
      // Re-query after render since sidebar may have moved in the DOM
      const updatedFile0 = container.querySelector('[data-testid="attachment-file-0"]')!;
      expect(updatedFile0.getAttribute('data-active')).toBe('true');
    });
    // Re-query file1 in the new DOM structure
    const file1 = container.querySelector('[data-testid="attachment-file-1"]')!;
    await user.click(file1);
    await waitFor(() => {
      const updatedFile1 = container.querySelector('[data-testid="attachment-file-1"]')!;
      const updatedFile0 = container.querySelector('[data-testid="attachment-file-0"]')!;
      expect(updatedFile1.getAttribute('data-active')).toBe('true');
      expect(updatedFile0.getAttribute('data-active')).toBe('false');
    });
  });

  it('hides sidebar when no attachments', () => {
    const noAttachments = { ...mockPodcast, bulletinUrls: [] };
    const { container } = render(<PodcastDetailLayout podcast={noAttachments} />);
    expect(container.textContent).not.toContain('Attachments');
    expect(container.querySelector('[data-testid="attachment-sidebar"]')).toBeNull();
  });
});
