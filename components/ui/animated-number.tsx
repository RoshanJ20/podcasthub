/**
 * AnimatedNumber — smoothly animates a numeric value using a spring physics model.
 *
 * Key responsibilities:
 * - Drive a DOM span's text content via Motion's useSpring to avoid React re-renders
 *   on every animation frame.
 * - Accept an optional formatter so callers can control locale, currency, decimals, etc.
 * - Fall back to a static span when the user prefers reduced motion.
 *
 * Dependencies:
 * - motion/react — useSpring, useMotionValue.
 * - hooks/use-reduced-motion — OS-level motion preference.
 *
 * Usage:
 *   <AnimatedNumber value={totalListeners} formatter={(n) => n.toLocaleString()} />
 *   <AnimatedNumber value={95.7} formatter={(n) => `${n.toFixed(1)}%`} />
 */
'use client';

import { useEffect, useRef } from 'react';
import { useSpring, useMotionValue } from 'motion/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface AnimatedNumberProps {
  /** The target numeric value to animate toward. */
  value: number;
  /** Additional classes applied to the <span> element. */
  className?: string;
  /**
   * Optional formatter applied to the interpolated value on every frame.
   * Defaults to rounding to the nearest integer.
   *
   * @param value - The current interpolated number.
   * @returns The string to display.
   */
  formatter?: (value: number) => string;
}

/**
 * Renders a numeric value that animates smoothly from its previous state to
 * the new `value` prop using spring physics.
 *
 * The animation runs outside React's render cycle (via a Motion subscription)
 * to avoid per-frame state updates and the associated re-render cost.
 *
 * @param value - The numeric target value.
 * @param className - Optional class name for the span element.
 * @param formatter - Optional formatter for the displayed number.
 * @returns A span whose text content animates to the target value.
 */
export function AnimatedNumber({
  value,
  className,
  formatter = (n) => Math.round(n).toString(),
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  // motionValue drives the spring; springValue is what we subscribe to.
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 80, damping: 20 });

  // Update the motion value whenever the target changes.
  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  // Write the formatted interpolated value directly to the DOM on each frame.
  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = formatter(latest);
      }
    });
    return unsubscribe;
  }, [springValue, formatter]);

  // In reduced-motion mode, skip animation entirely.
  if (reducedMotion) {
    return <span className={className}>{formatter(value)}</span>;
  }

  return (
    <span ref={ref} className={className}>
      {formatter(0)}
    </span>
  );
}
