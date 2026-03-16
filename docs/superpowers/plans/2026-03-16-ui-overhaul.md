# UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Podcast Hub v2's visual identity and interaction layer — new Warm Stone color palette, unified sidebar, Motion animation system, new shadcn/ui components, and page-by-page motion upgrades.

**Architecture:** Layered approach — foundation first (design tokens, animation utils, dependency install), then structural changes (unified sidebar replacing split nav), then motion layer (page transitions, staggered grids, micro-interactions), then page-specific enhancements. Each layer builds on the previous.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Motion (formerly Framer Motion), shadcn/ui, Zustand, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-16-ui-overhaul-design.md`

---

## Chunk 1: Foundation — Design Tokens, Dependencies & Animation Utilities

### Task 1: Install dependencies and new shadcn/ui components

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install Motion library**

```bash
npm install motion
```

- [ ] **Step 2: Install new shadcn/ui components**

```bash
npx shadcn@latest add command accordion avatar breadcrumb progress switch popover
```

- [ ] **Step 3: Verify installation**

```bash
npm run build 2>&1 | head -20
```

Expected: Build succeeds. New component files exist in `components/ui/`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/ui/
git commit -m "chore: install motion and new shadcn/ui components"
```

---

### Task 2: Update design tokens — Warm Stone color palette

**Files:**

- Modify: `app/globals.css`

- [ ] **Step 1: Write test to verify CSS loads without errors**

```bash
npm run build 2>&1 | head -20
```

Expected: No CSS parse errors.

- [ ] **Step 2: Replace `:root` color tokens with Warm Stone light mode palette**

In `app/globals.css`, find the `:root { ... }` block and replace it with:

```css
:root {
  --background: oklch(0.985 0.002 75);
  --foreground: oklch(0.147 0.004 49.25);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.147 0.004 49.25);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.147 0.004 49.25);
  --primary: oklch(0.705 0.191 47.604);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.97 0.001 106.424);
  --secondary-foreground: oklch(0.444 0.011 73.639);
  --muted: oklch(0.97 0.001 106.424);
  --muted-foreground: oklch(0.637 0.011 73.639);
  --accent: oklch(0.962 0.059 95.277);
  --accent-foreground: oklch(0.344 0.06 58.147);
  --destructive: oklch(0.637 0.237 25.331);
  --border: oklch(0.923 0.003 48.717);
  --input: oklch(0.869 0.005 56.366);
  --ring: oklch(0.705 0.191 47.604);
  --chart-1: oklch(0.705 0.191 47.604);
  --chart-2: oklch(0.82 0.17 84.429);
  --chart-3: oklch(0.905 0.154 98.111);
  --chart-4: oklch(0.637 0.011 73.639);
  --chart-5: oklch(0.869 0.005 56.366);
  --radius: 0.75rem;
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.444 0.011 73.639);
  --sidebar-primary: oklch(0.705 0.191 47.604);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.962 0.059 95.277);
  --sidebar-accent-foreground: oklch(0.344 0.06 58.147);
  --sidebar-border: oklch(0.923 0.003 48.717);
  --sidebar-ring: oklch(0.705 0.191 47.604);
}
```

- [ ] **Step 3: Replace `.dark` block with Warm Stone dark mode palette**

Find the `.dark { ... }` block and replace it with:

```css
.dark {
  --background: oklch(0.137 0.005 56.366);
  --foreground: oklch(0.985 0.002 75);
  --card: oklch(0.147 0.004 49.25);
  --card-foreground: oklch(0.985 0.002 75);
  --popover: oklch(0.147 0.004 49.25);
  --popover-foreground: oklch(0.985 0.002 75);
  --primary: oklch(0.705 0.191 47.604);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.216 0.006 56.043);
  --secondary-foreground: oklch(0.869 0.005 56.366);
  --muted: oklch(0.216 0.006 56.043);
  --muted-foreground: oklch(0.637 0.011 73.639);
  --accent: oklch(0.28 0.04 55 / 40%);
  --accent-foreground: oklch(0.893 0.101 70.67);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.216 0.006 56.043);
  --input: oklch(0.444 0.011 73.639);
  --ring: oklch(0.705 0.191 47.604);
  --chart-1: oklch(0.705 0.191 47.604);
  --chart-2: oklch(0.82 0.17 84.429);
  --chart-3: oklch(0.905 0.154 98.111);
  --chart-4: oklch(0.637 0.011 73.639);
  --chart-5: oklch(0.869 0.005 56.366);
  --sidebar: oklch(0.147 0.004 49.25);
  --sidebar-foreground: oklch(0.869 0.005 56.366);
  --sidebar-primary: oklch(0.705 0.191 47.604);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.216 0.006 56.043);
  --sidebar-accent-foreground: oklch(0.985 0.002 75);
  --sidebar-border: oklch(0.216 0.006 56.043);
  --sidebar-ring: oklch(0.705 0.191 47.604);
}
```

- [ ] **Step 4: Add shadow tokens to `@theme inline` block**

In `app/globals.css`, add these shadow tokens inside the `@theme inline { ... }` block:

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04);
```

- [ ] **Step 5: Verify build succeeds with new tokens**

```bash
npm run build 2>&1 | head -20
```

Expected: Build succeeds. App renders with warm stone colors.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat: apply Warm Stone color palette to design tokens"
```

---

### Task 3: Create animation utilities module

**Files:**

- Create: `lib/animation.ts`
- Create: `hooks/use-reduced-motion.ts`
- Test: `__tests__/unit/lib/animation.test.ts`
- Test: `__tests__/unit/hooks/use-reduced-motion.test.ts`

- [ ] **Step 1: Write test for animation tokens**

Create `__tests__/unit/lib/animation.test.ts`:

