/**
 * Time formatting utility for The Audit Brief.
 *
 * Key responsibilities:
 * - Converts seconds to human-readable time strings (MM:SS or HH:MM:SS)
 * - Used across audio player, bookmarks, search results, and progress components
 *
 * @example
 * import { formatTime } from '@/lib/format-time';
 * formatTime(125); // "2:05"
 * formatTime(3661); // "1:01:01"
 */

/**
 * Formats a duration in seconds to a human-readable time string.
 *
 * For durations under one hour, returns MM:SS format.
 * For durations of one hour or more, returns H:MM:SS format.
 *
 * @param seconds - The duration in seconds to format
 * @returns A formatted time string (e.g., "2:05" or "1:01:01")
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const paddedSeconds = remainingSeconds.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}
