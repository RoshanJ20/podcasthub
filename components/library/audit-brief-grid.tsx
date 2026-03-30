/**
 * Responsive grid layout for displaying audit brief cards with favorites.
 *
 * Renders a grid of AuditBriefCard components with responsive column
 * counts. Integrates the useFavorites hook so each card can display and
 * toggle its favorite state. Shows an empty state when no briefs match.
 *
 * Dependencies:
 * - hooks/use-favorites for per-user favorite state
 */
'use client';

import { FileAudio } from 'lucide-react';
import { AuditBriefCard } from '@/components/library/audit-brief-card';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';
import { useFavorites } from '@/hooks/use-favorites';
import type { AuditBriefData } from '@/lib/types';

export interface AuditBriefGridProps {
  auditBriefs: AuditBriefData[];
}

export function AuditBriefGrid({ auditBriefs }: AuditBriefGridProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (auditBriefs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border p-16 text-muted-foreground">
        <FileAudio className="size-12 text-primary/80" />
        <p className="text-lg font-medium text-primary-text">No audit briefs found</p>
        <p className="text-sm">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <StaggeredGrid className="auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {auditBriefs.map((auditBrief) => (
        <StaggeredGridItem key={auditBrief.id}>
          <AuditBriefCard
            id={auditBrief.id}
            title={auditBrief.title}
            description={auditBrief.description}
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
