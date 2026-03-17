/**
 * Centralized animation tokens for the Motion library.
 *
 * Key responsibilities:
 * - Define reusable transition configs (timing, easing, spring physics)
 * - Define reusable animation variants (fadeUp, fadeIn, scaleIn, slide)
 * - Provide reduced-motion-aware transition getter
 *
 * Usage:
 *   import { transitions, variants, getTransition } from '@/lib/animation';
 *   <motion.div variants={variants.fadeUp} transition={getTransition('normal')} />
 */

export const transitions = {
  fast: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
  normal: { type: 'spring' as const, stiffness: 80, damping: 10, mass: 1 },
  slow: { type: 'spring' as const, stiffness: 60, damping: 12, mass: 1 },
  emphasis: { type: 'spring' as const, stiffness: 50, damping: 8, mass: 1 },
} as const;

/** Zero-duration transition used when the user prefers reduced motion. */
const REDUCED_MOTION_TRANSITION = { duration: 0 } as const;

export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },
  /** Slide in from left with larger offset — for page sections. */
  slideInFromLeft: {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },
  /** Mercury fog/diffusion — content starts blurred and resolves into clarity. */
  mercuryFade: {
    hidden: { opacity: 0, y: 8, filter: 'blur(4px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
  },
} as const;

/**
 * Stagger container variant for animating lists of children.
 *
 * Each child's animation is staggered by 40ms to create a cascading effect.
 */
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
} as const;

/**
 * Section-level stagger for larger content blocks (metadata, player, tabs).
 *
 * Slower than grid stagger (80ms vs 40ms) with a 100ms initial delay,
 * giving each section room to breathe as it enters.
 */
export const sectionStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

/**
 * Returns the named transition config, or a zero-duration transition when
 * the user has indicated they prefer reduced motion.
 *
 * @param name - Key from the `transitions` map.
 * @param reducedMotion - Whether to suppress animation. Defaults to false.
 * @returns The transition object to pass to a Motion component.
 */
export function getTransition(name: keyof typeof transitions, reducedMotion = false) {
  if (reducedMotion) return REDUCED_MOTION_TRANSITION;
  return transitions[name];
}
