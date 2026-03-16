# Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the analytics experience across two surfaces — a compact KPI widget set on the admin dashboard and a tabbed deep-dive analytics page — with rich data visualizations, domain filtering, and responsive design.

**Architecture:** Extend the existing `/api/admin/analytics` endpoint with `tab`, `compact`, `domains`, and `pathId` query params to serve both surfaces from one API. Dashboard widgets are a client component island within the server-rendered admin page. Analytics page uses per-tab lazy fetching with independent error/loading states.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Prisma ORM, Recharts, shadcn/ui (Tabs, Card), Tailwind CSS, AnimatedNumber (motion/react)

**Spec:** `docs/superpowers/specs/2026-03-16-analytics-dashboard-design.md`

---

## File Structure

### New Files

| File                                                                   | Responsibility                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `lib/analytics-types.ts`                                               | Shared TypeScript interfaces for all analytics API responses (compact, overview, content, paths, users) |
| `components/ui/sparkline.tsx`                                          | Reusable tiny area chart (60px height, gradient fill, theme-aware)                                      |
| `components/ui/proportion-bar.tsx`                                     | Inline horizontal bar behind a number (relative width based on max)                                     |
| `components/admin/dashboard-kpi-strip.tsx`                             | 4-card KPI row with sparklines, AnimatedNumber, trend arrows                                            |
| `components/admin/dashboard-analytics-widgets.tsx`                     | Client component island that fetches compact API and renders all dashboard widgets                      |
| `components/admin/domain-rings.tsx`                                    | Concentric SVG progress rings colored by domain                                                         |
| `components/admin/mini-trend-chart.tsx`                                | Compact 200px area chart for monthly listening trend                                                    |
| `components/admin/top-content-table.tsx`                               | Top 5 podcasts table with domain badges and proportion bars                                             |
| `components/admin/domain-filter.tsx`                                   | Multi-select dropdown for domain filtering                                                              |
| `components/admin/activity-heatmap.tsx`                                | GitHub-style contribution heatmap (daily activity grid)                                                 |
| `components/admin/completion-funnel.tsx`                               | Horizontal funnel showing episode-by-episode drop-off                                                   |
| `components/admin/analytics-tabs.tsx`                                  | Tab container orchestrating Overview/Content/Paths/Users tabs                                           |
| `components/admin/analytics/overview-tab.tsx`                          | Overview tab: KPIs + donut + stacked area + heatmap                                                     |
| `components/admin/analytics/content-tab.tsx`                           | Content tab: top podcasts + domain-year distribution + tags                                             |
| `components/admin/analytics/paths-tab.tsx`                             | Paths tab: stats cards + funnel + paths table                                                           |
| `components/admin/analytics/users-tab.tsx`                             | Users tab: stats + activity donut + top users table                                                     |
| `__tests__/unit/lib/analytics-types.test.ts`                           | Type guard / validation tests for analytics interfaces                                                  |
| `__tests__/unit/api/analytics-compact.test.ts`                         | Tests for compact mode API response                                                                     |
| `__tests__/unit/api/analytics-tabs.test.ts`                            | Tests for tab-specific API responses (overview, content, paths, users)                                  |
| `__tests__/unit/components/ui/sparkline.test.tsx`                      | Sparkline rendering tests                                                                               |
| `__tests__/unit/components/ui/proportion-bar.test.tsx`                 | ProportionBar rendering tests                                                                           |
| `__tests__/unit/components/admin/dashboard-kpi-strip.test.tsx`         | KPI strip rendering + trend arrow tests                                                                 |
| `__tests__/unit/components/admin/domain-rings.test.tsx`                | Domain rings rendering tests                                                                            |
| `__tests__/unit/components/admin/activity-heatmap.test.tsx`            | Heatmap rendering tests                                                                                 |
| `__tests__/unit/components/admin/completion-funnel.test.tsx`           | Funnel rendering tests                                                                                  |
| `__tests__/unit/components/admin/analytics-tabs.test.tsx`              | Tab switching + data fetching tests                                                                     |
| `__tests__/unit/components/admin/dashboard-analytics-widgets.test.tsx` | Dashboard widget fetch, loading, error, and render tests                                                |
| `__tests__/unit/components/admin/domain-filter.test.tsx`               | Domain filter multi-select tests                                                                        |
| `__tests__/unit/components/admin/mini-trend-chart.test.tsx`            | Mini trend chart rendering tests                                                                        |
| `__tests__/unit/components/admin/top-content-table.test.tsx`           | Top content table rendering and link tests                                                              |
| `__tests__/unit/components/admin/analytics/overview-tab.test.tsx`      | Overview tab data fetch, charts, and state tests                                                        |
| `__tests__/unit/components/admin/analytics/content-tab.test.tsx`       | Content tab charts and data tests                                                                       |
| `__tests__/unit/components/admin/analytics/paths-tab.test.tsx`         | Paths tab stats, funnel, and table tests                                                                |
| `__tests__/unit/components/admin/analytics/users-tab.test.tsx`         | Users tab stats, donut, and top users tests                                                             |

### Modified Files

| File                                    | Change                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `lib/domain-colors.ts`                  | Add `chart: string` property to `DomainColor` interface                           |
| `app/api/admin/analytics/route.ts`      | Extend with `tab`, `compact`, `domains`, `pathId` params; add aggregation helpers |
| `app/(admin)/admin/page.tsx`            | Import and render `DashboardAnalyticsWidgets` above existing content              |
| `app/(admin)/admin/analytics/page.tsx`  | Replace with global controls + `AnalyticsTabs`                                    |
| `components/admin/analytics-charts.tsx` | Deprecated — functionality moves to tab-specific components                       |
| `__tests__/unit/api/analytics.test.ts`  | Update existing tests for new API shape; add backward-compat tests                |

---

## Chunk 1: Foundation — Types, Domain Colors, API Extension

### Task 1: Analytics Type Definitions

**Files:**

- Create: `lib/analytics-types.ts`
- Create: `__tests__/unit/lib/analytics-types.test.ts`

- [ ] **Step 1: Write type guard tests**

