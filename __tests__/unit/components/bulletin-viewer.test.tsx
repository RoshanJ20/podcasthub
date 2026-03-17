/**
 * Unit tests for the rewritten BulletinViewer component.
 *
 * Verifies virtualized PDF rendering with all pages scrollable,
 * toolbar with filename/page indicator/download/close button,
 * and loading/empty states. Uses mocked react-pdf and react-virtual.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulletinViewer } from '@/components/audio-player/bulletin-viewer';

class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(_target: Element) {
    this.callback(
      [{ contentRect: { width: 600 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

let capturedOnLoadSuccess: ((data: { numPages: number }) => void) | null = null;

let pdfLoaded = false;

vi.mock('react-pdf', () => ({
  Document: ({
    children,
    onLoadSuccess,
    loading,
  }: {
    children: React.ReactNode;
    onLoadSuccess?: (data: { numPages: number }) => void;
    loading?: React.ReactNode;
  }) => {
    capturedOnLoadSuccess = onLoadSuccess ?? null;
    return <div data-testid="pdf-document">{pdfLoaded ? children : loading}</div>;
  },
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid={`pdf-page-${pageNumber}`} style={{ height: 800 }}>
      Page {pageNumber}
    </div>
  ),
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' }, version: '4.0.0' },
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        key: i,
        start: i * 800,
        size: 800,
      })),
    getTotalSize: () => count * 800,
    measureElement: vi.fn(),
  }),
}));

function simulatePdfLoad(numPages: number) {
  pdfLoaded = true;
  act(() => {
    capturedOnLoadSuccess?.({ numPages });
  });
}

beforeEach(() => {
  cleanup();
  capturedOnLoadSuccess = null;
  pdfLoaded = false;
});

describe('BulletinViewer', () => {
  it('renders the PDF document', () => {
    const { container } = render(<BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />);
    expect(container.querySelector('[data-testid="pdf-document"]')).not.toBeNull();
  });

  it('renders all pages in scrollable container after load', () => {
    const { container } = render(<BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />);
    simulatePdfLoad(5);
    for (let i = 1; i <= 5; i++) {
      expect(container.querySelector(`[data-testid="pdf-page-${i}"]`)).not.toBeNull();
    }
  });

  it('does NOT render page navigation buttons', () => {
    const { container } = render(<BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />);
    simulatePdfLoad(3);
    expect(container.querySelector('button[aria-label="Next page"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Previous page"]')).toBeNull();
  });

  it('renders close button that calls onClose', async () => {
    const onClose = vi.fn();
    const { container } = render(<BulletinViewer url="/bulletins/test.pdf" onClose={onClose} />);
    const user = userEvent.setup();
    const closeBtn = container.querySelector('button[aria-label="Close PDF viewer"]')!;
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders download link', () => {
    const { container } = render(<BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />);
    const downloadLink = container.querySelector('a[aria-label="Download PDF"]');
    expect(downloadLink).not.toBeNull();
  });

  it('displays filename in toolbar', () => {
    const { container } = render(
      <BulletinViewer url="/bulletins/Q3-Bulletin.pdf" onClose={vi.fn()} filename="Q3 Bulletin" />
    );
    expect(container.textContent).toContain('Q3 Bulletin');
  });

  it('shows page count after load', () => {
    const { container } = render(<BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />);
    simulatePdfLoad(12);
    expect(container.textContent).toContain('12');
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<BulletinViewer url="/bulletins/test.pdf" onClose={onClose} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows loading skeleton before PDF loads', () => {
    const { container } = render(<BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });
});
