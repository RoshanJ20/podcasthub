/**
 * Analytics charts component for the admin dashboard.
 *
 * Key responsibilities:
 * - Fetches and displays analytics data (plays, users, top auditBriefs)
 * - Renders interactive charts using Recharts
 * - Supports date range filtering via DateRangePicker
 */
'use client';

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { createLogger } from '@/lib/logger';

const log = createLogger('analytics-charts');

const COLORS = ['#000cff', '#20a4f3', '#2f9e44', '#f59f00', '#e03131', '#6c5ce7'];

interface AnalyticsData {
  totalAuditBriefs: number;
  totalPaths: number;
  totalListens: number;
  uniqueListeners: number;
  listensByDomain: { domain: string; count: number }[];
  monthlyTrends: { month: string; count: number }[];
  topTopics: { topic: string; count: number }[];
}

/**
 * Renders analytics charts and statistics for the admin dashboard.
 *
 * @returns Analytics dashboard with play counts, user stats, and top audit briefs chart
 */
export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async (from?: string, to?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const response = await fetch(`/api/admin/analytics?${params}`);
      const analyticsResponse = await response.json();
      setData(analyticsResponse);
    } catch (error) {
      log.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to fetch analytics'
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-80 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!data) return <div>No data available</div>;

  /** Sort topics by count descending so the most popular appear first */
  const sortedTopics = [...data.topTopics].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* <DateRangePicker onDateChange={fetchAnalytics} /> */}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-xl border border-border/70 bg-card">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Listens
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              <AnimatedNumber value={data.totalListens} />
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border/70 bg-card">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Unique Listeners
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              <AnimatedNumber value={data.uniqueListeners} />
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border/70 bg-card">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Audit Briefs
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              <AnimatedNumber value={data.totalAuditBriefs} />
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border/70 bg-card">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Learning Paths
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              <AnimatedNumber value={data.totalPaths} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Domain Pie Chart */}
      <Card className="rounded-xl border border-border/70 bg-card">
        <CardHeader className="border-b border-border/70 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Listens by Domain</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {data.listensByDomain.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No listen data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.listensByDomain}
                  dataKey="count"
                  nameKey="domain"
                  outerRadius={100}
                  label
                  isAnimationActive={true}
                  animationDuration={800}
                >
                  {data.listensByDomain.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card className="rounded-xl border border-border/70 bg-card">
        <CardHeader className="border-b border-border/70 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Monthly Trends</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {data.monthlyTrends.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No trend data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#000cff"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Topics */}
      <Card className="rounded-xl border border-border/70 bg-card">
        <CardHeader className="border-b border-border/70 px-5 py-3.5">
          <CardTitle className="text-sm font-semibold">Top Topics</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {sortedTopics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No topic data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedTopics} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="topic" type="category" width={120} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#20a4f3"
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
