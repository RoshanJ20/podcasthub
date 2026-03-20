/**
 * Centralized animation tokens for the Motion library.
 *
 * Aligned with Emil Kowalski's design engineering philosophy:
 * cubic-bezier easing curves over spring physics for most transitions,
 * asymmetric enter/exit durations for perceived snappiness, and a
 * dedicated drawer easing curve for panel/sheet interactions.
 *
 * Key responsibilities:
 * - Define reusable transition configs (timing, easing, spring physics)
 * - Define reusable animation variants (fadeUp, fadeIn, scaleIn, slide)
 * - Provide exit-specific variants for faster dismissal animations
 * - Provide reduced-motion-aware transition getter
 *
 * Usage:
 *   import { transitions, variants, getTransition } from '@/lib/animation';
 *   <motion.div variants={variants.fadeUp} transition={getTransition('normal')} />
 */

export const transitions = {
  /** Snappy enter — ease-out curve for fast, natural deceleration. */
  fast: { duration: 0.15, ease: [0.23, 1, 0.32, 1] as const },
  /** Standard enter — ease-out curve at a comfortable pace. */
  normal: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const },
  /** Relaxed enter — ease-out curve for larger, more deliberate elements. */
  slow: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as const },
  /** Emphasis enter — ease-in-out for elements that need symmetric weight. */
  emphasis: { duration: 0.25, ease: [0.77, 0, 0.175, 1] as const },
  /** Stiffer than normal/slow — intentionally snappier for panel resize feel. */
  panelSlide: { type: 'spring' as const, stiffness: 200, damping: 25, mass: 1 },
  /** Fast exit — shorter than enter for snappy dismissal. */
  exitFast: { duration: 0.1, ease: [0.23, 1, 0.32, 1] as const },
  /** Normal exit — faster than normal enter. */
  exitNormal: { duration: 0.15, ease: [0.23, 1, 0.32, 1] as const },
  /** Drawer/sheet-specific easing curve. */
  drawer: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as const },
} as const;

/** Zero-duration transition used when the user prefers reduced motion. */
const REDUCED_MOTION_TRANSITION = { duration: 0 } as const;

export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    /** Exits with a smaller y offset than entry — faster dismissal feels snappier. */
    exit: { opacity: 0, y: 8 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    /** Subtler scale than entry — exit collapses less aggressively. */
    exit: { opacity: 0, scale: 0.97 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    /** Less travel than entry offset — exit feels lighter. */
    exit: { opacity: 0, x: -12 },
  },
  slideRight: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 12 },
  },
  /** Slide in from left with larger offset — for page sections. */
  slideInFromLeft: {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
  },
  /** Mercury fog/diffusion — content starts blurred and resolves into clarity. */
  mercuryFade: {
    hidden: { opacity: 0, y: 8, filter: 'blur(4px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
    /** Exit with lighter blur — half the entry blur for a softer dismissal. */
    exit: { opacity: 0, y: 4, filter: 'blur(2px)' },
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
