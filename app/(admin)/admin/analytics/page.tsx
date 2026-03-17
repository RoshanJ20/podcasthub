/**
 * Admin Analytics Page
 *
 * @module app/(admin)/admin/analytics/page
 *
 * @description Server component that renders the analytics dashboard for
 * administrators. Displays platform-wide metrics including listen counts,
 * user engagement, and content performance via the AnalyticsCharts client
 * component.
 *
 * @remarks
 * - Requires admin role (enforced by admin layout middleware)
 * - Data is fetched client-side by AnalyticsCharts to support date-range filtering
 */
import { AnalyticsCharts } from '@/components/admin/analytics-charts';

/**
 * Renders the admin analytics dashboard page.
 *
 * @returns A server-rendered page containing the platform analytics charts and
 * summary metrics for administrators.
 */
export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform usage and engagement metrics.</p>
      </div>
      <AnalyticsCharts />
    </div>
  );
}
