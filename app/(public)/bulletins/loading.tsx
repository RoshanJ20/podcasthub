/**
 * Loading skeleton for the bulletins library page.
 *
 * Key responsibilities:
 * - Render a placeholder grid while the server fetches audit brief data.
 * - Match the visual layout of the loaded audit brief grid (4-column responsive grid).
 *
 * Dependencies:
 * - @/components/ui/skeleton — Skeleton pulse component.
 */
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Displays an 8-item skeleton grid while the bulletins page loads.
 *
 * @returns A loading placeholder matching the audit brief grid layout.
 */
export default function LibraryLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
