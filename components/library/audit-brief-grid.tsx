/**
 * Responsive grid layout for displaying audit brief cards with favorites.
 *
 * Renders a grid of AuditBriefCard components with responsive column
 * counts. Integrates the useFavorites hook so each card can display and
 * toggle its favorite state. Shows a context-aware empty state when no
 * briefs match (different copy for "no filters", "domain filter", and
 * "search query" cases).
 *
 * Dependencies:
 * - hooks/use-favorites for per-user favorite state
 * - next/navigation for reading current search params (empty-state context)
 */
'use client';

import Link from 'next/link';
import { FileAudio } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AuditBriefCard } from '@/components/library/audit-brief-card';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';
import { useFavorites } from '@/hooks/use-favorites';
import type { AuditBriefData } from '@/lib/types';

export interface AuditBriefGridProps {
  auditBriefs: AuditBriefData[];
}

export function AuditBriefGrid({ auditBriefs }: AuditBriefGridProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain');
  const query = searchParams.get('q')?.trim();
  const showFavorites = searchParams.get('favorites') === 'true';

  if (auditBriefs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
        <FileAudio className="size-10 opacity-60" />
        {query ? (
          <>
            <p className="text-lg font-medium text-foreground">
              No briefs match &ldquo;{query}&rdquo;
            </p>
            <p className="max-w-sm text-sm">
              Try{' '}
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                className="font-medium text-link underline-offset-4 hover:underline"
              >
                semantic search
              </Link>{' '}
              to find related topics instead.
            </p>
          </>
        ) : domain ? (
          <>
            <p className="text-lg font-medium text-foreground">No briefs in {domain} yet</p>
            <p className="max-w-sm text-sm">
              Try a different domain or{' '}
              <Link
                href="/bulletins"
                className="font-medium text-link underline-offset-4 hover:underline"
              >
                clear filters
              </Link>
              .
            </p>
          </>
        ) : showFavorites ? (
          <>
            <p className="text-lg font-medium text-foreground">No favorites yet</p>
            <p className="max-w-sm text-sm">
              Tap the heart on any brief to save it here for later.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium text-foreground">Nothing here yet</p>
            <p className="max-w-sm text-sm">
              New briefs are added weekly. Check Methodology or Quality and Risk for the latest.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <StaggeredGrid className="grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {auditBriefs.map((auditBrief) => (
        <StaggeredGridItem key={auditBrief.id}>
          <AuditBriefCard
            id={auditBrief.id}
            title={auditBrief.title}
            domain={auditBrief.domain}
            year={auditBrief.year}
            tags={auditBrief.tags}
            thumbnailUrl={auditBrief.thumbnailUrl}
            isFavorite={isFavorite(auditBrief.id)}
            onToggleFavorite={() => toggleFavorite(auditBrief.id)}
          />
        </StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}
