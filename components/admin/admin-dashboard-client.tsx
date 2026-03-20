/**
 * Client wrapper for the admin dashboard audit brief table.
 *
 * Wraps AuditBriefTable in a client component so the Server Component
 * admin page can pass serialized data as props while supporting
 * client-side interactions like refresh via router.
 */
'use client';

import { useRouter } from 'next/navigation';
import { AuditBriefTable } from '@/components/admin/audit-brief-table';
import type { AuditBriefData } from '@/lib/types';

interface AdminDashboardClientProps {
  auditBriefs: AuditBriefData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Renders AuditBriefTable with a refresh handler that revalidates the page.
 */
export function AdminDashboardClient({ auditBriefs, pagination }: AdminDashboardClientProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <AuditBriefTable auditBriefs={auditBriefs} pagination={pagination} onRefresh={handleRefresh} />
  );
}
