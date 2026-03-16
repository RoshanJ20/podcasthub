# Analytics Dashboard Design Spec

**Date:** 2026-03-16
**Status:** Approved design
**PRD Reference:** FR-ADMIN-006 (Analytics Dashboard)

---

## 1. Overview

Redesign the analytics experience across two surfaces:

1. **Admin Dashboard (`/admin`)** — compact, glanceable KPIs with embedded visuals (sparklines, progress rings, mini charts). The "executive briefing" that admins see on login.
2. **Analytics Page (`/admin/analytics`)** — deep-dive with tabbed layout, full-size charts, date range + domain filtering. Where admins go to answer specific questions.

Both surfaces share the same API. The dashboard requests a compact subset; the analytics page requests full breakdowns per tab.

### Audience

- **Domain experts (admins):** See how their domain's content is performing, which episodes resonate, where learners drop off.
- **Platform managers (superadmins):** Bird's-eye view of platform health, engagement trends, content gaps across all domains.

### Design Principles

- **Visuals over numbers:** Rich data visualizations (sparklines, progress rings, heatmaps, trend arrows) where shape and color tell the story. Numbers are secondary annotation.
- **Flexible color:** Domain colors (`getDomainColor()`) appear where domain data is shown. Non-domain charts use neutral theme-aware palettes. No over-commitment to one palette.
- **Scroll + tabs:** Tabbed layout on the analytics page for focus. Scrollable content within each tab.

---

## 2. Surface 1 — Admin Dashboard (`/admin`)

The existing dashboard (4 stat cards + podcast management table) is enhanced with visual widgets above the table.

### 2.1 Row 1 — KPI Strip

Four cards in a horizontal row (collapses to 2x2 on `sm`).

| Card            | Primary Value | Visual                                                   | Subtitle                                  |
| --------------- | ------------- | -------------------------------------------------------- | ----------------------------------------- |
| Total Podcasts  | e.g. `127`    | 7-day sparkline (tiny area chart, ~60px wide, top-right) | `+3 this week` with green/red trend arrow |
| Learning Series | e.g. `14`     | 7-day sparkline                                          | `+1 this week` with trend arrow           |
| Total Listens   | e.g. `2,841`  | 7-day sparkline                                          | `+12% vs last week`                       |
| Active Users    | e.g. `89`     | 7-day sparkline                                          | `this week`                               |

All primary values use `AnimatedNumber`. Sparklines are single-color area fills with gradient fade using `--primary` theme token.

> **Note:** Sparklines in compact mode always reflect the trailing 7 days, independent of the date range picker's `from`/`to` parameters. This ensures they remain legible at 60px width.

### 2.2 Row 2 — Two-Column Layout

Collapses to single column below `lg`.

**Left: Domain Activity Rings**
Six concentric progress rings, one per domain. Each ring's fill represents that domain's share of total listens. Uses domain colors from `getDomainColor()`. Hover highlights a ring and shows count + percentage in a tooltip. Compact — fits in one card.

**Right: Monthly Trend (mini area chart)**
Area chart showing listens over the last 6 months. Neutral color (theme-aware, not domain-specific). Gradient fill fading to transparent. Tooltips on hover. Smooth monotone curve.

### 2.3 Row 3 — Top Content (compact table)

Top 5 most-listened podcasts in the current period. Columns:

| Column  | Display                                                |
| ------- | ------------------------------------------------------ |
| Rank    | `#1`, `#2`, etc.                                       |
| Title   | Truncated, links to `/podcast/:id`                     |
| Domain  | Colored badge using `getDomainColor()`                 |
| Listens | Number with a tiny horizontal proportion bar behind it |

### 2.4 Navigation Link

"View detailed analytics →" link below the widgets, navigating to `/admin/analytics`.

Each dashboard widget can also deep-link to the relevant analytics tab.

### 2.5 Existing Content

The podcast management table (`LearningGraphsTable` and podcast table) remains below all analytics widgets, unchanged.

---

## 3. Surface 2 — Analytics Page (`/admin/analytics`)

### 3.1 Global Controls

Persistent across all tabs, rendered above the tab bar:

- **Date range picker** (already exists) — controls the time window for all charts.
- **Domain filter** (new) — multi-select dropdown. Filters all charts by selected domains. Defaults to "All domains."
- **Compare toggle** — deferred to a future iteration. Period-over-period deltas are shown as single numbers on KPI cards, but full time-series overlay comparison requires additional API design and is out of scope for the initial build.