```typescript
/**
 * Tests for centralized animation tokens.
 *
 * Verifies that animation transition configs and variant definitions
 * are correctly structured for Motion library consumption.
 */
import { describe, it, expect } from 'vitest';
import { transitions, variants, getTransition } from '@/lib/animation';

describe('animation tokens', () => {
  describe('transitions', () => {
    it('should export fast transition with duration and ease', () => {
      expect(transitions.fast).toEqual({
        duration: 0.15,
        ease: [0.25, 0.1, 0.25, 1],
      });
    });

    it('should export spring-based normal transition', () => {
      expect(transitions.normal).toMatchObject({
        type: 'spring',
        stiffness: 80,
        damping: 10,
      });
    });

    it('should export spring-based slow transition', () => {
      expect(transitions.slow).toMatchObject({
        type: 'spring',
        stiffness: 60,
        damping: 12,
      });
    });

    it('should export spring-based emphasis transition', () => {
      expect(transitions.emphasis).toMatchObject({
        type: 'spring',
        stiffness: 50,
        damping: 8,
      });
    });
  });

  describe('variants', () => {
    it('should export fadeUp variant with hidden and visible states', () => {
      expect(variants.fadeUp.hidden).toEqual({ opacity: 0, y: 12 });
      expect(variants.fadeUp.visible).toEqual({ opacity: 1, y: 0 });
    });

    it('should export fadeIn variant', () => {
      expect(variants.fadeIn.hidden).toEqual({ opacity: 0 });
      expect(variants.fadeIn.visible).toEqual({ opacity: 1 });
    });

    it('should export scaleIn variant', () => {
      expect(variants.scaleIn.hidden).toEqual({ opacity: 0, scale: 0.95 });
      expect(variants.scaleIn.visible).toEqual({ opacity: 1, scale: 1 });
    });

    it('should export slideLeft and slideRight variants', () => {
      expect(variants.slideLeft.hidden).toHaveProperty('x', -20);
      expect(variants.slideRight.hidden).toHaveProperty('x', 20);
    });
  });

  describe('getTransition', () => {
    it('should return the named transition config', () => {
      expect(getTransition('fast')).toEqual(transitions.fast);
    });

    it('should return reduced motion config when reduced is true', () => {
      const result = getTransition('slow', true);
      expect(result).toEqual({ duration: 0 });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/lib/animation.test.ts
```

Expected: FAIL — module `@/lib/animation` does not exist.

- [ ] **Step 3: Implement animation tokens**

Create `lib/animation.ts`:

```typescript
/**
 * Centralized animation tokens for the Motion library.
 *
 * Key responsibilities:
 * - Define reusable transition configs (timing, easing, spring physics)
 * - Define reusable animation variants (fadeUp, fadeIn, scaleIn, slide)
 * - Provide reduced-motion-aware transition getter
 *
 * Usage:
 *   import { transitions, variants, getTransition } from '@/lib/animation';
 *   <motion.div variants={variants.fadeUp} transition={getTransition('normal')} />
 */

/** Transition presets for consistent animation timing across the app. */
export const transitions = {
  /** 150ms ease-out — hovers, focus states, micro-interactions. */
  fast: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
  /** Spring — tab switches, panel reveals. */
  normal: { type: 'spring' as const, stiffness: 80, damping: 10, mass: 1 },
  /** Spring — page transitions, layout shifts. */
  slow: { type: 'spring' as const, stiffness: 60, damping: 12, mass: 1 },
  /** Spring — shared element transitions, hero reveals. */
  emphasis: { type: 'spring' as const, stiffness: 50, damping: 8, mass: 1 },
} as const;

/** Reduced-motion fallback — instant state change with no animation. */
const REDUCED_MOTION_TRANSITION = { duration: 0 } as const;

/** Animation variant presets for common enter/exit patterns. */
export const variants = {
  /** Fade in from below (12px). */
  fadeUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  /** Simple opacity fade. */
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  /** Scale up from 95% with fade. */
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  /** Slide in from left (20px). */
  slideLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  /** Slide in from right (20px). */
  slideRight: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },
} as const;

/** Stagger config for container variants. */
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
} as const;

/**
 * Returns a transition config, respecting reduced motion preference.
 *
 * @param name - The transition preset name (fast, normal, slow, emphasis).
 * @param reducedMotion - Whether the user prefers reduced motion.
 * @returns The transition config object for Motion.
 */
export function getTransition(name: keyof typeof transitions, reducedMotion = false) {
  if (reducedMotion) return REDUCED_MOTION_TRANSITION;
  return transitions[name];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/animation.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Write test for useReducedMotion hook**

Create `__tests__/unit/hooks/use-reduced-motion.test.ts`:

```typescript
/**
 * Tests for the useReducedMotion hook.
 *
 * Verifies the hook correctly reads the prefers-reduced-motion media query.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

describe('useReducedMotion', () => {
  const mockMatchMedia = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('matchMedia', mockMatchMedia);
  });

  it('should return true when prefers-reduced-motion is reduce', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('should return false when prefers-reduced-motion is no-preference', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/hooks/use-reduced-motion.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 7: Implement useReducedMotion hook**

Create `hooks/use-reduced-motion.ts`:

```typescript
/**
 * Hook to detect the user's reduced motion preference.
 *
 * Reads the `prefers-reduced-motion: reduce` media query and listens
 * for changes. Returns true when the user prefers reduced motion.
 *
 * @returns Whether the user has enabled reduced motion in OS settings.
 */
'use client';

import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/hooks/use-reduced-motion.test.ts
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/animation.ts hooks/use-reduced-motion.ts __tests__/unit/lib/animation.test.ts __tests__/unit/hooks/use-reduced-motion.test.ts
git commit -m "feat: add animation tokens and useReducedMotion hook"
```

---

### Task 4: Create reusable animated UI components

**Files:**

- Create: `components/ui/animated-tabs.tsx`
- Create: `components/ui/staggered-grid.tsx`
- Create: `components/ui/animated-skeleton.tsx`
- Create: `components/ui/animated-number.tsx`
- Create: `components/layout/page-transition.tsx`
- Test: `__tests__/unit/components/ui/staggered-grid.test.tsx`
- Test: `__tests__/unit/components/ui/animated-number.test.tsx`

- [ ] **Step 1: Write test for StaggeredGrid**

Create `__tests__/unit/components/ui/staggered-grid.test.tsx`:

```typescript
/**
 * Tests for the StaggeredGrid component.
 *
 * Verifies that children render inside a motion container
 * with stagger animation applied.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaggeredGrid } from '@/components/ui/staggered-grid';

describe('StaggeredGrid', () => {
  it('should render all children', () => {
    render(
      <StaggeredGrid className="grid-cols-3">
        <div data-testid="child-1">A</div>
        <div data-testid="child-2">B</div>
        <div data-testid="child-3">C</div>
      </StaggeredGrid>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('should apply grid className', () => {
    const { container } = render(
      <StaggeredGrid className="grid-cols-2 gap-4">
        <div>A</div>
      </StaggeredGrid>
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('grid-cols-2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/components/ui/staggered-grid.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement StaggeredGrid**

Create `components/ui/staggered-grid.tsx`:

```typescript
/**
 * Animated grid container with staggered child entry.
 *
 * Wraps children in a Motion-powered grid that staggers each child's
 * fadeUp animation by 40ms. Falls back to instant render when
 * reduced motion is preferred.
 */
'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { staggerContainer, variants, transitions } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface StaggeredGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggeredGrid({ children, className }: StaggeredGridProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={cn('grid', className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn('grid', className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

/** Wrap each grid item in this for the stagger effect. */
export function StaggeredGridItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={variants.fadeUp}
      transition={transitions.normal}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/components/ui/staggered-grid.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Write test for AnimatedNumber**

Create `__tests__/unit/components/ui/animated-number.test.tsx`:

