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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';

interface CategoryGridProps {
  /** Domain names paired with their podcast counts. */
  domains: { name: string; count: number }[];
}

/**
 * Renders domain category cards with a staggered entrance animation.
 *
 * @param domains - Array of domain objects with name and podcast count.
 * @returns An animated grid of domain cards linking to filtered bulletin pages.
 */
export function CategoryGrid({ domains }: CategoryGridProps) {
  return (
    <StaggeredGrid className="grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {domains.map(({ name, count }) => (
        <StaggeredGridItem key={name}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={`/bulletins?domain=${encodeURIComponent(name)}` as any}>
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle>{name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">
                  {`${count} ${count === 1 ? 'podcast' : 'podcasts'}`}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        </StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}
