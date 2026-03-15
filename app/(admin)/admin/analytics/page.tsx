import { AnalyticsCharts } from '@/components/admin/analytics-charts';

export default function AdminAnalyticsPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      <AnalyticsCharts />
    </div>
  );
}
