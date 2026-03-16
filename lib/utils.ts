/**
 * General utility functions for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Provides the `cn()` helper for conditional Tailwind CSS class merging
 *
 * Dependencies:
 * - clsx (class name utility)
 * - tailwind-merge (intelligent Tailwind class deduplication)
 *
 * @example
 * import { cn } from '@/lib/utils';
 * cn('px-4', isActive && 'bg-blue-500', 'text-white');
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
