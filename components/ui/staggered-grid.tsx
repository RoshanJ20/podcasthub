/**
 * StaggeredGrid — animated grid container with cascading child reveal.
 *
 * Key responsibilities:
 * - Wrap grid children in a Motion container that staggers their entrance.
 * - Provide a `StaggeredGridItem` wrapper that applies the fadeUp variant.
 * - Fall back to a plain <div> grid when the user prefers reduced motion.
 *
 * Dependencies:
 * - motion/react for animation primitives.
 * - lib/animation for shared tokens (staggerContainer, variants, transitions).
 * - hooks/use-reduced-motion for the OS-level motion preference.
 *
 * Usage:
 *   <StaggeredGrid className="grid-cols-3 gap-4">
 *     {items.map(item => (
 *       <StaggeredGridItem key={item.id}>
 *         <Card>{item.title}</Card>
 *       </StaggeredGridItem>
 *     ))}
 *   </StaggeredGrid>
 */
'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { staggerContainer, variants, transitions } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface StaggeredGridProps {
  /** Grid children, typically a list of `StaggeredGridItem` elements. */
  children: React.ReactNode;
  /** Additional Tailwind classes applied to the grid wrapper (e.g. `grid-cols-3 gap-4`). */
  className?: string;
}

/**
 * Animated grid container that staggers the entrance of its children.
 *
 * Renders a Motion div with the `staggerContainer` variant when the user has
 * no reduced-motion preference, or a plain div otherwise.
 *
 * @param children - Grid child nodes, typically `StaggeredGridItem` elements.
 * @param className - Additional classes merged onto the wrapper element.
 * @returns A grid wrapper with or without stagger animation.
 */
export function StaggeredGrid({ children, className }: StaggeredGridProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={cn('grid', className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn('grid', className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

interface StaggeredGridItemProps {
  /** Content to render inside the animated grid cell. */
  children: React.ReactNode;
  /** Additional classes applied to the Motion wrapper. */
  className?: string;
}

/**
 * Animated wrapper for a single grid cell inside `StaggeredGrid`.
 *
 * Applies the `fadeUp` variant so the child slides up and fades in when the
 * parent stagger container triggers its children.
 *
 * @param children - Cell content.
 * @param className - Additional classes applied to the wrapper.
 * @returns A Motion div that participates in the parent stagger animation.
 */
export function StaggeredGridItem({ children, className }: StaggeredGridItemProps) {
  return (
    <motion.div className={cn('h-full', className)} variants={variants.fadeUp} transition={transitions.normal}>
      {children}
    </motion.div>
  );
}
