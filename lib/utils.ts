/**
 * General utility functions for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Tailwind CSS class merging via cn()
 *
 * @example
 * import { cn } from '@/lib/utils';
 * const className = cn('px-4', isActive && 'bg-blue-500', 'text-white');
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names with conflict resolution.
 *
 * @param inputs - Class values to merge (strings, objects, arrays, or falsy values)
 * @returns Merged class string with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
