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

| Domain                   | Border    | Badge BG  | Badge Text |
| ------------------------ | --------- | --------- | ---------- |
| Audit Technology         | `#c4b5fd` | `#f5f3ff` | `#7c3aed`  |
| Quality and Risk         | `#fcd34d` | `#fefce8` | `#b45309`  |
| Accounting and Reporting | `#6ee7b7` | `#ecfdf5` | `#047857`  |
| Tax                      | `#93c5fd` | `#eff6ff` | `#2563eb`  |
| Advisory                 | `#fda4af` | `#fff1f2` | `#e11d48`  |
| Regulatory               | `#cbd5e1` | `#f8fafc` | `#475569`  |

Fallback for unknown domains: neutral slate (`#e2e8f0` / `#f8fafc` / `#64748b`).

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

**Props:**

- `variant`: `"podcast"` | `"series"`
- `title`: string
- `description`: string | null
- `domain`: string
- For podcast: `year`, `tags`
- For series: `episodeCount`, `completedCount`

**Variant differences (bottom metadata only):**

- **Podcast:** tag badges + year (top-right)
- **Series:** episode count + progress bar, year replaced by episode count in top-right

### Home page layout

Two-column grid (existing `lg:grid-cols-2`). Each column renders a stacked list of `HomeCard` items inside `StaggeredGrid` / `StaggeredGridItem` for entrance animation.

## New Files

| File                            | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `lib/domain-colors.ts`          | `getDomainColor(domain: string)` → `{ border, bg, text }` |
| `components/home/home-card.tsx` | Shared card component for both variants                   |

## Modified Files

| File                    | Change                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `app/(public)/page.tsx` | Replace `PodcastGrid` + `PathCard` grid with `HomeCard` lists inside `StaggeredGrid` |

## Files NOT Modified

- `components/library/podcast-card.tsx` — unchanged, still used on `/bulletins` page with full thumbnails
- `components/learning-path/path-card.tsx` — unchanged, still used on `/learning-path` page
- `components/library/podcast-grid.tsx` — the `columns` prop added earlier can be reverted since we no longer use `PodcastGrid` on the home page

## Animation

Use existing `StaggeredGrid` + `StaggeredGridItem` components (already in `components/ui/staggered-grid.tsx`). Cards stagger in with cascading entrance animation. Each column animates independently.

## Testing

- Unit test for `getDomainColor()` — returns correct colors for each known domain and fallback for unknown
- Snapshot or render test for `HomeCard` — both variants render correct structure
- Existing sidebar/nav tests already updated for "Learning Series" rename
