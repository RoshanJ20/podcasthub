/**
 * AnimatedSkeleton — crossfades between a skeleton placeholder and real content.
 *
 * Key responsibilities:
 * - Wrap AnimatePresence so that the skeleton fades out and the content fades
 *   in whenever `isLoading` transitions from true to false.
 * - Keep the API minimal: callers provide the loading state, the skeleton node,
 *   and the real content node.
 * - Fall back to instant switching when the user prefers reduced motion.
 *
 * Dependencies:
 * - motion/react — AnimatePresence, motion.
 * - hooks/use-reduced-motion — OS-level motion preference.
 *
 * Usage:
 *   <AnimatedSkeleton
 *     isLoading={isPending}
 *     skeleton={<Skeleton className="h-24 w-full" />}
 *   >
 *     <AuditBriefCard auditBrief={data} />
 *   </AnimatedSkeleton>
 */
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface AnimatedSkeletonProps {
  /** When true, the skeleton is shown; when false, the real content appears. */
  isLoading: boolean;
  /** Skeleton placeholder node (e.g. `<Skeleton className="..." />`). */
  skeleton: React.ReactNode;
  /** Real content rendered once loading completes. */
  children: React.ReactNode;
  /** Optional class applied to the outer wrapper div. */
  className?: string;
}

/**
 * Crossfades between a loading skeleton and real content using AnimatePresence.
 *
 * The transition uses `mode="wait"` so the skeleton fully exits before the
 * content enters, preventing layout overlap during the crossfade.
 *
 * @param isLoading - Controls which node is currently shown.
 * @param skeleton - Skeleton placeholder shown while loading.
 * @param children - Content shown after loading completes.
 * @param className - Optional wrapper class.
 * @returns A container that crossfades skeleton ↔ content.
 */
export function AnimatedSkeleton({
  isLoading,
  skeleton,
  children,
  className,
}: AnimatedSkeletonProps) {
  const reducedMotion = useReducedMotion();

  // Skip animation entirely for users who prefer reduced motion.
  if (reducedMotion) {
    return <div className={className}>{isLoading ? skeleton : children}</div>;
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          // Skeleton exits quickly to avoid prolonged absence of content cues.
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {skeleton}
          </motion.div>
        ) : (
          // Content fades in slightly slower so the eye can settle.
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
