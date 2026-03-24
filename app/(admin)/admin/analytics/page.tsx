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
      <section className="rounded-2xl border border-border/70 bg-card/85 p-5 shadow-[0_10px_35px_-30px_oklch(45.6%_0.311_264.1/.65)]">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Admin Console</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform usage and engagement metrics.</p>
      </section>
      <AnalyticsCharts />
    </div>
  );
}