```typescript
/**
 * Tests for the AnimatedNumber component.
 *
 * Verifies that the component renders the target number.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedNumber } from '@/components/ui/animated-number';

describe('AnimatedNumber', () => {
  beforeEach(() => {
    // Mock matchMedia to return reduced motion = true so we test the instant path
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it('should render the target value in reduced motion mode', () => {
    render(<AnimatedNumber value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should format with custom formatter', () => {
    render(
      <AnimatedNumber
        value={1234}
        formatter={(n) => n.toLocaleString()}
      />
    );
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/components/ui/animated-number.test.tsx
```

Expected: FAIL.

- [ ] **Step 7: Implement AnimatedNumber**

Create `components/ui/animated-number.tsx`:

```typescript
/**
 * Animated number counter component.
 *
 * Animates from 0 to the target value using Motion's useSpring.
 * Supports custom formatters (e.g., toLocaleString, percentage).
 * Falls back to instant display with reduced motion.
 */
'use client';

import { useEffect, useRef } from 'react';
import { useSpring, useTransform, motion, useMotionValue } from 'motion/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  className,
  formatter = (n) => Math.round(n).toString(),
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
  });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = formatter(latest);
      }
    });
    return unsubscribe;
  }, [springValue, formatter]);

  if (reducedMotion) {
    return <span className={className}>{formatter(value)}</span>;
  }

  return <span ref={ref} className={className}>{formatter(0)}</span>;
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/components/ui/animated-number.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Implement AnimatedTabs**

Create `components/ui/animated-tabs.tsx`:

```typescript
/**
 * Tab component with animated sliding indicator and directional content transitions.
 *
 * Uses Motion layoutId for the active indicator and AnimatePresence
 * for content crossfade with directional slide based on tab index.
 */
'use client';

import { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { transitions } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  layoutId?: string;
}

export function AnimatedTabs({
  tabs,
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  layoutId = 'tab-indicator',
}: AnimatedTabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue ?? tabs[0]?.value);
  const [direction, setDirection] = useState(0);
  const reducedMotion = useReducedMotion();

  const activeTab = controlledValue ?? internalTab;
  const activeIndex = tabs.findIndex((t) => t.value === activeTab);
  const activeContent = tabs.find((t) => t.value === activeTab)?.content;

  const handleTabChange = (value: string) => {
    const newIndex = tabs.findIndex((t) => t.value === value);
    setDirection(newIndex > activeIndex ? 1 : -1);
    setInternalTab(value);
    onValueChange?.(value);
  };

  return (
    <div className={className}>
      {/* Tab list */}
      <div className="relative flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {activeTab === tab.value && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                transition={transitions.normal}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={reducedMotion ? undefined : { opacity: 0, x: direction * 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, x: direction * -20 }}
          transition={transitions.fast}
          className="mt-4"
        >
          {activeContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 10: Implement AnimatedSkeleton**

Create `components/ui/animated-skeleton.tsx`:

```typescript
/**
 * Skeleton with animated morphing transition to real content.
 *
 * Wraps AnimatePresence so the skeleton fades out and real content
 * fades in at the same position. Provides a seamless loading experience.
 */
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface AnimatedSkeletonProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedSkeleton({
  isLoading,
  skeleton,
  children,
  className,
}: AnimatedSkeletonProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{isLoading ? skeleton : children}</div>;
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 11: Implement PageTransition**

Create `components/layout/page-transition.tsx`:

```typescript
/**
 * Page transition wrapper using Motion AnimatePresence.
 *
 * Wraps page content to apply fade + slide-up enter animation
 * and fade-out exit animation on route changes.
 */
'use client';

import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { transitions, variants } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      initial="hidden"
      animate="visible"
      variants={variants.fadeUp}
      transition={transitions.slow}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 12: Run all tests**

```bash
npx vitest run __tests__/unit/components/ui/staggered-grid.test.tsx __tests__/unit/components/ui/animated-number.test.tsx __tests__/unit/lib/animation.test.ts __tests__/unit/hooks/use-reduced-motion.test.ts
```

Expected: All PASS.

- [ ] **Step 13: Commit**

```bash
git add components/ui/animated-tabs.tsx components/ui/staggered-grid.tsx components/ui/animated-skeleton.tsx components/ui/animated-number.tsx components/layout/page-transition.tsx __tests__/unit/components/ui/
git commit -m "feat: add animated UI components (tabs, grid, skeleton, number, page transition)"
```

---

## Chunk 2: Unified Sidebar

### Task 5: Create sidebar nav item component

**Files:**

- Create: `components/layout/sidebar-nav-item.tsx`
- Test: `__tests__/unit/components/layout/sidebar-nav-item.test.tsx`

- [ ] **Step 1: Write test for SidebarNavItem**

Create `__tests__/unit/components/layout/sidebar-nav-item.test.tsx`:

```typescript
/**
 * Tests for the SidebarNavItem component.
 *
 * Verifies active/inactive states, link rendering, and collapsed mode.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarNavItem } from '@/components/layout/sidebar-nav-item';
import { Home } from 'lucide-react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('SidebarNavItem', () => {
  it('should render link with label and icon', () => {
    render(<SidebarNavItem href="/" label="Home" icon={Home} isActive />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });

  it('should apply active styles when isActive is true', () => {
    render(<SidebarNavItem href="/" label="Home" icon={Home} isActive />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-accent');
  });

  it('should apply inactive styles when isActive is false', () => {
    render(<SidebarNavItem href="/library" label="Library" icon={Home} isActive={false} />);
    const link = screen.getByRole('link');
    expect(link.className).not.toContain('bg-accent');
  });

  it('should hide label when collapsed', () => {
    render(<SidebarNavItem href="/" label="Home" icon={Home} isActive collapsed />);
    const label = screen.queryByText('Home');
    expect(label).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/components/layout/sidebar-nav-item.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement SidebarNavItem**

Create `components/layout/sidebar-nav-item.tsx`:

```typescript
/**
 * Individual navigation item for the unified sidebar.
 *
 * Renders a link with an icon and optional label. Supports
 * active state highlighting and collapsed mode (icon only with tooltip).
 */
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed = false,
  onClick,
}: SidebarNavItemProps) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/components/layout/sidebar-nav-item.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar-nav-item.tsx __tests__/unit/components/layout/sidebar-nav-item.test.tsx
git commit -m "feat: add SidebarNavItem component with active state and collapsed mode"
```

---

### Task 6: Create sidebar now-playing widget

**Files:**

- Create: `components/layout/sidebar-now-playing.tsx`
- Test: `__tests__/unit/components/layout/sidebar-now-playing.test.tsx`

- [ ] **Step 1: Write test for SidebarNowPlaying**

Create `__tests__/unit/components/layout/sidebar-now-playing.test.tsx`:

```typescript
/**
 * Tests for the SidebarNowPlaying widget.
 *
 * Verifies rendering based on player store state and collapsed mode.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarNowPlaying } from '@/components/layout/sidebar-now-playing';

const mockPlayerStore = {
  currentPodcast: null as { id: string; title: string; thumbnailUrl?: string | null } | null,
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  play: vi.fn(),
  pause: vi.fn(),
};

vi.mock('@/stores/player-store', () => ({
  usePlayerStore: () => mockPlayerStore,
}));

describe('SidebarNowPlaying', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerStore.currentPodcast = null;
  });

  it('should render nothing when no podcast is loaded', () => {
    const { container } = render(<SidebarNowPlaying />);
    expect(container.firstChild).toBeNull();
  });

  it('should render podcast title when a podcast is playing', () => {
    mockPlayerStore.currentPodcast = { id: '1', title: 'Test Episode' };
    render(<SidebarNowPlaying />);
    expect(screen.getByText('Test Episode')).toBeInTheDocument();
  });

  it('should show progress bar', () => {
    mockPlayerStore.currentPodcast = { id: '1', title: 'Test Episode' };
    render(<SidebarNowPlaying />);
    expect(screen.getByTestId('now-playing-progress')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/components/layout/sidebar-now-playing.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement SidebarNowPlaying**

Create `components/layout/sidebar-now-playing.tsx`:

```typescript
/**
 * Now-playing widget embedded in the unified sidebar.
 *
 * Shows the currently playing episode with thumbnail, title,
 * play/pause button, and progress bar. Hidden when nothing is playing.
 * In collapsed mode, shows only a circular play/pause button.
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { Button } from '@/components/ui/button';
import { resolveStorageUrl } from '@/lib/storage-url';
import { cn } from '@/lib/utils';

interface SidebarNowPlayingProps {
  collapsed?: boolean;
}

export function SidebarNowPlaying({ collapsed = false }: SidebarNowPlayingProps) {
  const { currentPodcast, isPlaying, currentTime, duration, play, pause } =
    usePlayerStore();

  if (!currentPodcast) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={isPlaying ? pause : play}
          className="relative size-8 rounded-full ring-2 ring-primary/30"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5 ml-0.5" />
          )}
          {/* Circular progress ring */}
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 32 32"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(progressPercent / 100) * 88} 88`}
              className="text-primary"
            />
          </svg>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-xl bg-accent/50 border border-accent p-3">
      <Link
        href={`/podcast/${currentPodcast.id}`}
        className="flex items-center gap-2.5 mb-2"
      >
        {currentPodcast.thumbnailUrl && (
          <div className="relative size-9 shrink-0 overflow-hidden rounded-md">
            <Image
              src={resolveStorageUrl(currentPodcast.thumbnailUrl)}
              alt={currentPodcast.title}
              fill
              className="object-cover"
              sizes="36px"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {currentPodcast.title}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatTime(currentTime)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            isPlaying ? pause() : play();
          }}
          className="size-7 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="size-3" />
          ) : (
            <Play className="size-3 ml-px" />
          )}
        </Button>
      </Link>
      {/* Progress bar */}
      <div
        className="h-1 rounded-full bg-border overflow-hidden"
        data-testid="now-playing-progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

