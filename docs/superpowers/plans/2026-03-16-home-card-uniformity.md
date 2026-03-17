# Home Card Uniformity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mismatched podcast/learning-series cards on the home page with a unified text-based card using domain-colored left-border accents and staggered entrance animation.

**Architecture:** New `getDomainColor` utility provides pastel color triplets per domain. New `HomeCard` client component renders both variants with a shared skeleton. Home page swaps `PodcastGrid`/`PathCard` for `HomeCard` lists inside `StaggeredGrid`.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, motion/react (via StaggeredGrid), Vitest + RTL

**Spec:** `docs/superpowers/specs/2026-03-16-home-card-uniformity-design.md`

---

## Task 1: Domain Color Utility

**Files:**

- Create: `lib/domain-colors.ts`
- Create: `__tests__/unit/lib/domain-colors.test.ts`

- [ ] **Step 1: Write failing tests for getDomainColor**

```typescript
// __tests__/unit/lib/domain-colors.test.ts
import { describe, it, expect } from 'vitest';
import { getDomainColor } from '@/lib/domain-colors';

describe('getDomainColor', () => {
  it('returns purple triplet for Audit Methodology', () => {
    const result = getDomainColor('Audit Methodology');
    expect(result).toEqual({ border: '#c4b5fd', bg: '#f5f3ff', text: '#7c3aed' });
  });

  it('returns green triplet for Accounting and Reporting', () => {
    const result = getDomainColor('Accounting and Reporting');
    expect(result).toEqual({ border: '#6ee7b7', bg: '#ecfdf5', text: '#047857' });
  });

  it('returns blue triplet for Audit Technology', () => {
    const result = getDomainColor('Audit Technology');
    expect(result).toEqual({ border: '#93c5fd', bg: '#eff6ff', text: '#2563eb' });
  });

  it('returns amber triplet for Quality and Risk', () => {
    const result = getDomainColor('Quality and Risk');
    expect(result).toEqual({ border: '#fcd34d', bg: '#fefce8', text: '#b45309' });
  });

  it('returns rose triplet for LEAP', () => {
    const result = getDomainColor('LEAP');
    expect(result).toEqual({ border: '#fda4af', bg: '#fff1f2', text: '#e11d48' });
  });

  it('returns slate triplet for Auditing', () => {
    const result = getDomainColor('Auditing');
    expect(result).toEqual({ border: '#cbd5e1', bg: '#f8fafc', text: '#475569' });
  });

  it('returns fallback slate for unknown domain', () => {
    const result = getDomainColor('Unknown Domain');
    expect(result).toEqual({ border: '#e2e8f0', bg: '#f8fafc', text: '#64748b' });
  });

  it('handles trimmed input', () => {
    const result = getDomainColor('  Audit Technology  ');
    expect(result).toEqual({ border: '#93c5fd', bg: '#eff6ff', text: '#2563eb' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/domain-colors.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement getDomainColor**

```typescript
// lib/domain-colors.ts
/**
 * Domain color utility for Podcast Hub.
 *
 * Provides soft-pastel color triplets (border, badge background, badge text)
 * for each knowledge domain. Used by HomeCard and other domain-aware components.
 */

/** Color triplet for domain-based visual accents. */
export interface DomainColor {
  /** Left border accent color. */
  border: string;
  /** Badge background color. */
  bg: string;
  /** Badge text color. */
  text: string;
}

const FALLBACK: DomainColor = { border: '#e2e8f0', bg: '#f8fafc', text: '#64748b' };

const DOMAIN_COLORS: Record<string, DomainColor> = {
  'Audit Methodology': { border: '#c4b5fd', bg: '#f5f3ff', text: '#7c3aed' },
  'Accounting and Reporting': { border: '#6ee7b7', bg: '#ecfdf5', text: '#047857' },
  'Audit Technology': { border: '#93c5fd', bg: '#eff6ff', text: '#2563eb' },
  'Quality and Risk': { border: '#fcd34d', bg: '#fefce8', text: '#b45309' },
  LEAP: { border: '#fda4af', bg: '#fff1f2', text: '#e11d48' },
  Auditing: { border: '#cbd5e1', bg: '#f8fafc', text: '#475569' },
};

/**
 * Returns a pastel color triplet for the given domain.
 *
 * @param domain - Domain name (trimmed before lookup).
 * @returns Color triplet with border, bg, and text hex values.
 */
