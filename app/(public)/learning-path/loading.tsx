/**
 * Loading skeleton for the learning paths list page.
 *
 * Key responsibilities:
 * - Render a placeholder grid while the server fetches learning path data.
 * - Match the visual layout of the loaded learning paths grid (3-column responsive grid).
 *
 * Dependencies:
 * - @/components/ui/skeleton — Skeleton pulse component.
 */
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Displays a 6-item skeleton grid while the learning paths page loads.
 *
 * @returns A loading placeholder matching the learning paths grid layout.
 */
export default function LearningPathLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