/** Formats seconds to mm:ss display. */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/components/layout/sidebar-now-playing.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar-now-playing.tsx __tests__/unit/components/layout/sidebar-now-playing.test.tsx
git commit -m "feat: add SidebarNowPlaying widget with progress and collapsed mode"
```

---

### Task 7: Create sidebar user profile component

**Files:**

- Create: `components/layout/sidebar-user-profile.tsx`
- Test: `__tests__/unit/components/layout/sidebar-user-profile.test.tsx`

- [ ] **Step 1: Write test for SidebarUserProfile**

Create `__tests__/unit/components/layout/sidebar-user-profile.test.tsx`:

```typescript
/**
 * Tests for the SidebarUserProfile component.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarUserProfile } from '@/components/layout/sidebar-user-profile';

describe('SidebarUserProfile', () => {
  it('should render user name and role', () => {
    render(<SidebarUserProfile name="Rosh" role="Admin" />);
    expect(screen.getByText('Rosh')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should render initials in avatar', () => {
    render(<SidebarUserProfile name="Rosh" role="Admin" />);
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('should hide name when collapsed', () => {
    render(<SidebarUserProfile name="Rosh" role="Admin" collapsed />);
    expect(screen.queryByText('Rosh')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/components/layout/sidebar-user-profile.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement SidebarUserProfile**

Create `components/layout/sidebar-user-profile.tsx`:

```typescript
/**
 * User profile section at the bottom of the unified sidebar.
 *
 * Shows user avatar, name, and role. In collapsed mode, shows avatar only.
 */
'use client';

import { Settings } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarUserProfileProps {
  name: string;
  role: string;
  collapsed?: boolean;
}

export function SidebarUserProfile({
  name,
  role,
  collapsed = false,
}: SidebarUserProfileProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/profile">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {name} · {role}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-3">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" asChild>
            <Link href="/profile">
              <Settings className="size-3.5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/components/layout/sidebar-user-profile.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar-user-profile.tsx __tests__/unit/components/layout/sidebar-user-profile.test.tsx
git commit -m "feat: add SidebarUserProfile component"
```

---

### Task 8: Create unified sidebar

**Files:**

- Create: `components/layout/unified-sidebar.tsx`
- Create: `components/layout/mobile-top-bar.tsx`
- Create: `components/layout/mobile-bottom-player.tsx`
- Test: `__tests__/unit/components/layout/unified-sidebar.test.tsx`

- [ ] **Step 1: Write test for UnifiedSidebar**

Create `__tests__/unit/components/layout/unified-sidebar.test.tsx`:

```typescript
/**
 * Tests for the UnifiedSidebar component.
 *
 * Verifies sidebar renders with all navigation sections,
 * now-playing widget, and user profile.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('@/stores/player-store', () => ({
  usePlayerStore: () => ({
    currentPodcast: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    play: vi.fn(),
    pause: vi.fn(),
  }),
}));

describe('UnifiedSidebar', () => {
  it('should render the app logo', () => {
    render(<UnifiedSidebar userName="Rosh" userRole="Admin" />);
    expect(screen.getByText('PodcastHub')).toBeInTheDocument();
  });

  it('should render main navigation links', () => {
    render(<UnifiedSidebar userName="Rosh" userRole="Admin" />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Learning Paths')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should render personal section links', () => {
    render(<UnifiedSidebar userName="Rosh" userRole="Admin" />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('should render admin section when isAdmin is true', () => {
    render(<UnifiedSidebar userName="Rosh" userRole="Admin" isAdmin />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('should not render admin section when isAdmin is false', () => {
    render(<UnifiedSidebar userName="Rosh" userRole="User" />);
    expect(screen.queryByText('Dashboard')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/components/layout/unified-sidebar.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement UnifiedSidebar**

Create `components/layout/unified-sidebar.tsx`:

```typescript
/**
 * Unified sidebar navigation for the entire application.
 *
 * Replaces both PublicNav and AdminSidebar with a single component.
 * Features: sectioned navigation (Main, Your Stuff, Admin), command
 * palette trigger, now-playing widget, user profile, and collapse toggle.
 * On mobile, hidden by default with a hamburger in MobileTopBar.
 *
 * @see docs/superpowers/specs/2026-03-16-ui-overhaul-design.md Section 2
 */
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Home,
  Library,
  Route,
  Search,
  BarChart3,
  User,
  LayoutDashboard,
  Upload,
  Users,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarNavItem } from '@/components/layout/sidebar-nav-item';