```typescript
// __tests__/unit/lib/analytics-types.test.ts
import { describe, it, expect } from 'vitest';
import {
  isAnalyticsCompact,
  isAnalyticsOverview,
  isAnalyticsContent,
  isAnalyticsPaths,
  isAnalyticsUsers,
} from '@/lib/analytics-types';

describe('analytics-types', () => {
  describe('isAnalyticsCompact', () => {
    it('returns true for valid compact response', () => {
      const data = {
        totalPodcasts: 10,
        totalPaths: 5,
        totalListens: 200,
        activeUsers: 30,
        sparklines: {
          podcasts: [1, 2, 3, 4, 5, 6, 7],
          paths: [0, 0, 1, 0, 0, 0, 0],
          listens: [10, 12, 15, 8, 20, 14, 11],
          users: [5, 6, 5, 7, 4, 8, 6],
        },
        deltas: { podcasts: 2, paths: 1, listens: 15, users: 3 },
        domainRings: [{ domain: 'LEAP', count: 50, percentage: 25 }],
        monthlyTrend: [{ month: '2026-01', count: 100 }],
        topContent: [{ id: '1', title: 'Test', domain: 'LEAP', listens: 50 }],
      };
      expect(isAnalyticsCompact(data)).toBe(true);
    });

    it('returns false for missing required fields', () => {
      expect(isAnalyticsCompact({})).toBe(false);
      expect(isAnalyticsCompact(null)).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/analytics-types.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create types and type guards**

Create `lib/analytics-types.ts` with all interfaces from the spec (Section 5.3):

- `AnalyticsCompact`
- `AnalyticsOverview`
- `AnalyticsContent`
- `AnalyticsPaths`
- `AnalyticsUsers`
- Type guards: `isAnalyticsCompact()`, `isAnalyticsOverview()`, etc.
- Union type: `AnalyticsResponse = AnalyticsCompact | AnalyticsOverview | AnalyticsContent | AnalyticsPaths | AnalyticsUsers`
- Constants: `ANALYTICS_TABS = ['overview', 'content', 'paths', 'users'] as const`
- Type: `AnalyticsTab = typeof ANALYTICS_TABS[number]`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/analytics-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/analytics-types.ts __tests__/unit/lib/analytics-types.test.ts
git commit -m "feat: add analytics API type definitions and type guards"
```

---

### Task 2: Extend Domain Colors

**Files:**

- Modify: `lib/domain-colors.ts`
- Modify: `__tests__/unit/lib/domain-colors.test.ts`

- [ ] **Step 1: Write failing test for `chart` property**

Add to `__tests__/unit/lib/domain-colors.test.ts`:

```typescript
it('includes chart color for each domain', () => {
  const domains = [
    'Audit Methodology',
    'Accounting and Reporting',
    'Audit Technology',
    'Quality and Risk',
    'LEAP',
    'Auditing',
  ];
  for (const domain of domains) {
    const color = getDomainColor(domain);
    expect(color).toHaveProperty('chart');
    expect(color.chart).toMatch(/^#[0-9a-fA-F]{6}$/);
  }
});

it('uses text color as chart color', () => {
  const color = getDomainColor('Audit Methodology');
  expect(color.chart).toBe(color.text);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/domain-colors.test.ts`
Expected: FAIL — `chart` property missing

- [ ] **Step 3: Add `chart` property and fix existing test assertions**

In `lib/domain-colors.ts`:

- Add `chart: string` to the `DomainColor` interface
- For each domain entry, set `chart` equal to the existing `text` value
- Update fallback (unknown domain) similarly
- **Important:** Update existing `toEqual()` assertions in the test file to use `toMatchObject()` or add the `chart` (and `glow` if missing) properties to expected objects. The existing tests may use exact matching that will break when new properties are added.

