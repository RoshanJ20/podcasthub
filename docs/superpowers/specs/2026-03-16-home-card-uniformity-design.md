# Home Page Card Uniformity Design

**Date:** 2026-03-16
**Status:** Draft
**Goal:** Unify podcast and learning series cards on the home page with a shared text-based card design using domain-colored accents and staggered entrance animation.

## Problem

The home page has two card types with completely different visual weight:

- Podcast cards: large thumbnail images, domain badge, year, title, description, tags
- Learning series cards: plain text-only cards with title, description, episode count, progress bar

Learning series have no thumbnails. The asymmetry makes the two columns feel like different apps.

## Design Decision

Drop thumbnails from the home page entirely. Both card types use the same text-based card skeleton with domain-colored left border accent and color-matched domain badge.

## Domain Color Map (Soft Pastels)

Each domain gets a color triplet: `border` (accent line), `bg` (badge background), `text` (badge text).

Actual domains from `lib/schemas/common.ts` (`DOMAINS` constant):

| Domain                   | Border    | Badge BG  | Badge Text |
| ------------------------ | --------- | --------- | ---------- |
| Audit Methodology        | `#c4b5fd` | `#f5f3ff` | `#7c3aed`  |
| Accounting and Reporting | `#6ee7b7` | `#ecfdf5` | `#047857`  |
| Audit Technology         | `#93c5fd` | `#eff6ff` | `#2563eb`  |
| Quality and Risk         | `#fcd34d` | `#fefce8` | `#b45309`  |
| LEAP                     | `#fda4af` | `#fff1f2` | `#e11d48`  |
| Auditing                 | `#cbd5e1` | `#f8fafc` | `#475569`  |

Fallback for unknown domains: neutral slate (`#e2e8f0` / `#f8fafc` / `#64748b`).

`getDomainColor()` normalizes input with `domain.trim()` for resilient matching.

Dark mode: colors are applied via inline `style` since they are domain-data-driven. The pastel backgrounds and muted text colors work acceptably on dark backgrounds. The border accent is decorative-only (not the sole information carrier). Badge contrast ratios meet WCAG AA for all listed triplets.

## Card Structure

### Shared `HomeCard` component

```
┌─────────────────────────────────────────┐
│ ▌ [Domain Badge]              [metadata]│
│ ▌ Title (bold)                          │
│ ▌ Description (muted, 1-line clamp)     │
│ ▌ [bottom metadata]                     │
└─────────────────────────────────────────┘
  ↑ 3px left border in domain color
```

Entire card is wrapped in a `<Link>` to the detail page.

**Props:**

- `id`: string — used to build the detail page href
- `variant`: `"podcast"` | `"series"`
- `title`: string
- `description`: string | null
- `domain`: string
- For podcast: `year`, `tags`
- For series: `episodeCount`, `completedCount`

**Computed:**

- `href`: podcast → `/podcast/${id}`, series → `/learning-path/${id}`

**Variant differences (bottom metadata only):**

- **Podcast:** tag badges (bottom-left), year (top-right metadata slot)
- **Series:** episode count (top-right metadata slot), progress bar with ARIA attributes (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`)

**Empty states:**

- If `recentPodcasts` is empty: show "No technical content yet." centered text
- If `recentPaths` is empty: show "No learning series yet." centered text

### Home page layout

Two-column grid (existing `lg:grid-cols-2`). Each column renders a stacked list of `HomeCard` items inside `StaggeredGrid` / `StaggeredGridItem` for entrance animation.

The Prisma query and data mapping in `page.tsx` should be simplified to only select the fields `HomeCard` needs (no `audioShortUrl`, `audioLongUrl`, `bulletinUrls`, etc.).

## New Files

| File                            | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `lib/domain-colors.ts`          | `getDomainColor(domain: string)` → `{ border, bg, text }` |
| `components/home/home-card.tsx` | Shared card component for both variants                   |

## Modified Files

| File                                  | Change                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`               | Replace `PodcastGrid` + `PathCard` with `HomeCard` lists inside `StaggeredGrid`; simplify query |
| `components/library/podcast-grid.tsx` | Revert the `columns` prop (no longer used on home page)                                         |

## Files NOT Modified

- `components/library/podcast-card.tsx` — unchanged, still used on `/bulletins` page with full thumbnails
- `components/learning-path/path-card.tsx` — unchanged, still used on `/learning-path` page
- `components/home/category-grid.tsx` — unchanged, not currently used on home page (hidden by prior change)

## Animation

Use existing `StaggeredGrid` + `StaggeredGridItem` components (already in `components/ui/staggered-grid.tsx`). Cards stagger in with cascading entrance animation. Each column animates independently.

## Testing

- Unit test for `getDomainColor()` — returns correct triplet for each known domain, falls back to slate for unknown domains, handles trimmed input
- Render test for `HomeCard` podcast variant — renders link to `/podcast/[id]`, domain badge, title, description, tags, year
- Render test for `HomeCard` series variant — renders link to `/learning-path/[id]`, domain badge, title, description, episode count, progress bar with ARIA attributes
- Edge cases: null description, empty tags array, zero episode count
