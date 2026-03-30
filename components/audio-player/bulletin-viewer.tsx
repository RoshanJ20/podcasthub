/**
 * Virtualized PDF viewer for the slide-in attachment panel.
 *
 * Renders all pages of a PDF in a scrollable container using
 * @tanstack/react-virtual to virtualize rendering (only visible
 * pages + 1-page buffer are in the DOM). Includes a toolbar with
 * filename, page indicator, download, and close button.
 *
 * Dependencies:
 * - react-pdf for PDF rendering (Document + Page components)
 * - @tanstack/react-virtual for scroll virtualization
 * - motion/react for mercury fade entrance animation
 * - lib/animation for variant/transition tokens
 * - lib/storage-url for resolving storage keys to URLs
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { variants, getTransition } from '@/lib/animation';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { resolveStorageUrl } from '@/lib/storage-url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** Estimated height for each PDF page before measurement. */
const ESTIMATED_PAGE_HEIGHT = 800;

/** Represents a selectable attachment in the toolbar dropdown. */
interface AttachmentOption {
  url: string;
  name: string;
}

interface BulletinViewerProps {
  /** Single PDF URL (raw storage key — resolved internally). */
  url: string;
  /** Display name for the toolbar. */
  filename?: string;
  /** Called when the user clicks the close button or presses Escape. */
  onClose: () => void;
  /** List of all attachments for the dropdown selector. */
  attachments?: AttachmentOption[];
  /** Called when the user selects a different attachment from the dropdown. */
  onSelectAttachment?: (url: string) => void;
}

/**
 * Virtualized PDF viewer with toolbar.
 *
 * Renders all pages in a scrollable container, virtualizing to only
 * mount visible pages + a 1-page buffer above/below.
 *
 * @param props.url - Single PDF URL (storage key resolved internally).
 * @param props.filename - Optional display name shown in toolbar.
 * @param props.onClose - Callback fired on close button click or Escape key.
 * @returns The BulletinViewer React element.
 */
export function BulletinViewer({
  url,
  filename,
  onClose,
  attachments,
  onSelectAttachment,
}: BulletinViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const resolvedUrl = resolveStorageUrl(url);
  const Wrapper = reducedMotion ? 'div' : motion.div;
  const wrapperProps = reducedMotion
    ? {}
    : {
        initial: 'hidden' as const,
        animate: 'visible' as const,
        variants: variants.mercuryFade,
        transition: getTransition('slow'),
      };

  /** Store numPages when react-pdf finishes loading the document. */
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  /**
   * Track container width via ResizeObserver for responsive page sizing.
   *
   * Uses requestAnimationFrame to batch updates and skips the first 350ms
   * after mount so the drawer slide-in animation can settle before the PDF
   * re-renders with the final width. This prevents the jitter caused by
   * width changes during the mercuryFade + panel transition.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const mountTime = Date.now();
    const SETTLE_DELAY_MS = 350;

    const observer = new ResizeObserver((entries) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const elapsed = Date.now() - mountTime;
        if (elapsed < SETTLE_DELAY_MS) return;
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
    });

    // Measure initial width after the animation settles
    const initialTimer = setTimeout(() => {
      if (el) setContainerWidth(el.clientWidth);
    }, SETTLE_DELAY_MS);

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(initialTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  /* Close viewer when user presses the Escape key. */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer returns non-memoizable functions by design; safe here as virtualizer is only used within this component
  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_PAGE_HEIGHT,
    overscan: 1,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const currentVisiblePage = virtualItems.length > 0 ? virtualItems[0].index + 1 : 0;

  return (
    <Wrapper ref={containerRef} className="flex h-full flex-col" {...wrapperProps}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* File selector dropdown or static filename */}
          {attachments && attachments.length > 1 && onSelectAttachment ? (
            <select
              aria-label="Select attachment"
              value={url}
              onChange={(e) => onSelectAttachment(e.target.value)}
              className="max-w-[200px] truncate rounded-md border bg-background px-2 py-1 text-sm font-medium"
            >
              {attachments.map((att) => (
                <option key={att.url} value={att.url}>
                  {att.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="truncate text-sm font-medium">{filename ?? 'PDF'}</span>
          )}
          {numPages > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Page {currentVisiblePage} / {numPages}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <a
            href={resolvedUrl}
            download
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors duration-150 hover:bg-muted"
            aria-label="Download PDF"
          >
            <Download className="h-4 w-4" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close PDF viewer"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable PDF container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-muted/30">
        <Document
          file={resolvedUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="mx-auto max-w-lg animate-pulse space-y-5 p-10">
              {/* Title */}
              <div className="space-y-3">
                <div className="h-7 w-3/4 rounded-md bg-muted-foreground/15" />
                <div className="h-5 w-1/2 rounded-md bg-muted-foreground/10" />
              </div>
              {/* Paragraph */}
              <div className="space-y-2.5">
                <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
                <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
                <div className="h-3.5 w-5/6 rounded bg-muted-foreground/10" />
                <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
                <div className="h-3.5 w-4/6 rounded bg-muted-foreground/10" />
              </div>
              {/* Image block */}
              <div className="h-44 w-full rounded-xl bg-muted-foreground/8" />
              {/* More text */}
              <div className="space-y-2.5">
                <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
                <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
                <div className="h-3.5 w-3/4 rounded bg-muted-foreground/10" />
              </div>
              {/* Table rows */}
              <div className="space-y-2">
                <div className="h-10 w-full rounded-lg bg-muted-foreground/8" />
                <div className="h-10 w-full rounded-lg bg-muted-foreground/5" />
                <div className="h-10 w-full rounded-lg bg-muted-foreground/8" />
                <div className="h-10 w-full rounded-lg bg-muted-foreground/5" />
              </div>
            </div>
          }
        >
          {numPages > 0 && (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map((virtualItem) => (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Page
                    pageNumber={virtualItem.index + 1}
                    width={containerWidth - 32}
                    className="mx-auto"
                  />
                </div>
              ))}
            </div>
          )}
        </Document>
      </div>
    </Wrapper>
  );
}
