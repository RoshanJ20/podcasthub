/**
 * Animated wrapper for the login and register page card containers.
 *
 * Key responsibilities:
 * - Provide a scale-in entrance animation for auth page content.
 * - Respect the user's reduced-motion preference via useReducedMotion.
 *
 * Dependencies:
 * - motion/react for animation primitives.
 * - @/lib/animation for shared variant and transition tokens.
 * - @/hooks/use-reduced-motion for the OS-level motion preference.
 */
'use client';

import { motion } from 'motion/react';
import { variants, transitions } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface LoginPageCardProps {
  /** Page content to render inside the animated wrapper. */
  children: React.ReactNode;
}

/**
 * Wraps auth page content in a scale-in motion animation.
 *
 * Falls back to a plain div when the user prefers reduced motion.
 *
 * @param children - The auth page content (heading, form, footer links).
 * @returns An animated wrapper div with scale-in entrance.
 */
export function LoginPageCard({ children }: LoginPageCardProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className="w-full max-w-md space-y-8 p-8">{children}</div>;
  }

  return (
    <motion.div
      className="w-full max-w-md space-y-8 p-8"
      initial="hidden"
      animate="visible"
      variants={variants.scaleIn}
      transition={transitions.normal}
    >
      {children}
    </motion.div>
  );
}
