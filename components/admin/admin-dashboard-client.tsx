/**
 * Client wrapper for the admin dashboard podcast table.
 *
 * Wraps PodcastTable in a client component so the Server Component
 * admin page can pass serialized data as props while supporting
 * client-side interactions like refresh via router.
 */
'use client';

import { useRouter } from 'next/navigation';
import { PodcastTable } from '@/components/admin/podcast-table';
import type { PodcastData } from '@/lib/types';

interface AdminDashboardClientProps {
  podcasts: PodcastData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Renders PodcastTable with a refresh handler that revalidates the page.
 */
export function AdminDashboardClient({ podcasts, pagination }: AdminDashboardClientProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return <PodcastTable podcasts={podcasts} pagination={pagination} onRefresh={handleRefresh} />;
}
