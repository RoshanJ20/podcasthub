/**
 * Unit tests for the AttachmentViewer component.
 *
 * Verifies PDF document rendering, page navigation controls,
 * download button, attachment selector for multiple PDFs,
 * and empty state handling. Uses mocked react-pdf components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttachmentViewer } from '@/components/audio-player/bulletin-viewer';

// Mock ResizeObserver which is not available in jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

/** Store the onLoadSuccess callback so we can call it manually. */
let capturedOnLoadSuccess: ((data: { numPages: number }) => void) | null = null;

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: ({
    children,
    onLoadSuccess,
  }: {
    children: React.ReactNode;
    onLoadSuccess?: (data: { numPages: number }) => void;
  }) => {
    capturedOnLoadSuccess = onLoadSuccess ?? null;
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>
  ),
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' }, version: '4.0.0' },
}));

beforeEach(() => {
  cleanup();
  capturedOnLoadSuccess = null;
});

/** Helper to simulate PDF load. */
function simulatePdfLoad(numPages: number) {
  act(() => {
    capturedOnLoadSuccess?.({ numPages });
  });
}

describe('AttachmentViewer', () => {
  it('renders the PDF document', () => {
    const { container } = render(<AttachmentViewer urls={['/bulletins/test.pdf']} />);
    expect(container.querySelector('[data-testid="pdf-document"]')).not.toBeNull();
  });

  it('shows page navigation controls after load', () => {
    const { container } = render(<AttachmentViewer urls={['/bulletins/test.pdf']} />);
    simulatePdfLoad(3);
    expect(container.textContent).toContain('1 / 3');
    expect(container.querySelector('button[aria-label="Next page"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Previous page"]')).not.toBeNull();
  });

  it('navigates to next page', async () => {
    const { container } = render(<AttachmentViewer urls={['/bulletins/test.pdf']} />);
    simulatePdfLoad(3);
    const user = userEvent.setup();
    const nextBtn = container.querySelector('button[aria-label="Next page"]')!;
    await user.click(nextBtn);
    expect(container.textContent).toContain('2 / 3');
  });

  it('disables previous button on first page', () => {
    const { container } = render(<AttachmentViewer urls={['/bulletins/test.pdf']} />);
    simulatePdfLoad(3);
    const prevBtn = container.querySelector('button[aria-label="Previous page"]');
    expect(prevBtn).not.toBeNull();
    expect(prevBtn!.hasAttribute('disabled')).toBe(true);
  });

  it('renders download link', () => {
    const { container } = render(<AttachmentViewer urls={['/bulletins/test.pdf']} />);
    const downloadLink = container.querySelector('a[aria-label="Download PDF"]');
    expect(downloadLink).not.toBeNull();
    expect(downloadLink!.getAttribute('href')).toContain('test.pdf');
  });

  it('shows attachment selector when multiple PDFs', () => {
    const { container } = render(
      <AttachmentViewer urls={['/bulletins/a.pdf', '/bulletins/b.pdf']} />
    );
    const select = container.querySelector('select[aria-label="Select attachment"]');
    expect(select).not.toBeNull();
  });

  it('does not show attachment selector for single PDF', () => {
    const { container } = render(<AttachmentViewer urls={['/bulletins/a.pdf']} />);
    const select = container.querySelector('select[aria-label="Select attachment"]');
    expect(select).toBeNull();
  });

  it('shows empty state when no attachment URLs', () => {
    const { container } = render(<AttachmentViewer urls={[]} />);
    expect(container.textContent).toContain('No attachments available.');
  });
});
