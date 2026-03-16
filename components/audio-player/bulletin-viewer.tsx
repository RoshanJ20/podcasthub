/**
 * PDF attachment viewer component using react-pdf.
 *
 * Renders PDF documents inline with a toolbar (page nav, download, selector)
 * always visible above a scrollable PDF container.
 */
'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { resolveStorageUrl } from '@/lib/storage-url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface AttachmentViewerProps {
  urls: string[];
}

export function AttachmentViewer({ urls }: AttachmentViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeUrl = urls[activeIndex] || '';

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (urls.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No attachments available.</p>;
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Toolbar — always visible */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/50 p-2">
        <div className="flex items-center gap-2">
          {/* Attachment selector */}
          {urls.length > 1 && (
            <select
              aria-label="Select attachment"
              value={activeIndex}
              onChange={(e) => {
                setActiveIndex(Number(e.target.value));
                setCurrentPage(1);
                setNumPages(0);
              }}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            >
              {urls.map((_, i) => (
                <option key={i} value={i}>
                  Attachment {i + 1}
                </option>
              ))}
            </select>
          )}

          {/* Page navigation */}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm whitespace-nowrap">
            {currentPage} / {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Download */}
        <a
          href={resolveStorageUrl(activeUrl)}
          download
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          aria-label="Download PDF"
        >
          <Download className="h-4 w-4" /> Download
        </a>
      </div>

      {/* PDF in scrollable container */}
      <div className="overflow-auto rounded-lg border" style={{ maxHeight: '70vh' }}>
        <Document file={resolveStorageUrl(activeUrl)} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={currentPage} width={containerWidth ? containerWidth - 2 : undefined} />
        </Document>
      </div>
    </div>
  );
}
