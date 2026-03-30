/**
 * Client wrapper for home page audit brief cards with favorites support.
 *
 * Provides the useFavorites hook context so each HomeCard can display
 * and toggle its favorite state via a heart button.
 *
 * Dependencies:
 * - hooks/use-favorites for per-user favorite state
 * - components/home/home-card for card rendering
 * - components/home/home-card-grid for staggered animation
 */
'use client';

import { HomeCard } from '@/components/home/home-card';
import { HomeCardGrid } from '@/components/home/home-card-grid';
import { useFavorites } from '@/hooks/use-favorites';

interface AuditBriefItem {
  id: string;
  title: string;
  description: string | null;
  domain: string;
  year: number;
  tags: string[];
}

interface HomeAuditBriefListProps {
  /** Audit briefs to render as home cards. */
  auditBriefs: AuditBriefItem[];
}

/**
 * Renders a list of audit brief HomeCards with per-user favorites.
 *
 * @param auditBriefs - Array of audit brief data to display.
 * @returns A HomeCardGrid of audit brief cards with favorite buttons.
 */
export function HomeAuditBriefList({ auditBriefs }: HomeAuditBriefListProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (auditBriefs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No technical content yet.
      </p>
    );
  }

  return (
    <HomeCardGrid>
      {auditBriefs.map((p) => (
        <HomeCard
          key={p.id}
          variant="auditBrief"
          id={p.id}
          title={p.title}
          description={p.description}
          domain={p.domain}
          year={p.year}
          tags={p.tags}
          isFavorite={isFavorite(p.id)}
          onToggleFavorite={() => toggleFavorite(p.id)}
        />
      ))}
    </HomeCardGrid>
  );
}