### 3.2 Tab 1: Overview

The bird's-eye view of platform health.

**Row 1 — Expanded KPI Cards (4 cards)**

Same 4 metrics as the dashboard but with richer detail:

| Card            | Shows                                                                             |
| --------------- | --------------------------------------------------------------------------------- |
| Total Podcasts  | Current value, sparkline, period-over-period change (absolute + %), "Avg X/month" |
| Learning Series | Same treatment                                                                    |
| Total Listens   | Same treatment                                                                    |
| Active Users    | Same treatment                                                                    |

**Row 2 — Two hero charts (side by side, lg:grid-cols-2)**

- **Left: Domain Distribution (donut chart)** — each segment uses its domain color. Center displays total listens as a large number. Hover highlights segment, shows count + percentage. Legend below with domain-colored badges.
- **Right: Listening Trends (stacked area chart)** — each domain as a stacked layer in its domain color. Time on X-axis. Granularity adapts: days if <30 day range, weeks if <90 days, months otherwise. Smooth monotone curves, gradient fills.

**Row 3 — Activity Heatmap**

GitHub-style contribution heatmap showing daily activity intensity over the selected date range. Neutral green gradient (light mode) / teal-cyan gradient (dark mode). Each cell = one day, intensity = total activities that day. Hover shows date + count. Gives instant feel for platform rhythm — weekdays vs weekends, quiet periods, spikes after new content.

### 3.3 Tab 2: Content

Focused on podcast performance.

**Row 1 — Top 10 Podcasts (horizontal bar chart)**

Bars colored by their podcast's domain color. Sorted descending by listen count. Y-axis shows podcast title (truncated). Count displayed on/beside each bar. Clicking a bar navigates to that podcast.

**Row 2 — Two columns (lg:grid-cols-2)**

