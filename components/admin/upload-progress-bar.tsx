/**
 * Reusable upload progress bar component for the admin podcast upload form.
 *
 * Key responsibilities:
 * - Renders a horizontal progress bar that reflects the current upload percentage.
 * - Purely presentational: no side effects, no state, no external dependencies.
 *
 * Usage example:
 * ```tsx
 * <UploadProgressBar progress={42} />
 * ```
 */

import { cn } from '@/lib/utils';

interface UploadProgressBarProps {
  /** Upload completion percentage, from 0 to 100. */
  progress: number;
  /** Optional additional class names for the outer container. */
  className?: string;
}

/**
 * Displays a simple animated progress bar during file uploads.
 *
 * @param progress - A number between 0 and 100 representing upload completion.
 * @param className - Optional Tailwind class names applied to the track element.
 * @returns A styled track-and-fill progress bar element.
 */
export function UploadProgressBar({ progress, className }: UploadProgressBarProps) {
  return (
    <div className={cn('w-full bg-secondary rounded-full h-2.5', className)}>
      <div
        className="bg-primary h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
