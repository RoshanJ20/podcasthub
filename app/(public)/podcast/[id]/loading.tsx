/**
 * Loading skeleton for the podcast detail page.
 *
 * Displays placeholder shapes while the podcast data is being fetched
 * from the database, providing a smooth loading experience.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