import { SidebarNowPlaying } from '@/components/layout/sidebar-now-playing';
import { SidebarUserProfile } from '@/components/layout/sidebar-user-profile';
import { cn } from '@/lib/utils';
import { transitions } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Width constants for expanded and collapsed states. */
const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 56;
const STORAGE_KEY = 'sidebar-collapsed';

interface UnifiedSidebarProps {
  userName: string;
  userRole: string;
  isAdmin?: boolean;
}

const mainLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/bulletins', label: 'Library', icon: Library },
  { href: '/learning-path', label: 'Learning Paths', icon: Route },
  { href: '/search', label: 'Search', icon: Search },
];

const personalLinks = [
  { href: '/progress', label: 'Progress', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: User },
];

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/upload', label: 'Upload', icon: Upload },
  { href: '/admin/learning-graphs', label: 'Learning Paths', icon: Route },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function UnifiedSidebar({ userName, userRole, isAdmin = false }: UnifiedSidebarProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  const isActive = (href: string) => {
    if (href === '/' || href === '/admin') return pathname === href;
    return pathname.startsWith(href);
  };

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const SidebarWrapper = reducedMotion ? 'aside' : motion.aside;
  const wrapperProps = reducedMotion
    ? { style: { width: sidebarWidth } }
    : { animate: { width: sidebarWidth }, transition: transitions.slow };

  return (
    <SidebarWrapper
      {...(wrapperProps as Record<string, unknown>)}
      className={cn(
        'hidden md:flex md:flex-col md:border-r md:bg-sidebar md:min-h-screen',
        'shrink-0 overflow-hidden'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header: Logo + Command Palette trigger */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          <Link href="/" className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Library className="size-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-sm font-bold text-sidebar-foreground">
                PodcastHub
              </span>
            )}
          </Link>
          {!collapsed && (
            <kbd className="pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Main navigation */}
        <div className="flex-1 overflow-y-auto px-2">
          {!collapsed && (
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Main
            </p>
          )}
          <nav className="flex flex-col gap-0.5">
            {mainLinks.map((link) => (
              <SidebarNavItem
                key={link.href}
                {...link}
                isActive={isActive(link.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>

          <Separator className="my-3" />

          {/* Personal section */}
          {!collapsed && (
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your Stuff
            </p>
          )}
          <nav className="flex flex-col gap-0.5">
            {personalLinks.map((link) => (
              <SidebarNavItem
                key={link.href}
                {...link}
                isActive={isActive(link.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {/* Admin section */}
          {isAdmin && (
            <>
              <Separator className="my-3" />
              {!collapsed && (
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
              )}
              <nav className="flex flex-col gap-0.5">
                {adminLinks.map((link) => (
                  <SidebarNavItem
                    key={link.href}
                    {...link}
                    isActive={isActive(link.href)}
                    collapsed={collapsed}
                  />
                ))}
              </nav>
            </>
          )}
        </div>

        {/* Now Playing Widget */}
        <SidebarNowPlaying collapsed={collapsed} />

        <Separator />

        {/* User profile */}
        <SidebarUserProfile name={userName} role={userRole} collapsed={collapsed} />

        {/* Collapse toggle */}
        <div className={cn('px-2 pb-2', collapsed ? 'flex justify-center' : '')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="size-7"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </SidebarWrapper>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/components/layout/unified-sidebar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Extract shared navigation config**

Create `lib/navigation-config.ts`:

```typescript
/**
 * Shared navigation link configuration for sidebar and mobile nav.
 *
 * Single source of truth for all navigation items across
 * UnifiedSidebar and MobileTopBar.
 */
import {
  Home,
  Library,
  Route,
  Search,
  BarChart3,
  User,
  LayoutDashboard,
  Upload,
  Users,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const mainLinks: NavLink[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/bulletins', label: 'Library', icon: Library },
  { href: '/learning-path', label: 'Learning Paths', icon: Route },
  { href: '/search', label: 'Search', icon: Search },
];

export const personalLinks: NavLink[] = [
  { href: '/progress', label: 'Progress', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: User },
];

export const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/upload', label: 'Upload', icon: Upload },
  { href: '/admin/learning-graphs', label: 'Learning Paths', icon: Route },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

/** Check if a route is active based on pathname. */
export function isRouteActive(href: string, pathname: string): boolean {
  if (href === '/' || href === '/admin') return pathname === href;
  return pathname.startsWith(href);
}
```

Then update `components/layout/unified-sidebar.tsx` to import from `@/lib/navigation-config` instead of defining links inline.

- [ ] **Step 6: Implement MobileTopBar**

Create `components/layout/mobile-top-bar.tsx`:

```typescript
/**
 * Slim mobile top bar with hamburger menu trigger.
 *
 * Visible only on screens < md breakpoint. Contains the app logo,
 * hamburger to open sidebar sheet, and theme toggle.
 * Shares navigation config with UnifiedSidebar via lib/navigation-config.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, Library, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { SidebarNavItem } from '@/components/layout/sidebar-nav-item';
import { SidebarNowPlaying } from '@/components/layout/sidebar-now-playing';
import { SidebarUserProfile } from '@/components/layout/sidebar-user-profile';
import { mainLinks, personalLinks, adminLinks, isRouteActive } from '@/lib/navigation-config';

interface MobileTopBarProps {
  userName: string;
  userRole: string;
  isAdmin?: boolean;
}

export function MobileTopBar({ userName, userRole, isAdmin = false }: MobileTopBarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-12 items-center justify-between border-b bg-background px-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-4 py-4">
              <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
                <Library className="size-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold">PodcastHub</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Main
              </p>
              <nav className="flex flex-col gap-0.5">
                {mainLinks.map((link) => (
                  <SidebarNavItem
                    key={link.href}
                    {...link}
                    isActive={isRouteActive(link.href, pathname)}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </nav>
              <Separator className="my-3" />
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your Stuff
              </p>
              <nav className="flex flex-col gap-0.5">
                {personalLinks.map((link) => (
                  <SidebarNavItem
                    key={link.href}
                    {...link}
                    isActive={isRouteActive(link.href, pathname)}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </nav>
              {isAdmin && (
                <>
                  <Separator className="my-3" />
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Admin
                  </p>
                  <nav className="flex flex-col gap-0.5">
                    {adminLinks.map((link) => (
                      <SidebarNavItem
                        key={link.href}
                        {...link}
                        isActive={isRouteActive(link.href, pathname)}
                        onClick={() => setOpen(false)}
                      />
                    ))}
                  </nav>
                </>
              )}
            </div>
            <SidebarNowPlaying />
            <Separator />
            <SidebarUserProfile name={userName} role={userRole} />
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/" className="flex items-center gap-1.5">
        <Library className="size-4 text-primary" />
        <span className="text-sm font-bold">PodcastHub</span>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Implement MobileBottomPlayer**

Create `components/layout/mobile-bottom-player.tsx`:

```typescript
/**
 * Fixed bottom player bar for mobile viewports.
 *
 * Shows when audio is playing on screens < md. Displays thumbnail,
 * truncated title, play/pause, and slim progress bar.
 * Tapping navigates to the full podcast detail page.
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { Button } from '@/components/ui/button';
import { resolveStorageUrl } from '@/lib/storage-url';

export function MobileBottomPlayer() {
  const { currentPodcast, isPlaying, currentTime, duration, play, pause } =
    usePlayerStore();

  if (!currentPodcast) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <Link
        href={`/podcast/${currentPodcast.id}`}
        className="flex items-center gap-3 px-3 py-2"
      >
        {currentPodcast.thumbnailUrl && (
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
            <Image
              src={resolveStorageUrl(currentPodcast.thumbnailUrl)}
              alt={currentPodcast.title}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        )}
        <p className="flex-1 truncate text-sm font-medium">{currentPodcast.title}</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            isPlaying ? pause() : play();
          }}
          className="size-8 shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add components/layout/unified-sidebar.tsx components/layout/mobile-top-bar.tsx components/layout/mobile-bottom-player.tsx __tests__/unit/components/layout/unified-sidebar.test.tsx
git commit -m "feat: add unified sidebar, mobile top bar, and mobile bottom player"
```

---

### Task 9: Create command palette

**Files:**

- Create: `components/layout/command-palette.tsx`
- Test: `__tests__/unit/components/layout/command-palette.test.tsx`

- [ ] **Step 1: Write test for CommandPalette**

Create `__tests__/unit/components/layout/command-palette.test.tsx`:

```typescript
/**
 * Tests for the CommandPalette component.
 *
 * Verifies keyboard shortcut activation and section rendering.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '@/components/layout/command-palette';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

describe('CommandPalette', () => {
  it('should render nothing when closed', () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
  });

  it('should open on Cmd+K', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('should show page navigation options', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/components/layout/command-palette.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement CommandPalette**

Create `components/layout/command-palette.tsx`:

```typescript
/**
 * Command palette (⌘K) for quick navigation and actions.
 *
 * Uses shadcn Command component (cmdk). Sections: Pages, Actions.
 * Animated entry with scale + fade via Motion.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Home,
  Library,
  Route,
  Search,
  User,
  BarChart3,
  Sun,
  Moon,
  LayoutDashboard,
  Upload,
  Users,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface CommandPaletteProps {
  isAdmin?: boolean;
}

export function CommandPalette({ isAdmin = false }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, episodes, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => navigate('/')}>
            <Home className="mr-2 size-4" />
            Home
          </CommandItem>
          <CommandItem onSelect={() => navigate('/bulletins')}>
            <Library className="mr-2 size-4" />
            Library
          </CommandItem>
          <CommandItem onSelect={() => navigate('/learning-path')}>
            <Route className="mr-2 size-4" />
            Learning Paths
          </CommandItem>
          <CommandItem onSelect={() => navigate('/search')}>
            <Search className="mr-2 size-4" />
            Search
          </CommandItem>
          <CommandItem onSelect={() => navigate('/profile')}>
            <User className="mr-2 size-4" />
            Profile
          </CommandItem>
          <CommandItem onSelect={() => navigate('/progress')}>
            <BarChart3 className="mr-2 size-4" />
            Progress
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
              setOpen(false);
            }}
          >
            {theme === 'dark' ? (
              <Sun className="mr-2 size-4" />
            ) : (
              <Moon className="mr-2 size-4" />
            )}
            Toggle Theme
          </CommandItem>
        </CommandGroup>

        {isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              <CommandItem onSelect={() => navigate('/admin')}>
                <LayoutDashboard className="mr-2 size-4" />
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => navigate('/admin/upload')}>
                <Upload className="mr-2 size-4" />
                Upload
              </CommandItem>
              <CommandItem onSelect={() => navigate('/admin/users')}>
                <Users className="mr-2 size-4" />
                Users
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/components/layout/command-palette.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/layout/command-palette.tsx __tests__/unit/components/layout/command-palette.test.tsx
git commit -m "feat: add command palette (⌘K) with page navigation and actions"
```

---

### Task 10: Wire up unified sidebar into layouts

**Files:**

- Modify: `app/layout.tsx`
- Modify: `app/(public)/layout.tsx`
- Modify: `app/(admin)/layout.tsx`

- [ ] **Step 1: Update root layout to include CommandPalette**

In `app/layout.tsx`, add CommandPalette inside ThemeProvider:

```typescript
import { CommandPalette } from '@/components/layout/command-palette';

// Inside ThemeProvider, add:
<CommandPalette />
```

- [ ] **Step 2: Replace public layout**

**Note:** The `userName`, `userRole`, and `isAdmin` props should be read from the user's session (e.g., via cookies/JWT decoding in the server component layout). If session reading is not yet available, use placeholder values and add a `// TODO(auth): Replace with session data from getUserSession()` comment. The auth system already uses JWT cookies — read and decode them in the layout.

Replace `app/(public)/layout.tsx` with:

```typescript
/**
 * Layout for all public-facing pages in Podcast Hub.
 *
 * Renders the unified sidebar on desktop, mobile top bar + bottom player
 * on mobile, and page content in the main area with page transitions.
 */
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { MobileBottomPlayer } from '@/components/layout/mobile-bottom-player';
import { PageTransition } from '@/components/layout/page-transition';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <UnifiedSidebar userName="User" userRole="Member" />
      <div className="flex flex-1 flex-col">
        <MobileTopBar userName="User" userRole="Member" />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
        <MobileBottomPlayer />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace admin layout**

Replace `app/(admin)/layout.tsx` with:

```typescript
/**
 * Admin layout providing the unified sidebar and main content area.
 *
 * Uses the same UnifiedSidebar as public pages but with isAdmin
 * flag to show admin navigation section.
 */
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { PageTransition } from '@/components/layout/page-transition';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <UnifiedSidebar userName="Admin" userRole="Admin" isAdmin />
      <div className="flex flex-1 flex-col">
        <MobileTopBar userName="Admin" userRole="Admin" isAdmin />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds. Both public and admin layouts use unified sidebar.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/(public)/layout.tsx app/(admin)/layout.tsx
git commit -m "feat: wire unified sidebar and page transitions into layouts"
```

---

## Chunk 3: Motion Layer — Page-by-Page Enhancements

### Task 11: Add hover animations and staggered grid to podcast library

**Files:**

- Modify: `components/library/podcast-card.tsx`
- Modify: `components/library/podcast-grid.tsx`

- [ ] **Step 1: Add hover micro-interactions to PodcastCard**

In `components/library/podcast-card.tsx`, add:

- `active:scale-[0.98]` to the Card wrapper
- Replace `transition-shadow hover:shadow-lg` with `transition-all hover:shadow-md active:scale-[0.98]`
- Keep existing `group-hover:scale-105` on the image

```typescript
<Card className="h-full transition-all hover:shadow-md active:scale-[0.98]">
```

- [ ] **Step 2: Update PodcastGrid to use StaggeredGrid**

In `components/library/podcast-grid.tsx`, replace the plain `<div className="grid ...">` with `StaggeredGrid` and wrap each card in `StaggeredGridItem`:

```typescript
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';

// Replace the grid div with:
<StaggeredGrid className="grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {podcasts.map((podcast) => (
    <StaggeredGridItem key={podcast.id}>
      <PodcastCard {...podcast} />
    </StaggeredGridItem>
  ))}
</StaggeredGrid>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/library/podcast-card.tsx components/library/podcast-grid.tsx
git commit -m "feat: add staggered grid and hover animations to podcast library"
```

---

### Task 12: Add micro-interactions to audio player

**Files:**

- Modify: `components/audio-player/audio-player.tsx`

- [ ] **Step 1: Read current audio player to understand structure**

```bash
# Read the file to understand what to modify
```

- [ ] **Step 2: Add play/pause button press animation**

Add `active:scale-[0.97] transition-transform` to play/pause button.

- [ ] **Step 3: Add bookmark bounce animation**

Find the bookmark toggle button in the audio player or bookmark panel. Add Motion bounce on toggle:

```typescript
import { motion } from 'motion/react';

// Wrap the bookmark icon in:
<motion.span
  animate={isBookmarked ? { scale: [1, 1.3, 1] } : {}}
  transition={{ duration: 0.3 }}
>
  <Bookmark className="size-4" fill={isBookmarked ? 'currentColor' : 'none'} />
</motion.span>
```

- [ ] **Step 4: Add progress bar animation**

Use Motion's `animate={{ width }}` on the progress bar fill instead of static width:

```typescript
import { motion } from 'motion/react';

// Replace progress bar div with:
<motion.div
  className="h-full bg-primary rounded-full"
  animate={{ width: `${progressPercent}%` }}
  transition={{ duration: 0.1, ease: 'linear' }}
/>
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/audio-player/audio-player.tsx
git commit -m "feat: add micro-interactions to audio player (press, progress)"
```

---

### Task 13: Add animated tabs to podcast detail and learning path editor

**Files:**

- Modify: `app/(public)/podcast/[id]/page.tsx` (if using tabs)
- Modify: `components/learning-path/editor-tabs.tsx`

- [ ] **Step 1: Read current tab usage in podcast detail and editor-tabs**

Understand current tab implementation to replace with AnimatedTabs.

- [ ] **Step 2: Replace tab implementations with AnimatedTabs component**

Swap existing `Tabs`/`TabsList`/`TabsContent` with the new `AnimatedTabs`:

```typescript
import { AnimatedTabs } from '@/components/ui/animated-tabs';

<AnimatedTabs
  tabs={[
    { value: 'transcript', label: 'Transcript', content: <TranscriptViewer /> },
    { value: 'bulletin', label: 'Bulletin', content: <BulletinViewer /> },
    { value: 'bookmarks', label: 'Bookmarks', content: <BookmarkPanel /> },
  ]}
  layoutId="podcast-detail-tabs"
/>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/podcast/ components/learning-path/editor-tabs.tsx
git commit -m "feat: replace tabs with animated sliding indicator and directional transitions"
```

---

### Task 14: Add staggered animations to admin tables

**Files:**

- Modify: `components/admin/podcast-table.tsx`
- Modify: `components/admin/users-table.tsx`
- Modify: `components/admin/learning-graphs-table.tsx`

- [ ] **Step 1: Add staggered row animation to each table**

Wrap table body rows in Motion with stagger:

```typescript
import { motion } from 'motion/react';
import { variants, staggerContainer, transitions } from '@/lib/animation';

// Wrap <TableBody> content:
<motion.tbody
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  {rows.map((row) => (
    <motion.tr
      key={row.id}
      variants={variants.fadeUp}
      transition={transitions.normal}
      className="hover:bg-secondary/50 transition-colors"
    >
      ...
    </motion.tr>
  ))}
</motion.tbody>
```

- [ ] **Step 2: Add hover transition to all table rows**

Add `transition-colors hover:bg-secondary/50` to all table rows.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/admin/podcast-table.tsx components/admin/users-table.tsx components/admin/learning-graphs-table.tsx
git commit -m "feat: add staggered row animations and hover effects to admin tables"
```

---

### Task 15: Add scale-in animation to auth pages

**Files:**

- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/register/page.tsx`

- [ ] **Step 1: Wrap auth card in Motion scale-in animation**

```typescript
import { motion } from 'motion/react';
import { variants, transitions } from '@/lib/animation';

// Wrap the centered card:
<motion.div
  initial="hidden"
  animate="visible"
  variants={variants.scaleIn}
  transition={transitions.normal}
>
  {/* existing card content */}
</motion.div>
```

- [ ] **Step 2: Add button loading state with active:scale-[0.97]**

Add `active:scale-[0.97] transition-transform` to submit buttons.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/
git commit -m "feat: add scale-in animation to auth pages"
```

---

### Task 16: Add scroll-driven sticky header to podcast detail

**Files:**

- Modify: `app/(public)/podcast/[id]/page.tsx`

- [ ] **Step 1: Read podcast detail page structure**

Understand current layout to add sticky header morph on scroll.

- [ ] **Step 2: Add sticky header with scroll-driven blur**

Use Motion `useScroll` + `useTransform` for header that shrinks and gains backdrop blur:

```typescript
import { motion, useScroll, useTransform } from 'motion/react';

const { scrollY } = useScroll();
const headerHeight = useTransform(scrollY, [0, 100], [200, 64]);
const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);

<motion.header
  style={{ height: headerHeight }}
  className="sticky top-0 z-30 overflow-hidden"
>
  <motion.div
    style={{ opacity: headerOpacity }}
    className="absolute inset-0 bg-background/80 backdrop-blur-sm"
  />
  {/* Title content */}
</motion.header>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/podcast/
git commit -m "feat: add scroll-driven sticky header to podcast detail"
```

---

### Task 17: Add loading skeletons with morphing transitions

**Files:**

- Create: `app/(public)/bulletins/loading.tsx`
- Create: `app/(public)/learning-path/loading.tsx`
- Modify: `app/(public)/podcast/[id]/loading.tsx`

- [ ] **Step 1: Create library loading skeleton**

Create `app/(public)/bulletins/loading.tsx`:

```typescript
/**
 * Loading skeleton for the podcast library page.
 *
 * Shows a grid of skeleton cards while podcast data loads.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function LibraryLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create learning path loading skeleton**

Create `app/(public)/learning-path/loading.tsx`:

```typescript
/**
 * Loading skeleton for the learning paths list page.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function LearningPathLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/bulletins/loading.tsx app/(public)/learning-path/loading.tsx app/(public)/podcast/
git commit -m "feat: add loading skeletons for library, learning paths, and podcast detail"
```

---

### Task 18: Add button micro-interactions globally

**Files:**

- Modify: `components/ui/button.tsx`

- [ ] **Step 1: Read current button component**

Read `components/ui/button.tsx` to understand the CVA variants.

- [ ] **Step 2: Add active:scale-[0.97] to base button styles**

Add `active:scale-[0.97] transition-transform` to the base button class in the CVA definition so all buttons get the press effect:

```typescript
// In the base classes of the button CVA:
'active:scale-[0.97] transition-all';
```

- [ ] **Step 3: Verify build and existing button tests**

```bash
npx vitest run --reporter verbose 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat: add press micro-interaction to all buttons"
```

---

### Task 19: Add motion to remaining pages (Home, Search, Progress, Admin Dashboard, Upload, Analytics)

**Files:**

- Modify: `app/(public)/page.tsx` (Home)
- Modify: `app/(public)/search/page.tsx`
- Modify: `app/(public)/progress/page.tsx`
- Modify: `app/(admin)/admin/page.tsx`
- Modify: `app/(admin)/admin/upload/page.tsx`
- Modify: `app/(admin)/admin/analytics/page.tsx`

- [ ] **Step 1: Add staggered cards and animated numbers to Home page**

Read `app/(public)/page.tsx`. Add:

- Import `StaggeredGrid`, `StaggeredGridItem` from `@/components/ui/staggered-grid`
- Import `AnimatedNumber` from `@/components/ui/animated-number`
- Wrap any card grids in `StaggeredGrid`/`StaggeredGridItem`
- Replace static stat numbers with `<AnimatedNumber value={count} />`

- [ ] **Step 2: Add staggered reveal to Search results**

Read `app/(public)/search/page.tsx` and `components/search/search-results.tsx`. Add:

- Wrap search result items in `StaggeredGrid`/`StaggeredGridItem`
- Add `AnimatedSkeleton` wrapper for loading states during search

- [ ] **Step 3: Add animated numbers and progress bars to Progress page**

Read `app/(public)/progress/page.tsx` and `components/progress/progress-dashboard.tsx`. Add:

- Replace static stat numbers with `<AnimatedNumber />`
- Add Motion `animate={{ width }}` to progress bar fills
- Enable Recharts animations: `isAnimationActive={true}`

- [ ] **Step 4: Add staggered stat cards to Admin Dashboard**

Read `app/(admin)/admin/page.tsx` and `components/admin/admin-dashboard-client.tsx`. Add:

- Wrap stat cards in `StaggeredGrid`/`StaggeredGridItem`
- Replace static numbers with `<AnimatedNumber />`
- Enable Recharts animations

- [ ] **Step 5: Add wizard step transitions to Admin Upload**

Read `app/(admin)/admin/upload/page.tsx` and `components/admin/podcast-upload-form.tsx`. Add:

- Import `AnimatePresence`, `motion` from `motion/react`
- Wrap wizard step content in `AnimatePresence mode="wait"` with directional slide
- Add `active:scale-[0.97]` to file drop zone for press feedback
- Animate upload progress bar with Motion

- [ ] **Step 6: Add chart animations to Admin Analytics**

Read `app/(admin)/admin/analytics/page.tsx` and `components/admin/analytics-charts.tsx`. Add:

- Enable `isAnimationActive={true}` and `animationDuration={800}` on Recharts components
- Wrap stat cards in `StaggeredGrid`/`StaggeredGridItem`

- [ ] **Step 7: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add app/(public)/page.tsx app/(public)/search/ app/(public)/progress/ app/(admin)/admin/ components/search/ components/progress/ components/admin/
git commit -m "feat: add motion animations to Home, Search, Progress, and Admin pages"
```

---

### Task 20: Final cleanup — remove old navigation components

**Files:**

- Delete: `components/layout/public-nav.tsx`
- Delete: `components/audio-player/mini-player.tsx`

- [ ] **Step 1: Search for remaining imports of old components**

```bash
# Search for any remaining imports
```

Use Grep to find `import.*PublicNav`, `import.*MiniPlayer`, `import.*AdminSidebar`.

- [ ] **Step 2: Remove any remaining imports**

Update any files still importing the old components.

- [ ] **Step 3: Delete old files**

```bash
rm components/layout/public-nav.tsx
rm components/audio-player/mini-player.tsx
rm components/admin/admin-sidebar.tsx
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no import errors.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove old PublicNav, AdminSidebar, and MiniPlayer components"
```

---

## Chunk 4: Verification & Polish

### Task 21: Run full test suite and fix any issues

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run linting**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Fix any issues found in steps 1-3**

Address any test failures, build errors, or lint issues.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve test and build issues from UI overhaul"
```

---

### Task 22: Visual verification

- [ ] **Step 1: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:3000 in browser.

- [ ] **Step 2: Verify checklist**

Check each of these manually in the browser:

- [ ] Warm Stone color palette applied (warm grays, orange accents)
- [ ] Dark mode works correctly with warm tones
- [ ] Unified sidebar visible on desktop with all sections
- [ ] Sidebar collapses to icon rail
- [ ] Sidebar collapse state persists on reload
- [ ] Mobile hamburger opens sidebar sheet
- [ ] ⌘K opens command palette
- [ ] Page transitions animate on navigation
- [ ] Podcast grid cards stagger on load
- [ ] Card hover shows shadow + scale
- [ ] Button press shows scale-down
- [ ] Admin tables have staggered row entry
- [ ] Auth pages scale-in on load
- [ ] Now-playing widget appears in sidebar when audio loads
- [ ] Mobile bottom player appears on small screens
- [ ] Loading skeletons show on library/learning paths pages
- [ ] Bookmark bounce animation works on toggle
- [ ] Animated numbers count up on stat pages
- [ ] Reduced motion: enable `prefers-reduced-motion` in browser DevTools → verify all animations are instant

- [ ] **Step 3: Take screenshots and share with user for review**

Per feedback memory: do not commit until user verifies the UI works via screenshots.