export function getDomainColor(domain: string): DomainColor {
  return DOMAIN_COLORS[domain.trim()] ?? FALLBACK;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/domain-colors.test.ts`
Expected: PASS — all 8 tests green

- [ ] **Step 5: Commit**

```bash
git add lib/domain-colors.ts __tests__/unit/lib/domain-colors.test.ts
git commit -m "feat: add getDomainColor utility with pastel domain triplets"
```

---

## Task 2: HomeCard Component

**Files:**

- Create: `components/home/home-card.tsx`
- Create: `__tests__/unit/components/home/home-card.test.tsx`

**References:**

- `components/ui/staggered-grid.tsx` — StaggeredGrid/StaggeredGridItem for animation
- `lib/domain-colors.ts` — getDomainColor for accent colors
- `components/learning-path/path-card.tsx` — progress bar ARIA pattern to follow

- [ ] **Step 1: Write failing tests for HomeCard**

```typescript
// __tests__/unit/components/home/home-card.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeCard } from '@/components/home/home-card';

// Mock next/link to render a plain <a>
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('HomeCard', () => {
  describe('podcast variant', () => {
    it('renders title, description, domain badge, and year', () => {
      render(
        <HomeCard
          variant="podcast"
          id="p1"
          title="Analytics Intro"
          description="Overview of tools"
          domain="Audit Technology"
          year={2026}
          tags={['analytics', 'data']}
        />
      );

      expect(screen.getByText('Analytics Intro')).toBeDefined();
      expect(screen.getByText('Overview of tools')).toBeDefined();
      expect(screen.getByText('Audit Technology')).toBeDefined();
      expect(screen.getByText('2026')).toBeDefined();
    });

    it('links to /podcast/[id]', () => {
      const { container } = render(
        <HomeCard
          variant="podcast"
          id="p1"
          title="Test"
          description={null}
          domain="LEAP"
          year={2026}
          tags={[]}
        />
      );

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/podcast/p1');
    });

    it('renders tag badges', () => {
      render(
        <HomeCard
          variant="podcast"
          id="p1"
          title="Test"
          description={null}
          domain="LEAP"
          year={2026}
          tags={['search', 'ai']}
        />
      );

      expect(screen.getByText('search')).toBeDefined();
      expect(screen.getByText('ai')).toBeDefined();
    });

    it('handles null description', () => {
      render(
        <HomeCard
          variant="podcast"
          id="p1"
          title="Test"
          description={null}
          domain="LEAP"
          year={2026}
          tags={[]}
        />
      );

      expect(screen.getByText('Test')).toBeDefined();
    });
  });

  describe('series variant', () => {
    it('renders title, description, domain badge, and episode count', () => {
      render(
        <HomeCard
          variant="series"
          id="s1"
          title="Revenue Series"
          description="ASC 606 deep dive"
          domain="Accounting and Reporting"
          episodeCount={5}
          completedCount={2}
        />
      );

      expect(screen.getByText('Revenue Series')).toBeDefined();
      expect(screen.getByText('ASC 606 deep dive')).toBeDefined();
      expect(screen.getByText('Accounting and Reporting')).toBeDefined();
      expect(screen.getByText(/5 episodes/)).toBeDefined();
    });

    it('links to /learning-path/[id]', () => {
      const { container } = render(
        <HomeCard
          variant="series"
          id="s1"
          title="Test"
          description={null}
          domain="Auditing"
          episodeCount={0}
          completedCount={0}
        />
      );

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/learning-path/s1');
    });

    it('renders progress bar with ARIA attributes', () => {
      render(
        <HomeCard
          variant="series"
          id="s1"
          title="Test"
          description={null}
          domain="Auditing"
          episodeCount={4}
          completedCount={1}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('25');
      expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
    });

    it('handles zero episodes without division error', () => {
      render(
        <HomeCard
          variant="series"
          id="s1"
          title="Test"
          description={null}
          domain="Auditing"
          episodeCount={0}
          completedCount={0}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/home/home-card.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement HomeCard**

```tsx
// components/home/home-card.tsx
/**
 * Unified home page card for both podcast and learning series content.
 *
 * Renders a text-based card with a domain-colored left border accent
 * and color-matched domain badge. Variant prop controls bottom metadata:
 * podcasts show tags, series show episode progress.
 *
 * Dependencies:
 * - next/link for navigation
 * - lib/domain-colors for accent colors
 */
import Link from 'next/link';
import { getDomainColor } from '@/lib/domain-colors';

interface HomeCardBaseProps {
  /** Unique ID used to build the detail page link. */
  id: string;
  /** Card title (bold, top). */
  title: string;
  /** Card description (muted, 1-line clamp). */
  description: string | null;
  /** Domain name for color accent and badge. */
  domain: string;
}

interface PodcastCardProps extends HomeCardBaseProps {
  variant: 'podcast';
  year: number;
  tags: string[];
}

interface SeriesCardProps extends HomeCardBaseProps {
  variant: 'series';
  episodeCount: number;
  completedCount: number;
}

export type HomeCardProps = PodcastCardProps | SeriesCardProps;

/**
 * Renders a unified home page card with domain-colored left accent border.
 *
 * @param props - Card props, discriminated by `variant`.
 * @returns A linked card element with domain accent styling.
 */
export function HomeCard(props: HomeCardProps) {
  const { id, variant, title, description, domain } = props;
  const color = getDomainColor(domain);
  const href = variant === 'podcast' ? `/podcast/${id}` : `/learning-path/${id}`;

  return (
    <Link href={href as string}>
      <div
        className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/20"
        style={{ borderLeftWidth: '3px', borderLeftColor: color.border }}
      >
        {/* Top row: domain badge + metadata */}
        <div className="mb-2 flex items-center justify-between">
          <span
            className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {domain}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {variant === 'podcast' ? props.year : `${props.episodeCount} episodes`}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-medium leading-snug">{title}</p>

        {/* Description */}
        {description && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{description}</p>
        )}

        {/* Bottom metadata — variant-specific */}
        {variant === 'podcast' && props.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {props.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {variant === 'series' && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-border/40">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${props.episodeCount > 0 ? Math.round((props.completedCount / props.episodeCount) * 100) : 0}%`,
                  backgroundColor: color.border,
                }}
                role="progressbar"
                aria-valuenow={
                  props.episodeCount > 0
                    ? Math.round((props.completedCount / props.episodeCount) * 100)
                    : 0
                }
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/components/home/home-card.test.tsx`
Expected: PASS — all 8 tests green

- [ ] **Step 5: Commit**

```bash
git add components/home/home-card.tsx __tests__/unit/components/home/home-card.test.tsx
git commit -m "feat: add unified HomeCard component with domain color accents"
```

---

## Task 3: Update Home Page + Revert PodcastGrid columns prop

**Files:**

- Modify: `app/(public)/page.tsx`
- Modify: `components/library/podcast-grid.tsx`

- [ ] **Step 1: Update home page to use HomeCard with StaggeredGrid**

Replace the current `PodcastGrid` and `PathCard` usage with `HomeCard` lists inside `StaggeredGrid`. Simplify the Prisma data mapping (drop unused fields). Remove unused imports (`PodcastGrid`, `PathCard`, `PodcastData`).

Key changes to `app/(public)/page.tsx`:

- Remove imports: `PodcastGrid`, `PathCard`, `PodcastData`
- Add imports: `HomeCard` from `@/components/home/home-card`, `StaggeredGrid`/`StaggeredGridItem` from `@/components/ui/staggered-grid`
- Simplify `recentPodcasts` Prisma query: add `select` to only fetch `id`, `title`, `description`, `domain`, `year`, `tags`
- Replace both column sections with `StaggeredGrid` wrapping `HomeCard` items
- Add empty states for both columns

- [ ] **Step 2: Revert PodcastGrid columns prop**

In `components/library/podcast-grid.tsx`:

- Remove the `columns` prop from `PodcastGridProps`
- Remove the `columns` parameter from the function signature
- Revert the grid className back to the original: `"grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"`

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: Clean — no errors

- [ ] **Step 4: Run all affected tests**

Run: `npx vitest run __tests__/unit/lib/domain-colors.test.ts __tests__/unit/components/home/home-card.test.tsx`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add app/(public)/page.tsx components/library/podcast-grid.tsx
git commit -m "feat: wire unified HomeCard into home page, revert PodcastGrid columns prop"
```

---

## Task 4: Visual Verification

- [ ] **Step 1: Run dev server and verify visually**

Run: `npm run dev`

Check:

- Home page shows two-column layout with uniform card style
- Left column: podcast cards with domain-colored left border, color-matched badge, title, description, tags
- Right column: learning series cards with same skeleton, progress bar instead of tags
- Cards stagger in with entrance animation
- Both light and dark mode look acceptable
- Empty states render when no content exists

- [ ] **Step 2: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: All tests pass
