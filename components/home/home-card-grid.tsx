/**
 * Animated grid wrapper for HomeCard items on the home page.
 *
 * Client component that uses StaggeredGrid to provide cascading
 * entrance animation for card lists. Renders a single-column
 * stacked layout with staggered fade-up animation.
 *
 * Dependencies:
 * - components/ui/staggered-grid for animation primitives
 */
'use client';

import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';
import React from 'react';

interface HomeCardGridProps {
  /** HomeCard elements to render with staggered animation. */
  children: React.ReactNode;
}

/**
 * Wraps children in a staggered animation grid (single column).
 *
 * @param children - HomeCard elements.
 * @returns An animated single-column grid of cards.
 */
export function HomeCardGrid({ children }: HomeCardGridProps) {
  return (
    <StaggeredGrid className="grid-cols-1 gap-3">
      {React.Children.map(children, (child) => (
        <StaggeredGridItem>{child}</StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}
