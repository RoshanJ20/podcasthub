import { AnalyticsCharts } from '@/components/admin/analytics-charts';

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