- **Left: Content by Domain & Year (stacked bar chart)** — one group per domain, segments per year (the podcast's `year` field, not `createdAt`). This chart is **not filtered by the date range picker** — it always shows the full catalog distribution. Helps spot gaps ("Quality and Risk has no 2026 content").
- **Right: Newest Content Performance** — list of 5 most recently added podcasts, each with a sparkline showing their listen trajectory since upload. Answers "is new content getting traction?"

**Row 3 — Top Tags (horizontal bar chart)**

Top 15 tags by frequency across all podcasts. Horizontal bars, neutral palette. Shows which topics are most represented in the library.

### 3.4 Tab 3: Learning Paths

Focused on structured learning engagement.

**Row 1 — Path Stats (3 cards)**

| Card                | Value      | Visual                               |
| ------------------- | ---------- | ------------------------------------ |
| Published Paths     | count      | mini bar showing by-domain breakdown |
| Avg Completion Rate | e.g. `43%` | progress ring                        |
| Most Popular Path   | path title | listen/view count badge              |

**Row 2 — Path Completion Funnel**

A dropdown selector to choose a specific learning path. Below it, a horizontal funnel visualization: each episode in the path is a bar, bar width represents how many users reached that episode. Bars shrink as users drop off. Shows exactly where learners abandon a path. The funnel defaults to the most popular path. Selecting a different path triggers a client-side fetch with the `pathId` query parameter (see Section 5.2).

**Row 3 — All Paths Table**

Sortable table with columns:

| Column          | Display                         |
| --------------- | ------------------------------- |
| Title           | Path name, links to path editor |
| Domain          | Colored badge                   |
| Episodes        | Count                           |
| Views           | Total `view_path` activities    |
| Completion Rate | Mini progress bar in the cell   |
| Published       | Date                            |

### 3.5 Tab 4: Users

Focused on user behavior patterns.

**Row 1 — User Stats (3 cards)**

| Card                | Value  | Visual                         |
| ------------------- | ------ | ------------------------------ |
| Total Users         | count  | sparkline                      |
| Active This Period  | count  | vs previous period delta arrow |
| Avg Activities/User | number | trend arrow                    |

**Row 2 — Activity Breakdown (donut chart)**

Proportion of activity types: listens, bookmarks, episode completions, path views, searches. Neutral palette (not domain colors — this shows activity-type data). Center shows total activities. Hover for count + percentage per type.

**Row 3 — Top Users Table (superadmin only)**

Top 10 most active users by total activities. Columns:

| Column          | Display       |
| --------------- | ------------- |
| Display Name    | User name     |
| Listens         | Count         |
| Bookmarks       | Count         |
| Paths Completed | Count         |
| Last Active     | Relative date |

Authorization: the API returns `topUsers: []` for admin users and populated data only for superadmins. The client simply renders what it receives — no client-side role check needed for this table. The authorization boundary is server-side.

---

## 4. Visual Design Language

### 4.1 Chart Styling

- All charts wrapped in `ResponsiveContainer` with generous height: 300px for hero charts, 200px for supporting charts, 60px for sparklines.
- Rounded corners on all bar charts: `radius={[4, 4, 0, 0]}`.
- Subtle `CartesianGrid` with dashed strokes and low opacity (`strokeDasharray="3 3"`, `opacity={0.3}`).
- Smooth curves on area/line charts: `type="monotone"`.
- Tooltips: rounded cards with shadow, colored indicator dot, inheriting from shadcn Card styling.

### 4.2 Color Strategy

- **Domain-specific charts** (domain distribution, domain rings, top podcasts by domain): use `getDomainColor()`. Extend the existing `DomainColor` interface with a `chart: string` property — use the existing `text` color (the most saturated value) as the chart fill. This avoids inventing new colors while ensuring chart segments are visually distinct.

| Domain                   | Chart Color (= existing `text`) |
| ------------------------ | ------------------------------- |
| Audit Methodology        | `#7c3aed` (vivid purple)        |
| Accounting and Reporting | `#047857` (vivid green)         |
| Audit Technology         | `#2563eb` (vivid blue)          |
| Quality and Risk         | `#b45309` (vivid amber)         |
| LEAP                     | `#e11d48` (vivid pink)          |
| Auditing                 | `#475569` (slate)               |

- **Non-domain charts** (activity breakdown, heatmap, sparklines, user stats): use a neutral palette derived from shadcn theme tokens (`--primary`, `--muted`, `--accent`). These adapt automatically to light/dark mode.
- **Sparklines:** single-color area fill with gradient fade to transparent, using `--primary` token.

### 4.3 Animation

- `AnimatedNumber` on all visible KPIs (component already exists).
- Chart enter animations: `animationDuration={800}`, `animationEasing="ease-out"`.
- Staggered entrance for card rows: 50ms delay between cards (via CSS `animation-delay` or Motion stagger).
- Respect `prefers-reduced-motion` — disable all animations when set.

### 4.4 Dark Mode

- No hardcoded hex colors for backgrounds or text in chart components.
- Chart tooltip backgrounds inherit from shadcn Card (`bg-card`, `border`, `text-card-foreground`).
- Heatmap uses green gradient in light mode, teal/cyan gradient in dark mode for contrast.
- Domain colors already have light/dark variants via `getDomainColor()`.

### 4.5 Responsive Behavior

- KPI strip: 4-across → 2x2 grid on `sm` → 1-column stack on `xs`.
- Two-column layouts collapse to single column below `lg`.
- Horizontal bar charts reduce Y-axis label width on smaller screens.
- Tab navigation uses horizontal scroll with fade indicators on mobile.
- Hero charts maintain 300px height but fill available width.

---

## 5. API Design

### 5.1 Endpoint

`GET /api/admin/analytics`

Extends the existing endpoint. Auth: admin or superadmin.

### 5.2 Query Parameters

| Param     | Type                                          | Default     | Description                                                                                       |
| --------- | --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `from`    | ISO date string                               | 30 days ago | Start of date range                                                                               |
| `to`      | ISO date string                               | now         | End of date range                                                                                 |
| `tab`     | `overview` \| `content` \| `paths` \| `users` | `overview`  | Which dataset to return (avoids fetching everything)                                              |
| `compact` | `true` \| `false`                             | `false`     | When `true`, returns only the KPI strip + minimal chart data (for the dashboard surface)          |
| `domains` | comma-separated strings                       | all         | Filter by domain(s). Ignored when `compact=true`.                                                 |
| `pathId`  | UUID string                                   | (optional)  | When `tab=paths`, include funnel data for this specific path. If omitted, `pathFunnel` is `null`. |

### 5.3 Response Shapes

**Compact mode (`?compact=true`)** — used by admin dashboard:

```typescript
interface AnalyticsCompact {
  totalPodcasts: number;
  totalPaths: number;
  totalListens: number;
  activeUsers: number;
  sparklines: {
    podcasts: number[]; // last 7 days, daily counts
    paths: number[]; // last 7 days
    listens: number[]; // last 7 days
    users: number[]; // last 7 days
  };
  deltas: {
    podcasts: number; // change vs previous period
    paths: number;
    listens: number;
    users: number;
  };
  domainRings: { domain: string; count: number; percentage: number }[];
  monthlyTrend: { month: string; count: number }[];
  topContent: { id: string; title: string; domain: string; listens: number }[];
}
```

**Tab: overview:**

```typescript
interface AnalyticsOverview {
  kpis: {
    totalPodcasts: number;
    totalPaths: number;
    totalListens: number;
    activeUsers: number;
    sparklines: { podcasts: number[]; paths: number[]; listens: number[]; users: number[] };
    deltas: { podcasts: number; paths: number; listens: number; users: number };
    averages: { podcastsPerMonth: number; listensPerDay: number };
  };
  domainDistribution: { domain: string; count: number; percentage: number }[];
  listeningTrends: { date: string; domains: Record<string, number> }[];
  dailyActivity: { date: string; count: number }[];
}
```

**Tab: content:**

```typescript
interface AnalyticsContent {
  topPodcasts: { id: string; title: string; domain: string; listens: number }[];
  contentByDomainYear: { domain: string; year: number; count: number }[];
  recentPerformance: { id: string; title: string; domain: string; dailyListens: number[] }[];
  topTags: { tag: string; count: number }[];
}
```

**Tab: paths:**

```typescript
interface AnalyticsPaths {
  publishedPaths: number;
  avgCompletionRate: number;
  mostPopularPath: { id: string; title: string; views: number } | null;
  pathsByDomain: { domain: string; count: number }[];
  pathFunnel: { pathId: string; episodes: { id: string; title: string; reached: number }[] } | null;
  allPaths: {
    id: string;
    title: string;
    domain: string;
    episodeCount: number;
    views: number;
    completionRate: number;
    publishedAt: string;
  }[];
}
```

**Tab: users:**

```typescript
interface AnalyticsUsers {
  totalUsers: number;
  activeThisPeriod: number;
  avgActivitiesPerUser: number;
  sparklines: { users: number[] };
  deltas: { active: number };
  activityBreakdown: { type: string; count: number; percentage: number }[];
  topUsers: {
    id: string;
    name: string;
    listens: number;
    bookmarks: number;
    pathsCompleted: number;
    lastActive: string;
  }[];
}
```

### 5.4 Data Sources

All data comes from existing Prisma models:

| Data                 | Source                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------- |
| KPI counts           | `prisma.podcast.count()`, `prisma.learningGraph.count()`, `prisma.userActivity.count()` |
| Sparklines           | `prisma.userActivity.groupBy(['createdAt'])` with date truncation                       |
| Domain distribution  | `prisma.userActivity` joined with `prisma.podcast` for domain                           |
| Listening trends     | `prisma.userActivity` grouped by date + podcast domain                                  |
| Heatmap              | `prisma.userActivity` grouped by date, all types                                        |
| Top podcasts         | `prisma.userActivity.groupBy(['podcastId'])` ordered by count                           |
| Content distribution | `prisma.podcast.groupBy(['domain', 'year'])`                                            |
| Path completion      | `prisma.userProgress` count vs `prisma.episode` count per graph                         |
| Activity breakdown   | `prisma.userActivity.groupBy(['activityType'])`                                         |
| Top users            | `prisma.userActivity.groupBy(['userId'])` ordered by count, joined with user            |
| Active users         | `prisma.userActivity` distinct userId in period                                         |

---

## 6. New Components

| Component           | Location                                      | Purpose                                         |
| ------------------- | --------------------------------------------- | ----------------------------------------------- |
| `DashboardKpiStrip` | `components/admin/dashboard-kpi-strip.tsx`    | 4-card KPI row with sparklines and trend arrows |
| `Sparkline`         | `components/ui/sparkline.tsx`                 | Reusable tiny area chart, theme-aware           |
| `DomainRings`       | `components/admin/domain-rings.tsx`           | Concentric progress rings by domain             |
| `MiniTrendChart`    | `components/admin/mini-trend-chart.tsx`       | Compact area chart for dashboard                |
| `TopContentTable`   | `components/admin/top-content-table.tsx`      | Top 5 podcasts with proportion bars             |
| `AnalyticsTabs`     | `components/admin/analytics-tabs.tsx`         | Tab container with Overview/Content/Paths/Users |
| `OverviewTab`       | `components/admin/analytics/overview-tab.tsx` | KPIs + domain donut + trends + heatmap          |
| `ContentTab`        | `components/admin/analytics/content-tab.tsx`  | Top podcasts + distribution + recent + tags     |
| `PathsTab`          | `components/admin/analytics/paths-tab.tsx`    | Path stats + funnel + table                     |
| `UsersTab`          | `components/admin/analytics/users-tab.tsx`    | User stats + activity donut + top users         |
| `ActivityHeatmap`   | `components/admin/activity-heatmap.tsx`       | GitHub-style contribution heatmap               |
| `CompletionFunnel`  | `components/admin/completion-funnel.tsx`      | Horizontal funnel for path drop-off             |
| `DomainFilter`      | `components/admin/domain-filter.tsx`          | Multi-select dropdown for domain filtering      |
| `ProportionBar`     | `components/ui/proportion-bar.tsx`            | Inline horizontal bar behind a number           |

---

## 7. Modifications to Existing Code

| File                                    | Change                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `app/(admin)/admin/page.tsx`            | Add dashboard widgets (KPI strip, domain rings, trend chart, top content) above existing table              |
| `app/(admin)/admin/analytics/page.tsx`  | Replace current simple layout with global controls + tabbed analytics                                       |
| `components/admin/analytics-charts.tsx` | Refactor into tab-specific components; this file becomes the orchestrator or is replaced by `AnalyticsTabs` |
| `app/api/admin/analytics/route.ts`      | Extend with `tab`, `compact`, `domains` query params; add new data aggregation queries                      |
| `lib/domain-colors.ts`                  | Add `chart: string` property to `DomainColor` interface — a vibrant color for chart fills                   |
| `lib/navigation-config.ts`              | No changes needed (analytics link already exists)                                                           |

---

## 8. Loading, Empty, and Error States

All new components must handle three states:

| State       | Behavior                                                                                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loading** | Skeleton placeholders with `animate-pulse`. Cards show a rounded rect for the number area + a thin rect for the sparkline. Charts show a shimmering rect at their full height. Staggered appearance (50ms delay between elements). |
| **Empty**   | Centered muted text within the chart card: "No data for the selected period." Charts render their axes but no data series. KPI cards show `0` with a flat sparkline.                                                               |
| **Error**   | Card displays an error icon + "Failed to load analytics" message with a "Retry" button. Clicking retry re-fetches the current tab's data. Errors are logged via `console.warn` (matching existing pattern).                        |

Tab-level errors do not affect other tabs — each tab fetches independently and handles its own error state.

---

## 9. Implementation Notes

### Server/Client Component Boundary

- The admin dashboard page (`/admin/page.tsx`) remains a **Server Component**. The new analytics widgets are rendered as a **client component island** (`DashboardAnalyticsWidgets`). Analytics data is fetched client-side via the compact API endpoint, avoiding blocking the initial page render (the podcast management table data is already fetched server-side).
- The analytics page (`/admin/analytics/page.tsx`) renders global controls and a tab container as client components. Each tab component fetches its own data on mount and when filters change.

### Performance Considerations

- The heatmap query over large date ranges (e.g., 365 days) may be expensive. Apply a maximum date range of 365 days server-side; if the requested range exceeds this, truncate to the most recent 365 days.
- Path completion rate queries join `user_progress` with `episodes` per graph — use Prisma `include` with `_count` to avoid N+1 queries.
- Consider adding `unstable_cache` (Next.js) or a simple in-memory TTL cache (60 seconds) on the analytics API to reduce database load from repeated dashboard loads.

### Domain Scoping

The `domains` query parameter is ignored when `compact=true`. Domain scoping for the dashboard surface (e.g., automatically filtering to an admin's assigned domains) will be addressed in the domain-scoped admin feature (currently deferred).

---

## 10. Out of Scope

- Real-time / WebSocket data streaming (all data is fetched on page load + date range change).
- Export to CSV/PDF (can be added later).
- Custom date presets (e.g., "Last 7 days", "This month") — date range picker handles free-form selection for now.
- Listening depth / drop-off within a single episode (would require granular position tracking not currently logged).
- Email reports / scheduled analytics digests.
- Compare toggle with full time-series overlay (period-over-period comparison beyond single-number deltas on KPI cards).
- Session-based metrics (no session model exists; "Avg Activities/User" is used instead).
