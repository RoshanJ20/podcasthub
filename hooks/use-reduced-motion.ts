/**
 * Hook to detect the user's reduced motion preference via the
 * `prefers-reduced-motion` CSS media query.
 *
 * Key responsibilities:
 * - Subscribe to the OS-level reduced-motion preference.
 * - Return the current preference as a boolean.
 * - Clean up the media query listener on unmount.
 *
 * Usage:
 *   const prefersReducedMotion = useReducedMotion();
 *   const transition = getTransition('normal', prefersReducedMotion);
 */
'use client';

import { useState, useEffect } from 'react';

/** The media query string for the reduced-motion preference. */
const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Returns `true` when the user's OS or browser is configured to prefer
 * reduced motion, `false` otherwise.
 *
 * The value is reactive: if the user changes their preference while the
 * component is mounted, the hook will re-render with the updated value.
 *
 * @returns Whether the user prefers reduced motion.
 */
/**
 * Reads the current media query match result outside of the React render
 * cycle so it can be used as the initial useState value, avoiding a
 * synchronous setState call inside a useEffect body.
 */
function getInitialPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
