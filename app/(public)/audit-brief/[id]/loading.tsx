/**
 * Loading skeleton for the audit brief detail page.
 *
 * Displays placeholder shapes while the audit brief data is being fetched
 * from the database, providing a smooth loading experience.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
