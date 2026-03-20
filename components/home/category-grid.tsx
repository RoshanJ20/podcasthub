/**
 * CategoryGrid — animated domain category grid for the Home page.
 *
 * Key responsibilities:
 * - Render a staggered animated grid of domain category cards.
 * - Each card links to the filtered bulletins page for that domain.
 * - Falls back to a static grid when reduced motion is preferred.
 *
 * Dependencies:
 * - StaggeredGrid / StaggeredGridItem for cascading entrance animation.
 * - next/link, shadcn Card, Badge.
 */
'use client';

import Link from 'next/link';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';

interface CategoryGridProps {
  /** Domain names paired with their audit brief counts. */
  domains: { name: string; count: number }[];
}

/**
 * Renders domain category cards with a staggered entrance animation.
 *
 * @param domains - Array of domain objects with name and audit brief count.
 * @returns An animated grid of domain cards linking to filtered bulletin pages.
 */
export function CategoryGrid({ domains }: CategoryGridProps) {
  return (
    <StaggeredGrid className="grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {domains.map(({ name, count }) => (
        <StaggeredGridItem key={name}>
          {/* WORKAROUND: Next.js App Router typed routes don't support dynamic segments — safe to cast */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={`/bulletins?domain=${encodeURIComponent(name)}` as any}>
            <div className="rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:bg-secondary/30">
              <p className="text-sm font-medium">{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {`${count} ${count === 1 ? 'auditBrief' : 'auditBriefs'}`}
              </p>
            </div>
          </Link>
        </StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}
