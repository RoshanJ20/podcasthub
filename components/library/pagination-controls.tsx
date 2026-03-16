/**
 * Client-side pagination controls for the library page.
 *
 * Renders Previous/Next buttons and a "Page X of Y" indicator.
 * Navigation is handled by updating URL search params, which
 * triggers a Server Component re-render.
 */
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationControlsProps {
  page: number;
  totalPages: number;
}

export function PaginationControls({ page, totalPages }: PaginationControlsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const navigate = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(newPage));
      }
      const qs = params.toString();
      router.push(qs ? `?${qs}` : '?');
    },
    [searchParams, router]
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 pt-8">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => navigate(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => navigate(page + 1)}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
