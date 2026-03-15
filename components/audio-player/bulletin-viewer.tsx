/**
 * PDF bulletin viewer component using react-pdf.
 *
 * Renders PDF documents inline with page navigation (prev/next),
 * a download link, and a bulletin selector when multiple PDFs
 * are provided. Displays an empty state when no bulletin URLs exist.
 */
'use client';
import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BulletinViewerProps {
  urls: string[];
}

export function BulletinViewer({ urls }: BulletinViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const activeUrl = urls[activeIndex] || '';

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  if (urls.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No bulletins available.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Bulletin selector for multiple PDFs */}
      {urls.length > 1 && (
        <div className="flex gap-2">
          <label htmlFor="bulletin-select" className="sr-only">
            Select bulletin
          </label>
          <select
            id="bulletin-select"
            aria-label="Select bulletin"
            value={activeIndex}
            onChange={(e) => {
              setActiveIndex(Number(e.target.value));
              setCurrentPage(1);
              setNumPages(0);
            }}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {urls.map((_, i) => (
              <option key={i} value={i}>
                Bulletin {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* PDF document */}
      <Document file={activeUrl} onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={currentPage} width={600} />
      </Document>

      {/* Page navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {numPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= numPages}
          onClick={() => setCurrentPage((p) => p + 1)}
          aria-label="Next page"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Download link */}
      <a
        href={activeUrl}
        download
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        aria-label="Download"
      >
        <Download className="h-4 w-4" /> Download PDF
      </a>
    </div>
  );
}
