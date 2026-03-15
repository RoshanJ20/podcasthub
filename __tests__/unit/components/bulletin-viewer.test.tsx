/**
 * Unit tests for the BulletinViewer component.
 *
 * Verifies PDF document rendering, page navigation controls,
 * download button, bulletin selector for multiple PDFs,
 * and empty state handling. Uses mocked react-pdf components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulletinViewer } from '@/components/audio-player/bulletin-viewer';

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

describe('BulletinViewer', () => {
  it('renders the PDF document', () => {
    const { container } = render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
    expect(container.querySelector('[data-testid="pdf-document"]')).not.toBeNull();
  });

  it('shows page navigation controls after load', () => {
    const { container } = render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
    simulatePdfLoad(3);
    expect(container.textContent).toContain('Page 1 of 3');
    expect(container.querySelector('button[aria-label="Next page"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Previous page"]')).not.toBeNull();
  });

  it('navigates to next page', async () => {
    const { container } = render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
    simulatePdfLoad(3);
    const user = userEvent.setup();
    const nextBtn = container.querySelector('button[aria-label="Next page"]')!;
    await user.click(nextBtn);
    expect(container.textContent).toContain('Page 2 of 3');
  });

  it('disables previous button on first page', () => {
    const { container } = render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
    simulatePdfLoad(3);
    const prevBtn = container.querySelector('button[aria-label="Previous page"]');
    expect(prevBtn).not.toBeNull();
    expect(prevBtn!.hasAttribute('disabled')).toBe(true);
  });

  it('renders download link', () => {
    const { container } = render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
    const downloadLink = container.querySelector('a[aria-label="Download"]');
    expect(downloadLink).not.toBeNull();
    expect(downloadLink!.getAttribute('href')).toBe('/bulletins/test.pdf');
  });

  it('shows bulletin selector when multiple PDFs', () => {
    const { container } = render(
      <BulletinViewer urls={['/bulletins/a.pdf', '/bulletins/b.pdf']} />
    );
    const select = container.querySelector('select[aria-label="Select bulletin"]');
    expect(select).not.toBeNull();
  });

  it('does not show bulletin selector for single PDF', () => {
    const { container } = render(<BulletinViewer urls={['/bulletins/a.pdf']} />);
    const select = container.querySelector('select[aria-label="Select bulletin"]');
    expect(select).toBeNull();
  });

  it('shows empty state when no bulletin URLs', () => {
    const { container } = render(<BulletinViewer urls={[]} />);
    expect(container.textContent).toContain('No bulletins available.');
  });
});