Per spec Section 4.2:
| Domain | chart value |
|--------|-------------|
| Audit Methodology | `#7c3aed` |
| Accounting and Reporting | `#047857` |
| Audit Technology | `#2563eb` |
| Quality and Risk | `#b45309` |
| LEAP | `#e11d48` |
| Auditing | `#475569` |

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/domain-colors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/domain-colors.ts __tests__/unit/lib/domain-colors.test.ts
git commit -m "feat: add chart color to DomainColor interface"
```

---

### Task 3: Extend Analytics API — Compact Mode

**Files:**

- Modify: `app/api/admin/analytics/route.ts`
- Create: `__tests__/unit/api/analytics-compact.test.ts`

**Context:** The existing API (route.ts lines 98-147) returns the old `AnalyticsData` shape. We need to add `compact=true` support that returns `AnalyticsCompact`. The existing tests at `__tests__/unit/api/analytics.test.ts` must continue to pass (backward compat).

- [ ] **Step 1: Write compact mode tests**

```typescript
// __tests__/unit/api/analytics-compact.test.ts
describe('GET /api/admin/analytics?compact=true', () => {
  it('returns 200 with AnalyticsCompact shape', async () => {
    // Mock auth: admin user
    // Mock Prisma queries for counts, activities
    // Call GET with ?compact=true
    // Assert response has: totalPodcasts, totalPaths, totalListens, activeUsers,
    //   sparklines (4 arrays of 7 numbers each), deltas (4 numbers),
    //   domainRings, monthlyTrend, topContent
  });

  it('sparklines contain exactly 7 entries (trailing 7 days)', async () => {
    // Assert each sparkline array has length 7
  });

  it('ignores domains param in compact mode', async () => {
    // Call with ?compact=true&domains=LEAP
    // Assert domainRings contains all domains, not just LEAP
  });

  it('deltas compare current vs previous 7-day period', async () => {
    // Mock activities in current week and previous week
    // Assert deltas reflect the difference
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/api/analytics-compact.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement compact mode in API route**

Modify `app/api/admin/analytics/route.ts`:

- Parse `compact` query param from URL
- If `compact=true`, run compact-specific queries:
  - KPI counts (podcasts, paths, listens, active users)
  - Sparklines: query `userActivity` for last 14 days (7 current + 7 previous for deltas), group by day
  - Domain rings: aggregate listen activities by podcast domain
  - Monthly trend: aggregate last 6 months
  - Top content: top 5 podcasts by listen count
- Return `AnalyticsCompact` response
- Keep existing non-compact logic as fallback (backward compat)

Key helpers to add:

- `computeSparklines(activities, days=7)`: groups activities by date, returns array of daily counts
- `computeDeltas(current, previous)`: returns `{ podcasts, paths, listens, users }` diffs
- `computeActiveUsers(activities)`: count distinct userIds

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/api/analytics-compact.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing tests to verify backward compat**

Run: `npx vitest run __tests__/unit/api/analytics.test.ts`
Expected: PASS (all existing tests still green)

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/analytics/route.ts __tests__/unit/api/analytics-compact.test.ts
git commit -m "feat: add compact mode to analytics API for dashboard widgets"
```

---

### Task 4: Extend Analytics API — Tab-Specific Responses

**Files:**

- Modify: `app/api/admin/analytics/route.ts`
- Create: `__tests__/unit/api/analytics-tabs.test.ts`

- [ ] **Step 1: Write tab tests for overview**

```typescript
describe('GET /api/admin/analytics?tab=overview', () => {
  it('returns AnalyticsOverview shape', async () => {
    // Assert: kpis (with sparklines, deltas, averages),
    //   domainDistribution, listeningTrends, dailyActivity
  });

  it('listeningTrends adapts granularity to date range', async () => {
    // <30 days: daily entries
    // 30-90 days: weekly entries
    // >90 days: monthly entries
  });

  it('filters by domains param', async () => {
    // ?tab=overview&domains=LEAP,Auditing
    // Assert domainDistribution only contains LEAP and Auditing
  });
});
```

- [ ] **Step 2: Write tab tests for content**

```typescript
describe('GET /api/admin/analytics?tab=content', () => {
  it('returns AnalyticsContent shape', async () => {
    // Assert: topPodcasts (max 10), contentByDomainYear, recentPerformance (max 5), topTags (max 15)
  });

  it('contentByDomainYear is NOT filtered by date range', async () => {
    // Pass narrow date range, assert contentByDomainYear includes all years
  });

  it('topPodcasts sorted descending by listens', async () => {
    // Assert array is sorted
  });
});
```

- [ ] **Step 3: Write tab tests for paths**

```typescript
describe('GET /api/admin/analytics?tab=paths', () => {
  it('returns AnalyticsPaths shape', async () => {
    // Assert: publishedPaths, avgCompletionRate, mostPopularPath, pathsByDomain, pathFunnel (null), allPaths
  });

  it('pathFunnel is null when pathId not provided', async () => {
    // Assert pathFunnel === null
  });

  it('pathFunnel is populated when pathId provided', async () => {
    // ?tab=paths&pathId=<uuid>
    // Assert pathFunnel has episodes with reached counts
  });

  it('completion rate calculated correctly', async () => {
    // Mock: path with 4 episodes, 2 users completed all 4, 1 user completed 2
    // Assert avgCompletionRate reflects this
  });
});
```

- [ ] **Step 4: Write tab tests for users**

```typescript
describe('GET /api/admin/analytics?tab=users', () => {
  it('returns AnalyticsUsers shape', async () => {
    // Assert: totalUsers, activeThisPeriod, avgActivitiesPerUser, sparklines, deltas, activityBreakdown, topUsers
  });

  it('topUsers is empty array for non-superadmin', async () => {
    // Mock user with role=admin
    // Assert topUsers === []
  });

  it('topUsers is populated for superadmin', async () => {
    // Mock user with role=superadmin
    // Assert topUsers has entries
  });

  it('activityBreakdown percentages sum to ~100', async () => {
    // Assert sum of percentage fields is approximately 100
  });
});
```

- [ ] **Step 4b: Write 365-day max date range test**

```typescript
describe('date range enforcement', () => {
  it('truncates date range to max 365 days', async () => {
    // ?tab=overview&from=2024-01-01&to=2026-03-16 (>365 days)
    // Assert response only includes data for the most recent 365 days
  });
});
```

- [ ] **Step 5: Run all tab tests to verify they fail**

Run: `npx vitest run __tests__/unit/api/analytics-tabs.test.ts`
Expected: FAIL

- [ ] **Step 6: Implement tab routing in API**

Modify `app/api/admin/analytics/route.ts`:

- Parse `tab` query param (default: `overview`)
- Parse `domains` query param (comma-split, validate against known domains)
- Parse `pathId` query param (UUID validation)
- Route to tab-specific handler:
  - `buildOverviewResponse(dateFilter, domainFilter)`
  - `buildContentResponse(dateFilter, domainFilter)`
  - `buildPathsResponse(dateFilter, domainFilter, pathId)`
  - `buildUsersResponse(dateFilter, domainFilter, userRole)`

Key new helpers:

- `computeDomainDistribution(activities, podcasts)`: groups by domain, calculates percentages
- `computeListeningTrends(activities, dateRange, domainFilter)`: groups by date+domain, adapts granularity
- `computeDailyActivity(activities)`: groups by date, all activity types
- `computePathCompletionRates(graphs, episodes, progress)`: calculates per-path and average completion
- `computePathFunnel(pathId, episodes, progress)`: per-episode reached counts
- `computeActivityBreakdown(activities)`: groups by activityType, calculates percentages
- `computeTopUsers(activities, userRole)`: top 10 by count, only for superadmin

Enforce max 365-day date range server-side per spec Section 9.

- [ ] **Step 7: Run tab tests to verify they pass**

Run: `npx vitest run __tests__/unit/api/analytics-tabs.test.ts`
Expected: PASS

- [ ] **Step 8: Run ALL analytics tests**

Run: `npx vitest run __tests__/unit/api/analytics`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add app/api/admin/analytics/route.ts __tests__/unit/api/analytics-tabs.test.ts
git commit -m "feat: add tab-specific responses to analytics API (overview, content, paths, users)"
```

---

## Chunk 2: Shared UI Primitives

### Task 5: Sparkline Component

**Files:**

- Create: `components/ui/sparkline.tsx`
- Create: `__tests__/unit/components/ui/sparkline.test.tsx`

- [ ] **Step 1: Write Sparkline tests**

```typescript
// __tests__/unit/components/ui/sparkline.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock recharts (following existing pattern in analytics-charts.test.tsx)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children, data }: any) => <div data-testid="area-chart" data-points={data?.length}>{children}</div>,
  Area: (props: any) => <div data-testid="area" data-type={props.type} />,
  defs: ({ children }: any) => <div>{children}</div>,
  linearGradient: ({ children }: any) => <div>{children}</div>,
  stop: () => <div />,
}))

describe('Sparkline', () => {
  it('renders an AreaChart with provided data', () => {
    render(<Sparkline data={[1, 2, 3, 4, 5, 6, 7]} />)
    expect(screen.getByTestId('area-chart')).toHaveAttribute('data-points', '7')
  })

  it('renders with default height of 60', () => {
    render(<Sparkline data={[1, 2, 3]} />)
    const container = screen.getByTestId('responsive-container')
    expect(container).toBeInTheDocument()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(<Sparkline data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('uses monotone curve type', () => {
    render(<Sparkline data={[1, 2, 3]} />)
    expect(screen.getByTestId('area')).toHaveAttribute('data-type', 'monotone')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/ui/sparkline.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Sparkline**

Create `components/ui/sparkline.tsx`:

- Props: `{ data: number[]; height?: number; className?: string; color?: string }`
- Uses Recharts `AreaChart` + `Area` with `ResponsiveContainer`
- Height defaults to 60px
- `type="monotone"`, no axes, no grid, no tooltip
- Area fill uses SVG `linearGradient` from `color` (default: `hsl(var(--primary))`) to transparent
- Returns null if `data.length === 0`
- Transforms `number[]` to `{ value: number }[]` for Recharts

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/components/ui/sparkline.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/sparkline.tsx __tests__/unit/components/ui/sparkline.test.tsx
git commit -m "feat: add Sparkline component for KPI cards"
```

---

### Task 6: ProportionBar Component

**Files:**

- Create: `components/ui/proportion-bar.tsx`
- Create: `__tests__/unit/components/ui/proportion-bar.test.tsx`

- [ ] **Step 1: Write ProportionBar tests**

```typescript
describe('ProportionBar', () => {
  it('renders a bar with width proportional to value/max', () => {
    render(<ProportionBar value={50} max={100} />)
    const bar = screen.getByRole('presentation')
    expect(bar).toHaveStyle({ width: '50%' })
  })

  it('renders the value as text', () => {
    render(<ProportionBar value={42} max={100} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('clamps width to 100% when value exceeds max', () => {
    render(<ProportionBar value={150} max={100} />)
    const bar = screen.getByRole('presentation')
    expect(bar).toHaveStyle({ width: '100%' })
  })

  it('renders 0% width when max is 0', () => {
    render(<ProportionBar value={0} max={0} />)
    const bar = screen.getByRole('presentation')
    expect(bar).toHaveStyle({ width: '0%' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/ui/proportion-bar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ProportionBar**

Create `components/ui/proportion-bar.tsx`:

- Props: `{ value: number; max: number; className?: string; formatter?: (n: number) => string }`
- Renders: a `relative` container with a background bar (`absolute`, `bg-primary/10`, width = `value/max * 100%`, clamped 0-100%) and text overlay showing the formatted value
- Bar element has `role="presentation"`
- Uses `cn()` for class merging

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/components/ui/proportion-bar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/proportion-bar.tsx __tests__/unit/components/ui/proportion-bar.test.tsx
git commit -m "feat: add ProportionBar component for inline bar visualizations"
```

---

## Chunk 3: Dashboard Surface (`/admin`)

### Task 7: DashboardKpiStrip Component

**Files:**

- Create: `components/admin/dashboard-kpi-strip.tsx`
- Create: `__tests__/unit/components/admin/dashboard-kpi-strip.test.tsx`

- [ ] **Step 1: Write KPI strip tests**

```typescript
describe('DashboardKpiStrip', () => {
  const mockData = {
    totalPodcasts: 127,
    totalPaths: 14,
    totalListens: 2841,
    activeUsers: 89,
    sparklines: {
      podcasts: [10, 12, 15, 8, 20, 14, 11],
      paths: [0, 0, 1, 0, 0, 0, 0],
      listens: [100, 120, 150, 80, 200, 140, 110],
      users: [5, 6, 5, 7, 4, 8, 6],
    },
    deltas: { podcasts: 3, paths: 1, listens: 340, users: 5 },
  }

  it('renders 4 KPI cards', () => {
    render(<DashboardKpiStrip data={mockData} />)
    expect(screen.getByText('Total Podcasts')).toBeInTheDocument()
    expect(screen.getByText('Learning Series')).toBeInTheDocument()
    expect(screen.getByText('Total Listens')).toBeInTheDocument()
    expect(screen.getByText('Active Users')).toBeInTheDocument()
  })

  it('renders sparklines for each KPI', () => {
    render(<DashboardKpiStrip data={mockData} />)
    const sparklines = screen.getAllByTestId('area-chart')
    expect(sparklines).toHaveLength(4)
  })

  it('shows positive delta with green arrow', () => {
    render(<DashboardKpiStrip data={mockData} />)
    expect(screen.getByText('+3 this week')).toBeInTheDocument()
  })

  it('shows negative delta with red arrow', () => {
    render(<DashboardKpiStrip data={{ ...mockData, deltas: { ...mockData.deltas, podcasts: -2 } }} />)
    expect(screen.getByText('-2 this week')).toBeInTheDocument()
  })

  it('renders loading skeleton when data is null', () => {
    render(<DashboardKpiStrip data={null} />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/admin/dashboard-kpi-strip.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement DashboardKpiStrip**

Create `components/admin/dashboard-kpi-strip.tsx`:

- `'use client'` directive
- Props: `{ data: Pick<AnalyticsCompact, 'totalPodcasts' | 'totalPaths' | 'totalListens' | 'activeUsers' | 'sparklines' | 'deltas'> | null }`
- Renders 4 `Card` components in a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
- Each card: label (uppercase, muted), `AnimatedNumber` for value, `Sparkline` in top-right, delta with `TrendingUp`/`TrendingDown` icon from lucide-react (green/red)
- Loading state: 4 skeleton cards with `animate-pulse`
- Import `Sparkline` from `@/components/ui/sparkline`
- Import `AnimatedNumber` from `@/components/ui/animated-number`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/components/admin/dashboard-kpi-strip.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/admin/dashboard-kpi-strip.tsx __tests__/unit/components/admin/dashboard-kpi-strip.test.tsx
git commit -m "feat: add DashboardKpiStrip component with sparklines and trend arrows"
```

---

### Task 8: DomainRings Component

**Files:**

- Create: `components/admin/domain-rings.tsx`
- Create: `__tests__/unit/components/admin/domain-rings.test.tsx`

- [ ] **Step 1: Write DomainRings tests**

```typescript
describe('DomainRings', () => {
  const mockData = [
    { domain: 'Audit Methodology', count: 50, percentage: 25 },
    { domain: 'Accounting and Reporting', count: 40, percentage: 20 },
    { domain: 'Audit Technology', count: 30, percentage: 15 },
    { domain: 'Quality and Risk', count: 30, percentage: 15 },
    { domain: 'LEAP', count: 30, percentage: 15 },
    { domain: 'Auditing', count: 20, percentage: 10 },
  ]

  it('renders 6 SVG circles (one per domain)', () => {
    render(<DomainRings data={mockData} />)
    const circles = document.querySelectorAll('circle')
    // 6 background + 6 foreground = 12
    expect(circles).toHaveLength(12)
  })

  it('renders domain labels', () => {
    render(<DomainRings data={mockData} />)
    expect(screen.getByText('Audit Methodology')).toBeInTheDocument()
  })

  it('renders empty state when data is empty', () => {
    render(<DomainRings data={[]} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/admin/domain-rings.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement DomainRings**

Create `components/admin/domain-rings.tsx`:

- `'use client'` directive
- Props: `{ data: { domain: string; count: number; percentage: number }[] }`
- Renders an SVG with 6 concentric rings using `<circle>` elements
- Each ring: background circle (muted stroke), foreground circle (domain `chart` color stroke, `strokeDasharray` proportional to percentage)
- Rings arranged concentrically from largest (outermost) to smallest (innermost)
- Uses `getDomainColor(domain).chart` for stroke colors
- Hover state: highlights ring, shows tooltip with domain name + count + percentage
- Empty state: centered muted text "No data for the selected period."
- Legend below SVG with domain-colored dots + labels

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/components/admin/domain-rings.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/admin/domain-rings.tsx __tests__/unit/components/admin/domain-rings.test.tsx
git commit -m "feat: add DomainRings component with concentric SVG rings"
```

---

### Task 9: MiniTrendChart and TopContentTable

**Files:**

- Create: `components/admin/mini-trend-chart.tsx`
- Create: `components/admin/top-content-table.tsx`
- Create: `__tests__/unit/components/admin/mini-trend-chart.test.tsx`
- Create: `__tests__/unit/components/admin/top-content-table.test.tsx`

- [ ] **Step 1: Write MiniTrendChart tests**

```typescript
describe('MiniTrendChart', () => {
  it('renders an AreaChart with monthly data', () => {
    const data = [{ month: '2026-01', count: 100 }, { month: '2026-02', count: 150 }]
    render(<MiniTrendChart data={data} />)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders empty state when data is empty', () => {
    render(<MiniTrendChart data={[]} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Write TopContentTable tests**

```typescript
describe('TopContentTable', () => {
  const mockData = [
    { id: '1', title: 'Podcast A', domain: 'LEAP', listens: 100 },
    { id: '2', title: 'Podcast B', domain: 'Auditing', listens: 80 },
  ]

  it('renders a table with rank, title, domain, and listens columns', () => {
    render(<TopContentTable data={mockData} />)
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('Podcast A')).toBeInTheDocument()
    expect(screen.getByText('LEAP')).toBeInTheDocument()
  })

  it('renders proportion bars for listen counts', () => {
    render(<TopContentTable data={mockData} />)
    const bars = screen.getAllByRole('presentation')
    expect(bars).toHaveLength(2)
  })

  it('renders empty state when data is empty', () => {
    render(<TopContentTable data={[]} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('links podcast titles to /podcast/:id', () => {
    render(<TopContentTable data={mockData} />)
    const link = screen.getByText('Podcast A').closest('a')
    expect(link).toHaveAttribute('href', '/podcast/1')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run __tests__/unit/components/admin/mini-trend-chart.test.tsx __tests__/unit/components/admin/top-content-table.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement MiniTrendChart**

Create `components/admin/mini-trend-chart.tsx`:

- `'use client'` directive
- Props: `{ data: { month: string; count: number }[] }`
- Uses Recharts `AreaChart` with `ResponsiveContainer` height 200px
- `type="monotone"`, gradient fill, subtle `CartesianGrid`, `XAxis` with month labels, `Tooltip`
- Neutral color using `hsl(var(--primary))`
- Empty state when data is empty

- [ ] **Step 5: Implement TopContentTable**

Create `components/admin/top-content-table.tsx`:

- `'use client'` directive
- Props: `{ data: { id: string; title: string; domain: string; listens: number }[] }`
- Uses shadcn `Table` components
- Columns: rank (#1-#5), title (linked to `/podcast/:id`, truncated), domain badge (colored), listens (with `ProportionBar`)
- Max value for proportion bar = first item's listens count
- Empty state when data is empty

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/components/admin/mini-trend-chart.test.tsx __tests__/unit/components/admin/top-content-table.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/admin/mini-trend-chart.tsx components/admin/top-content-table.tsx \
  __tests__/unit/components/admin/mini-trend-chart.test.tsx __tests__/unit/components/admin/top-content-table.test.tsx
git commit -m "feat: add MiniTrendChart and TopContentTable dashboard components"
```

---

### Task 10: DashboardAnalyticsWidgets + Page Integration

**Files:**

- Create: `components/admin/dashboard-analytics-widgets.tsx`
- Modify: `app/(admin)/admin/page.tsx`

- [ ] **Step 1: Write DashboardAnalyticsWidgets tests**

```typescript
describe('DashboardAnalyticsWidgets', () => {
  it('fetches compact analytics data on mount', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCompactData),
    })
    global.fetch = fetchSpy

    render(<DashboardAnalyticsWidgets />)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/analytics?compact=true'),
        expect.any(Object)
      )
    })
  })

  it('renders KPI strip, domain rings, trend chart, and top content', async () => {
    // Mock fetch returning full compact data
    render(<DashboardAnalyticsWidgets />)
    await waitFor(() => {
      expect(screen.getByText('Total Podcasts')).toBeInTheDocument()
      expect(screen.getByText('View detailed analytics')).toBeInTheDocument()
    })
  })

  it('shows loading skeletons while fetching', () => {
    // Mock fetch that never resolves
    render(<DashboardAnalyticsWidgets />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows error state with retry button on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    render(<DashboardAnalyticsWidgets />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/admin/dashboard-analytics-widgets.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement DashboardAnalyticsWidgets**

Create `components/admin/dashboard-analytics-widgets.tsx`:

- `'use client'` directive
- Fetches `/api/admin/analytics?compact=true` on mount
- State: `data: AnalyticsCompact | null`, `isLoading: boolean`, `error: string | null`
- Layout (per spec Section 2):
  - Row 1: `<DashboardKpiStrip data={...} />`
  - Row 2: `grid lg:grid-cols-2 gap-4` with `<DomainRings>` (left) and `<MiniTrendChart>` (right), each in a `Card`
  - Row 3: `<TopContentTable>` in a `Card`
  - Footer: `<Link href="/admin/analytics">View detailed analytics →</Link>`
- Loading: passes `null` to children (they render skeletons)
- Error: `Card` with alert icon + message + "Retry" button

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/components/admin/dashboard-analytics-widgets.test.tsx`
Expected: PASS

- [ ] **Step 5: Wire into admin dashboard page**

Modify `app/(admin)/admin/page.tsx`:

- Import `DashboardAnalyticsWidgets` from `@/components/admin/dashboard-analytics-widgets`
- Render `<DashboardAnalyticsWidgets />` between the page header and the existing stat cards/table
- Keep all existing server-rendered content below

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add components/admin/dashboard-analytics-widgets.tsx app/(admin)/admin/page.tsx \
  __tests__/unit/components/admin/dashboard-analytics-widgets.test.tsx
git commit -m "feat: add analytics widgets to admin dashboard with compact API"
```

---

## Chunk 4: Analytics Page — Primitives & Overview Tab

### Task 11: DomainFilter Component

**Files:**

- Create: `components/admin/domain-filter.tsx`
- Create: `__tests__/unit/components/admin/domain-filter.test.tsx`

- [ ] **Step 1: Write DomainFilter tests**

```typescript
describe('DomainFilter', () => {
  it('renders a button showing "All domains" when nothing selected', () => {
    render(<DomainFilter selected={[]} onChange={vi.fn()} />)
    expect(screen.getByText('All domains')).toBeInTheDocument()
  })

  it('calls onChange with toggled domain when a domain is clicked', async () => {
    const onChange = vi.fn()
    render(<DomainFilter selected={[]} onChange={onChange} />)
    // Open dropdown, click a domain
    await userEvent.click(screen.getByText('All domains'))
    await userEvent.click(screen.getByText('LEAP'))
    expect(onChange).toHaveBeenCalledWith(['LEAP'])
  })

  it('shows count of selected domains in button text', () => {
    render(<DomainFilter selected={['LEAP', 'Auditing']} onChange={vi.fn()} />)
    expect(screen.getByText('2 domains')).toBeInTheDocument()
  })

  it('renders all 6 domains as checkable options', async () => {
    render(<DomainFilter selected={[]} onChange={vi.fn()} />)
    await userEvent.click(screen.getByText('All domains'))
    expect(screen.getByText('Audit Methodology')).toBeInTheDocument()
    expect(screen.getByText('LEAP')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement DomainFilter**

Create `components/admin/domain-filter.tsx`:

- `'use client'` directive
- Props: `{ selected: string[]; onChange: (domains: string[]) => void }`
- Uses a popover/dropdown pattern (shadcn `Popover` or custom) with checkboxes for each of the 6 domains
- Each domain option shows its colored dot using `getDomainColor(domain).chart`
- Button label: "All domains" when empty, "{N} domains" when some selected, single domain name when exactly 1
- Toggles domain in/out of selected array

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

```bash
git add components/admin/domain-filter.tsx __tests__/unit/components/admin/domain-filter.test.tsx
git commit -m "feat: add DomainFilter multi-select component"
```

---

### Task 12: ActivityHeatmap Component

**Files:**

- Create: `components/admin/activity-heatmap.tsx`
- Create: `__tests__/unit/components/admin/activity-heatmap.test.tsx`

- [ ] **Step 1: Write ActivityHeatmap tests**

```typescript
describe('ActivityHeatmap', () => {
  const mockData = [
    { date: '2026-03-01', count: 5 },
    { date: '2026-03-02', count: 12 },
    { date: '2026-03-03', count: 0 },
  ]

  it('renders a grid of day cells', () => {
    render(<ActivityHeatmap data={mockData} />)
    const cells = document.querySelectorAll('[data-date]')
    expect(cells.length).toBeGreaterThanOrEqual(3)
  })

  it('applies intensity-based background color', () => {
    render(<ActivityHeatmap data={mockData} />)
    const highCell = document.querySelector('[data-date="2026-03-02"]')
    const lowCell = document.querySelector('[data-date="2026-03-03"]')
    // High activity cell should have darker background
    expect(highCell?.className).not.toBe(lowCell?.className)
  })

  it('renders empty state when data is empty', () => {
    render(<ActivityHeatmap data={[]} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('shows tooltip on cell hover with date and count', async () => {
    render(<ActivityHeatmap data={mockData} />)
    const cell = document.querySelector('[data-date="2026-03-02"]')!
    await userEvent.hover(cell)
    expect(screen.getByText(/12 activities/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement ActivityHeatmap**

Create `components/admin/activity-heatmap.tsx`:

- `'use client'` directive
- Props: `{ data: { date: string; count: number }[] }`
- Renders a CSS grid of day cells arranged in columns (weeks) and rows (days of week)
- Each cell: `data-date` attribute, background color intensity based on `count / maxCount`
- Color: green gradient in light mode (5 intensity levels from `bg-green-50` to `bg-green-700`), teal gradient in dark mode
- Month labels along the top, day-of-week labels (Mon, Wed, Fri) on the left
- Tooltip on hover: date formatted + count + "activities"
- Empty state: centered muted text
- Uses `useTheme` from next-themes to pick light/dark gradient

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

```bash
git add components/admin/activity-heatmap.tsx __tests__/unit/components/admin/activity-heatmap.test.tsx
git commit -m "feat: add ActivityHeatmap component (GitHub-style contribution grid)"
```

---

### Task 13: OverviewTab Component

**Files:**

- Create: `components/admin/analytics/overview-tab.tsx`
- Create: `__tests__/unit/components/admin/analytics/overview-tab.test.tsx`

- [ ] **Step 1: Write OverviewTab tests**

```typescript
describe('OverviewTab', () => {
  it('fetches overview data on mount', async () => {
    const fetchSpy = mockFetch(mockOverviewData)
    render(<OverviewTab dateRange={{ from: '2026-01-01', to: '2026-03-16' }} domains={[]} />)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('tab=overview'),
        expect.any(Object)
      )
    })
  })

  it('renders 4 expanded KPI cards', async () => {
    mockFetch(mockOverviewData)
    render(<OverviewTab dateRange={{ from: '2026-01-01', to: '2026-03-16' }} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText('Total Podcasts')).toBeInTheDocument()
      expect(screen.getByText('Active Users')).toBeInTheDocument()
    })
  })

  it('renders domain distribution donut chart', async () => {
    mockFetch(mockOverviewData)
    render(<OverviewTab dateRange={{ from: '2026-01-01', to: '2026-03-16' }} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  it('renders listening trends stacked area chart', async () => {
    mockFetch(mockOverviewData)
    render(<OverviewTab dateRange={{ from: '2026-01-01', to: '2026-03-16' }} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })
  })

  it('renders activity heatmap', async () => {
    mockFetch(mockOverviewData)
    render(<OverviewTab dateRange={{ from: '2026-01-01', to: '2026-03-16' }} domains={[]} />)
    await waitFor(() => {
      expect(document.querySelectorAll('[data-date]').length).toBeGreaterThan(0)
    })
  })

  it('passes domain filter to API call', async () => {
    const fetchSpy = mockFetch(mockOverviewData)
    render(<OverviewTab dateRange={{ from: '2026-01-01', to: '2026-03-16' }} domains={['LEAP']} />)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('domains=LEAP'),
        expect.any(Object)
      )
    })
  })

  it('re-fetches when dateRange or domains change', async () => {
    // Rerender with different props, assert fetch called again
  })

  it('shows error state with retry button on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    render(<OverviewTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('shows empty state when API returns zero data', async () => {
    mockFetch({ ...mockOverviewData, domainDistribution: [], listeningTrends: [], dailyActivity: [] })
    render(<OverviewTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText(/no data/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement OverviewTab**

Create `components/admin/analytics/overview-tab.tsx`:

- `'use client'` directive
- Props: `{ dateRange: { from: string; to: string }; domains: string[] }`
- Fetches `/api/admin/analytics?tab=overview&from=...&to=...&domains=...` on mount and when props change
- State: `data: AnalyticsOverview | null`, `isLoading`, `error`
- Layout (per spec Section 3.2):
  - Row 1: 4 expanded KPI cards (grid cols-1 sm:cols-2 lg:cols-4) — value, sparkline, delta (absolute + %), average
  - Row 2: 2-col grid — donut chart (left, Recharts `PieChart` with `innerRadius` for donut, center label), stacked area chart (right, Recharts `AreaChart` with stacked `Area` per domain)
  - Row 3: `<ActivityHeatmap data={data.dailyActivity} />`
- Donut chart: each `Cell` uses `getDomainColor(domain).chart`, legend below
- Stacked area: one `Area` per domain key in `data.listeningTrends[].domains`, stacked, each domain colored
- Loading/empty/error states per spec Section 8

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

```bash
git add components/admin/analytics/overview-tab.tsx __tests__/unit/components/admin/analytics/overview-tab.test.tsx
git commit -m "feat: add OverviewTab with KPIs, donut chart, trends, and heatmap"
```

---

## Chunk 5: Content Tab & Learning Paths Tab

### Task 14: ContentTab Component

**Files:**

- Create: `components/admin/analytics/content-tab.tsx`
- Create: `__tests__/unit/components/admin/analytics/content-tab.test.tsx`

- [ ] **Step 1: Write ContentTab tests**

```typescript
describe('ContentTab', () => {
  it('fetches content data on mount', async () => {
    const fetchSpy = mockFetch(mockContentData)
    render(<ContentTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('tab=content'), expect.any(Object))
    })
  })

  it('renders top 10 podcasts as horizontal bars', async () => {
    mockFetch(mockContentData)
    render(<ContentTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  it('renders content by domain & year stacked bar chart', async () => {
    mockFetch(mockContentData)
    render(<ContentTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      // Should have 2 bar charts: top podcasts and domain-year
      const charts = screen.getAllByTestId('bar-chart')
      expect(charts.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('renders newest content performance with sparklines', async () => {
    mockFetch(mockContentData)
    render(<ContentTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText(mockContentData.recentPerformance[0].title)).toBeInTheDocument()
    })
  })

  it('renders top tags horizontal bar chart', async () => {
    mockFetch(mockContentData)
    render(<ContentTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText(mockContentData.topTags[0].tag)).toBeInTheDocument()
    })
  })
})
```

**Also include empty/error state tests** following the same pattern as OverviewTab (Task 13): test fetch failure shows error + retry, test empty data shows "No data" message.

- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement ContentTab**

Create `components/admin/analytics/content-tab.tsx`:

- `'use client'` directive
- Props: `{ dateRange: { from: string; to: string }; domains: string[] }`
- Fetches `?tab=content&from=...&to=...&domains=...`
- Layout (per spec Section 3.3):
  - Row 1: Horizontal `BarChart` (layout="vertical") — top 10 podcasts, bars colored by `getDomainColor(podcast.domain).chart`, Y-axis = title, X-axis = listens
  - Row 2: 2-col grid:
    - Left: Stacked `BarChart` — domain groups with year segments. Uses `contentByDomainYear` data.
    - Right: List of 5 recent podcasts, each with title, domain badge, and `Sparkline` of daily listens
  - Row 3: Horizontal `BarChart` — top 15 tags, neutral color
- Note: `contentByDomainYear` is NOT filtered by date range (data comes pre-computed from API, which fetches all-time for this field)

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

```bash
git add components/admin/analytics/content-tab.tsx __tests__/unit/components/admin/analytics/content-tab.test.tsx
git commit -m "feat: add ContentTab with top podcasts, domain-year distribution, and tags"
```

---

### Task 15: CompletionFunnel Component

**Files:**

- Create: `components/admin/completion-funnel.tsx`
- Create: `__tests__/unit/components/admin/completion-funnel.test.tsx`

- [ ] **Step 1: Write CompletionFunnel tests**

```typescript
describe('CompletionFunnel', () => {
  const mockFunnel = {
    pathId: 'path-1',
    episodes: [
      { id: 'ep-1', title: 'Intro', reached: 100 },
      { id: 'ep-2', title: 'Basics', reached: 75 },
      { id: 'ep-3', title: 'Advanced', reached: 40 },
      { id: 'ep-4', title: 'Final', reached: 20 },
    ],
  }

  it('renders a bar for each episode', () => {
    render(<CompletionFunnel data={mockFunnel} />)
    // 4 episodes = 4 bars
    const bars = screen.getAllByRole('presentation')
    expect(bars).toHaveLength(4)
  })

  it('bars shrink proportionally to reached count', () => {
    render(<CompletionFunnel data={mockFunnel} />)
    const bars = screen.getAllByRole('presentation')
    // First bar should be widest (100%), last should be narrowest (20%)
    expect(bars[0]).toHaveStyle({ width: '100%' })
    expect(bars[3]).toHaveStyle({ width: '20%' })
  })

  it('shows episode titles and reached counts', () => {
    render(<CompletionFunnel data={mockFunnel} />)
    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('renders null state message when data is null', () => {
    render(<CompletionFunnel data={null} />)
    expect(screen.getByText(/select a learning path/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement CompletionFunnel**

Create `components/admin/completion-funnel.tsx`:

- `'use client'` directive
- Props: `{ data: AnalyticsPaths['pathFunnel'] }`
- Renders a vertical list of horizontal bars, one per episode
- Each bar: episode title (left label), colored bar (width = `reached / maxReached * 100%`), reached count (right label)
- Bars have `role="presentation"` and use `bg-primary` with decreasing opacity
- `null` data: shows "Select a learning path to view its completion funnel."
- Empty episodes array: shows "No episodes in this path."

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

```bash
git add components/admin/completion-funnel.tsx __tests__/unit/components/admin/completion-funnel.test.tsx
git commit -m "feat: add CompletionFunnel component for learning path drop-off"
```

---

### Task 16: PathsTab Component

**Files:**

- Create: `components/admin/analytics/paths-tab.tsx`
- Create: `__tests__/unit/components/admin/analytics/paths-tab.test.tsx`

- [ ] **Step 1: Write PathsTab tests**

```typescript
describe('PathsTab', () => {
  it('fetches paths data on mount', async () => {
    const fetchSpy = mockFetch(mockPathsData)
    render(<PathsTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('tab=paths'), expect.any(Object))
    })
  })

  it('renders 3 stats cards (published paths, avg completion, most popular)', async () => {
    mockFetch(mockPathsData)
    render(<PathsTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText('Published Paths')).toBeInTheDocument()
      expect(screen.getByText('Avg Completion Rate')).toBeInTheDocument()
      expect(screen.getByText('Most Popular Path')).toBeInTheDocument()
    })
  })

  it('renders path selector dropdown for funnel', async () => {
    mockFetch(mockPathsData)
    render(<PathsTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  it('fetches funnel data when path is selected', async () => {
    const fetchSpy = mockFetch(mockPathsData)
    render(<PathsTab dateRange={defaultRange} domains={[]} />)
    // Select a path from dropdown
    // Assert fetch called with pathId param
  })

  it('renders all paths table with sortable columns', async () => {
    mockFetch(mockPathsData)
    render(<PathsTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Domain')).toBeInTheDocument()
      expect(screen.getByText('Completion Rate')).toBeInTheDocument()
    })
  })
})
```

**Also include empty/error state tests** following the same pattern as OverviewTab (Task 13).

- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement PathsTab**

Create `components/admin/analytics/paths-tab.tsx`:

- `'use client'` directive
- Props: `{ dateRange: { from: string; to: string }; domains: string[] }`
- Fetches `?tab=paths&from=...&to=...&domains=...` on mount
- Additional fetch when path selected: `?tab=paths&...&pathId=<uuid>`
- State: `data: AnalyticsPaths | null`, `selectedPathId: string | null`, `isLoading`, `error`
- Layout (per spec Section 3.4):
  - Row 1: 3 stat cards — published paths (with mini domain bar), avg completion rate (progress ring using SVG circle), most popular path (title + badge)
  - Row 2: Path selector (`<select>` or shadcn Select) + `<CompletionFunnel data={data.pathFunnel} />`
  - Row 3: Sortable table using shadcn Table — columns: title (linked), domain badge, episodes, views, completion rate (mini progress bar), published date
- Defaults funnel to most popular path on first load

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

```bash
git add components/admin/analytics/paths-tab.tsx __tests__/unit/components/admin/analytics/paths-tab.test.tsx
git commit -m "feat: add PathsTab with stats, completion funnel, and paths table"
```

---

## Chunk 6: Users Tab, AnalyticsTabs, and Page Integration

### Task 17: UsersTab Component

**Files:**

- Create: `components/admin/analytics/users-tab.tsx`
- Create: `__tests__/unit/components/admin/analytics/users-tab.test.tsx`

- [ ] **Step 1: Write UsersTab tests**

```typescript
describe('UsersTab', () => {
  it('fetches users data on mount', async () => {
    const fetchSpy = mockFetch(mockUsersData)
    render(<UsersTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('tab=users'), expect.any(Object))
    })
  })

  it('renders 3 user stat cards', async () => {
    mockFetch(mockUsersData)
    render(<UsersTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument()
      expect(screen.getByText('Active This Period')).toBeInTheDocument()
      expect(screen.getByText('Avg Activities/User')).toBeInTheDocument()
    })
  })

  it('renders activity breakdown donut chart', async () => {
    mockFetch(mockUsersData)
    render(<UsersTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  it('renders top users table when data is non-empty', async () => {
    mockFetch({ ...mockUsersData, topUsers: [{ id: '1', name: 'Alice', listens: 50, bookmarks: 10, pathsCompleted: 3, lastActive: '2026-03-15' }] })
    render(<UsersTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('hides top users table when topUsers is empty (non-superadmin)', async () => {
    mockFetch({ ...mockUsersData, topUsers: [] })
    render(<UsersTab dateRange={defaultRange} domains={[]} />)
    await waitFor(() => {
      expect(screen.queryByText('Top Users')).not.toBeInTheDocument()
    })
  })
})
```

**Also include empty/error state tests** following the same pattern as OverviewTab (Task 13).

- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement UsersTab**

Create `components/admin/analytics/users-tab.tsx`:

- `'use client'` directive
- Props: `{ dateRange: { from: string; to: string }; domains: string[] }`
- Fetches `?tab=users&from=...&to=...&domains=...`
- Layout (per spec Section 3.5):
  - Row 1: 3 stat cards — total users (with sparkline), active this period (with delta arrow), avg activities/user (with trend arrow)
  - Row 2: Donut chart (`PieChart` with `innerRadius`) — activity breakdown, neutral palette, center = total activities
  - Row 3: Top users table — conditionally rendered only when `topUsers.length > 0` (API returns empty for non-superadmin per spec)
- Neutral palette for donut: use 5 distinct muted colors for the 5 activity types

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

```bash
git add components/admin/analytics/users-tab.tsx __tests__/unit/components/admin/analytics/users-tab.test.tsx
git commit -m "feat: add UsersTab with stats, activity donut, and top users table"
```

---

### Task 18: AnalyticsTabs Container

**Files:**

- Create: `components/admin/analytics-tabs.tsx`
- Create: `__tests__/unit/components/admin/analytics-tabs.test.tsx`

- [ ] **Step 1: Write AnalyticsTabs tests**

```typescript
describe('AnalyticsTabs', () => {
  it('renders 4 tab triggers: Overview, Content, Learning Paths, Users', () => {
    render(<AnalyticsTabs />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Learning Paths')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('renders date range picker and domain filter above tabs', () => {
    render(<AnalyticsTabs />)
    // DateRangePicker and DomainFilter should be present
    expect(screen.getByText('All domains')).toBeInTheDocument()
  })

  it('defaults to Overview tab', () => {
    render(<AnalyticsTabs />)
    // Overview content should be visible
    expect(screen.getByText('Total Podcasts')).toBeInTheDocument()
  })

  it('switches tab content when tab is clicked', async () => {
    render(<AnalyticsTabs />)
    await userEvent.click(screen.getByText('Content'))
    // Content tab should now be visible
    await waitFor(() => {
      // Content tab fetches its own data
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('tab=content'), expect.any(Object))
    })
  })

  it('passes date range and domain filter to active tab', async () => {
    // Change date range, assert tab re-fetches with new params
  })
})
```

- [ ] **Step 2: Run test, verify fail**
- [ ] **Step 3: Implement AnalyticsTabs**

Create `components/admin/analytics-tabs.tsx`:

- `'use client'` directive
- No props (self-contained with internal state)
- State: `dateRange: { from: string; to: string }` (default: 30 days ago to now), `domains: string[]` (default: [])
- Layout:
  - Global controls row: `<DateRangePicker onDateChange={...} />` + `<DomainFilter selected={domains} onChange={setDomains} />`
  - `<Tabs defaultValue="overview">` using shadcn Tabs
    - `<TabsList>` with 4 `<TabsTrigger>` values: overview, content, paths, users
    - `<TabsContent value="overview">` → `<OverviewTab dateRange={dateRange} domains={domains} />`
    - `<TabsContent value="content">` → `<ContentTab dateRange={dateRange} domains={domains} />`
    - `<TabsContent value="paths">` → `<PathsTab dateRange={dateRange} domains={domains} />`
    - `<TabsContent value="users">` → `<UsersTab dateRange={dateRange} domains={domains} />`
- Each tab fetches its own data independently when it becomes active

- [ ] **Step 4: Run test, verify pass**
- [ ] **Step 5: Commit**

```bash
git add components/admin/analytics-tabs.tsx __tests__/unit/components/admin/analytics-tabs.test.tsx
git commit -m "feat: add AnalyticsTabs container with date range and domain filtering"
```

---

### Task 19: Analytics Page Integration

**Files:**

- Modify: `app/(admin)/admin/analytics/page.tsx`
- Deprecate: `components/admin/analytics-charts.tsx`
- Modify: `__tests__/unit/components/admin/analytics-charts.test.tsx` (update for new structure)

- [ ] **Step 1: Update analytics page to use AnalyticsTabs**

Replace `app/(admin)/admin/analytics/page.tsx` content:

```typescript
/**
 * Analytics deep-dive page.
 *
 * Server Component shell that renders the AnalyticsTabs client component.
 * All data fetching happens client-side within each tab.
 */
import { AnalyticsTabs } from '@/components/admin/analytics-tabs'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Platform usage and engagement metrics.</p>
      </div>
      <AnalyticsTabs />
    </div>
  )
}
```

- [ ] **Step 2: Add deprecation comment to analytics-charts.tsx**

Add to top of `components/admin/analytics-charts.tsx`:

```typescript
/**
 * @deprecated This component is replaced by AnalyticsTabs and its tab-specific sub-components.
 * Kept temporarily for reference. Remove after migration is verified.
 */
```

- [ ] **Step 3: Update existing analytics-charts tests**

Update `__tests__/unit/components/admin/analytics-charts.test.tsx` to mark existing tests as skipped (`.skip`) with a comment pointing to the new test files. Do not delete — they serve as documentation of the old behavior until cleanup.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add app/(admin)/admin/analytics/page.tsx components/admin/analytics-charts.tsx \
  __tests__/unit/components/admin/analytics-charts.test.tsx
git commit -m "feat: integrate AnalyticsTabs into analytics page, deprecate old charts"
```

---

### Task 20: Final Verification

- [ ] **Step 1: Run full test suite with coverage**

Run: `npx vitest run --coverage`
Expected: ALL PASS, coverage meets thresholds (lines 45%, functions 35%, branches 40%)

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Run Prettier check**

Run: `npx prettier --check .`
Expected: All files formatted

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Manual visual check**

Start dev server (`npm run dev`) and verify:

1. `/admin` — KPI strip with sparklines, domain rings, trend chart, top content table visible above existing content
2. `/admin/analytics` — 4 tabs working, date range picker + domain filter functional, all charts render
3. Dark mode toggle — all charts/components work in both modes
4. Responsive — collapse at sm/lg breakpoints works

- [ ] **Step 7: Final commit (if any formatting/lint fixes needed)**

```bash
git add -A
git commit -m "chore: formatting and lint fixes for analytics dashboard"
```
