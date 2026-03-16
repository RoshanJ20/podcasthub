/**
 * PageTransition — wraps page content with a fade + slide-up entrance animation.
 *
 * Key responsibilities:
 * - Use the current pathname as the Motion key so that navigating to a new
 *   route triggers a fresh entrance animation.
 * - Apply the shared `fadeUp` variant and `slow` transition from the animation
 *   token library for a subtle, premium feel.
 * - Fall back to a plain div when the user prefers reduced motion.
 *
 * Dependencies:
 * - motion/react — motion.
 * - next/navigation — usePathname for keying the animation on route changes.
 * - lib/animation — variants, transitions tokens.
 * - hooks/use-reduced-motion — OS-level motion preference.
 *
 * Usage:
 *   // In a layout component:
 *   <PageTransition className="flex-1 overflow-y-auto">
 *     {children}
 *   </PageTransition>
 */
'use client';

import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { transitions, variants } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface PageTransitionProps {
  /** Page content to animate. */
  children: React.ReactNode;
  /** Additional classes applied to the wrapper element. */
  className?: string;
}

/**
 * Wraps page content with a fade + slide-up animation keyed on the current
 * pathname, so each navigation produces a fresh entrance.
 *
 * The animation is suppressed entirely when the user prefers reduced motion,
 * rendering a plain div in that case.
 *
 * @param children - Content to render inside the transition wrapper.
 * @param className - Optional class applied to the wrapper element.
 * @returns A Motion div that animates on pathname changes, or a plain div.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      initial="hidden"
      animate="visible"
      variants={variants.fadeUp}
      transition={transitions.slow}
      className={className}
    >
      {children}
    </motion.div>
  );
}
