/**
 * Unit tests for the AnalyticsCharts component.
 *
 * Verifies:
 * - The domain pie chart does NOT have an innerRadius prop (true pie, not donut)
 * - The monthly trends chart uses BarChart (not AreaChart)
 * - Top topics data is rendered in descending order by count
 *
 * @dependencies recharts, @testing-library/react, vitest
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsCharts } from '@/components/admin/analytics-charts';

/**
 * Mock recharts components to inspect rendered props in jsdom.
 *
 * ResponsiveContainer is replaced with a simple div because jsdom
 * has no layout engine and ResponsiveContainer requires measured dimensions.
 * Chart components are rendered as divs with data attributes so we can
 * assert which chart type is used and what props are passed.
 */
vi.mock('recharts', () => {
  const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  );

  const PieChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  );

  const Pie = (props: Record<string, unknown>) => (
    <div
      data-testid="pie"
      data-inner-radius={props.innerRadius ?? 'none'}
      data-outer-radius={props.outerRadius}
    >
      {props.children as React.ReactNode}
    </div>
  );

  const Cell = () => <div data-testid="cell" />;

  const BarChart = ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data?: unknown[];
    layout?: string;
  }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  );

  const Bar = (props: Record<string, unknown>) => (
    <div data-testid="bar" data-datakey={props.dataKey as string} />
  );

  const AreaChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  );

  const Area = () => <div data-testid="area" />;

  const XAxis = () => <div data-testid="x-axis" />;
  const YAxis = () => <div data-testid="y-axis" />;
  const CartesianGrid = () => <div data-testid="cartesian-grid" />;
  const Tooltip = () => <div data-testid="tooltip" />;
  const Legend = () => <div data-testid="legend" />;

  return {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
  };
});

/** Mock the DateRangePicker to avoid importing its dependencies */
vi.mock('@/components/admin/date-range-picker', () => ({
  DateRangePicker: ({ onDateChange: _onDateChange }: { onDateChange: () => void }) => (
    <div data-testid="date-range-picker" />
  ),
}));

const MOCK_ANALYTICS_DATA = {
  totalPodcasts: 42,
  totalPaths: 7,
  listensByDomain: [
    { domain: 'Auditing', count: 150 },
    { domain: 'LEAP', count: 90 },
    { domain: 'Tax', count: 60 },
  ],
  monthlyTrends: [
    { month: 'Jan', count: 20 },
    { month: 'Feb', count: 35 },
    { month: 'Mar', count: 28 },
  ],
  topTopics: [
    { topic: 'Revenue Recognition', count: 10 },
    { topic: 'Risk Assessment', count: 25 },
    { topic: 'Going Concern', count: 15 },
  ],
};

describe('AnalyticsCharts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(MOCK_ANALYTICS_DATA),
    }) as unknown as typeof fetch;
  });

  it('renders the domain pie chart without innerRadius (true pie, not donut)', async () => {
    render(<AnalyticsCharts />);

    await waitFor(() => {
      expect(screen.getByText('Listens by Domain')).toBeInTheDocument();
    });

    const pieElement = screen.getByTestId('pie');
    // innerRadius should not be set (our mock renders 'none' when undefined)
    expect(pieElement.getAttribute('data-inner-radius')).toBe('none');
  });

  it('renders monthly trends using BarChart, not AreaChart', async () => {
    render(<AnalyticsCharts />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Trends')).toBeInTheDocument();
    });

    // There should be no AreaChart anywhere in the document
    const areaCharts = screen.queryAllByTestId('area-chart');
    expect(areaCharts).toHaveLength(0);

    // There should be BarChart instances (one for monthly trends, one for top topics)
    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts.length).toBeGreaterThanOrEqual(2);
  });

  it('renders top topics sorted in descending order by count', async () => {
    render(<AnalyticsCharts />);

    await waitFor(() => {
      expect(screen.getAllByText('Top Topics').length).toBeGreaterThan(0);
    });

    // The top topics BarChart is the one with layout="vertical" — it's the last bar-chart
    const barCharts = screen.getAllByTestId('bar-chart');
    const topTopicsChart = barCharts[barCharts.length - 1];

    const chartData = JSON.parse(topTopicsChart.getAttribute('data-chart-data') ?? '[]') as Array<{
      topic: string;
      count: number;
    }>;

    // Verify data is sorted descending by count
    expect(chartData.length).toBe(3);
    expect(chartData[0].topic).toBe('Risk Assessment');
    expect(chartData[0].count).toBe(25);
    expect(chartData[1].topic).toBe('Going Concern');
    expect(chartData[1].count).toBe(15);
    expect(chartData[2].topic).toBe('Revenue Recognition');
    expect(chartData[2].count).toBe(10);

    // Verify each subsequent count is less than or equal to the previous
    for (let i = 1; i < chartData.length; i++) {
      expect(chartData[i].count).toBeLessThanOrEqual(chartData[i - 1].count);
    }
  });
});
