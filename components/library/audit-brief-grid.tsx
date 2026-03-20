/**
 * Responsive grid layout for displaying audit brief cards.
 *
 * Renders a grid of AuditBriefCard components with responsive column
 * counts. Shows an empty state message when no audit briefs are available.
 */
import { FileAudio } from 'lucide-react';
import { AuditBriefCard } from '@/components/library/audit-brief-card';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';
import type { AuditBriefData } from '@/lib/types';

export interface AuditBriefGridProps {
  auditBriefs: AuditBriefData[];
}

export function AuditBriefGrid({ auditBriefs }: AuditBriefGridProps) {
  if (auditBriefs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
        <FileAudio className="size-12" />
        <p className="text-lg font-medium">No audit briefs found</p>
        <p className="text-sm">Try adjusting your filters or check back later.</p>
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
            description={auditBrief.description}
            domain={auditBrief.domain}
            year={auditBrief.year}
            tags={auditBrief.tags}
            thumbnailUrl={auditBrief.thumbnailUrl}
          />
        </StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}
