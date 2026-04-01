# The Audit Brief — UI Style Guide

Complete visual/styling reference for replicating the look and feel of this app. Covers fonts, colors, text sizes, login page, sidebar, components, animations, and dark mode. **Does not touch backend, database, or routing.**

---

## Table of Contents

1. [Fonts & Typography](#1-fonts--typography)
2. [Color System — Light Mode](#2-color-system--light-mode)
3. [Color System — Dark Mode](#3-color-system--dark-mode)
4. [Sidebar Theme](#4-sidebar-theme)
5. [Shadows](#5-shadows)
6. [Border Radius](#6-border-radius)
7. [Login Page UI](#7-login-page-ui)
8. [Button Component](#8-button-component)
9. [Input Component](#9-input-component)
10. [Card Component](#10-card-component)
11. [Sidebar Layout](#11-sidebar-layout)
12. [Sidebar Nav Items](#12-sidebar-nav-items)
13. [Sidebar User Profile](#13-sidebar-user-profile)
14. [Sidebar Now-Playing Widget](#14-sidebar-now-playing-widget)
15. [Public Layout](#15-public-layout)
16. [Domain-Specific Colors](#16-domain-specific-colors)
17. [Animations & Transitions](#17-animations--transitions)
18. [CSS Utility Classes](#18-css-utility-classes)
19. [Base Layer Resets](#19-base-layer-resets)
20. [Theme Provider Setup](#20-theme-provider-setup)
21. [Files to Copy / Modify](#21-files-to-copy--modify)

---

## 1. Fonts & Typography

### Font Files

Copy these to `public/fonts/`:

- `GeistVF.woff2` — Variable sans-serif, weight 100–900
- `GeistMonoVF.woff2` — Variable monospace, weight 100–900

### Font Face Declarations (in `globals.css`)

```css
@font-face {
  font-family: 'Geist';
  src: url('/fonts/GeistVF.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Geist Mono';
  src: url('/fonts/GeistMonoVF.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

### Font Stacks (Tailwind `@theme inline`)

```css
--font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
--font-mono: 'Geist Mono', ui-monospace, monospace;
```

### Text Sizes Used

| Tailwind Class  | Size   | Where Used                                        |
| --------------- | ------ | ------------------------------------------------- |
| `text-[10px]`   | 10px   | Sidebar section labels                            |
| `text-[11px]`   | 11px   | Table headers, avatar fallback text, badge labels |
| `text-xs`       | 12px   | Timestamps, metadata, muted labels                |
| `text-[0.8rem]` | 12.8px | Small button text                                 |
| `text-sm`       | 14px   | Body text, form labels, nav items                 |
| `text-base`     | 16px   | Input fields, card titles                         |
| `text-lg`       | 18px   | Section headings                                  |
| `text-xl`       | 20px   | Login page heading                                |
| `text-2xl`      | 24px   | Page titles                                       |

### Font Weights

| Tailwind Class  | Weight | Where Used                              |
| --------------- | ------ | --------------------------------------- |
| `font-normal`   | 400    | Body text                               |
| `font-medium`   | 500    | Nav items, card titles, buttons, labels |
| `font-semibold` | 600    | Sidebar title, section labels, headings |
| `font-bold`     | 700    | Emphasis text                           |

### Letter Spacing

| Class               | Value    | Where Used                                |
| ------------------- | -------- | ----------------------------------------- |
| `tracking-tight`    | -0.025em | Login heading, sidebar brand name         |
| `tracking-wide`     | 0.025em  | "Now Playing" label                       |
| `tracking-[0.08em]` | 0.08em   | Login page badge ("Enterprise Workspace") |
| `tracking-[0.11em]` | 0.11em   | Sidebar section labels                    |

### Text Rendering (applied to `html`)

```css
html {
  @apply font-sans;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body {
  @apply bg-background text-foreground antialiased;
  text-wrap: pretty;
}
h1,
h2,
h3 {
  text-wrap: balance;
}
```

---

## 2. Color System — Light Mode

All colors use **OKLch** color space: `oklch(Lightness% Chroma Hue / Alpha)`.

### Brand Scale (Blue, hue 264)

```css
--brand-100: oklch(95% 0.02 264);
--brand-200: oklch(89% 0.05 264);
--brand-300: oklch(78% 0.1 264);
--brand-400: oklch(63% 0.18 264);
--brand-500: oklch(45.6% 0.311 264.1); /* Primary brand */
--brand-600: oklch(39% 0.25 264); /* Hover state */
```

### Foundation Surfaces (warm-neutral, hue ~67.8)

```css
--bg-canvas: oklch(98.6% 0.002 67.8); /* Main background */
--bg-subtle: oklch(97.6% 0.003 67.8); /* Slightly darker */
--bg-elevated: oklch(99.2% 0.001 67.8); /* Cards, modals */
--bg-muted: oklch(95.4% 0.004 67.8); /* Disabled / secondary bg */
--bg-overlay: oklch(24% 0.01 67.8 / 0.08); /* Semi-transparent */
```

### Text Hierarchy

```css
--text-primary: oklch(24% 0.01 67.8); /* Main text */
--text-secondary: oklch(48% 0.012 67.8); /* Secondary text */
--text-tertiary: oklch(64% 0.01 67.8); /* Muted text */
--text-on-brand: oklch(99% 0 0); /* White on brand */
```

### Border Hierarchy

```css
--border-subtle: oklch(90% 0.006 67.8);
--border-default: oklch(84% 0.008 67.8);
--border-strong: oklch(76% 0.01 67.8);
```

### Interactive States

```css
--interactive-primary: var(--brand-500);
--interactive-primary-hover: var(--brand-600);
--interactive-primary-soft: var(--brand-100);
--interactive-link: var(--brand-500);
--interactive-link-hover: var(--brand-600);
--focus-ring: oklch(63% 0.18 264);
```

### Supporting Accents

```css
--accent-info: oklch(69% 0.157 242.4); /* Cyan/blue */
--accent-warm: oklch(85% 0.131 75.5); /* Light orange */
--accent-warm-soft: oklch(95% 0.03 75.5);
--accent-lilac-soft: oklch(94.2% 0.016 310.1); /* Light purple */
```

### Semantic States

```css
--positive: oklch(62% 0.17 150); /* Green / success */
--positive-soft: oklch(95% 0.03 150);
--warning: oklch(78% 0.14 75); /* Orange / warning */
--warning-soft: oklch(96% 0.03 75);
--danger: oklch(58% 0.21 25); /* Red / error */
--danger-soft: oklch(95% 0.03 25);
--info: var(--accent-info);
--info-soft: oklch(95% 0.025 242.4);
```

### shadcn Compatibility Layer

```css
--background: var(--bg-canvas);
--foreground: var(--text-primary);
--card: var(--bg-elevated);
--card-foreground: var(--text-primary);
--popover: var(--bg-elevated);
--popover-foreground: var(--text-primary);
--primary: var(--brand-500);
--primary-foreground: var(--text-on-brand);
--secondary: var(--bg-subtle);
--secondary-foreground: var(--text-secondary);
--muted: var(--bg-muted);
--muted-foreground: var(--text-tertiary);
--accent: var(--brand-100);
--accent-foreground: var(--brand-600);
--destructive: var(--danger);
--border: var(--border-default);
--input: var(--border-subtle);
--ring: var(--focus-ring);
```

### Chart Colors

```css
--chart-1: var(--brand-500);
--chart-2: oklch(69% 0.157 242.4);
--chart-3: oklch(62% 0.17 150);
--chart-4: oklch(78% 0.14 75);
--chart-5: oklch(58% 0.21 25);
```

### Layout

```css
--radius: 0.75rem;
```

### Easing Curves

```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

---

## 3. Color System — Dark Mode

Applied via `.dark` class on `<html>`.

### Brand Scale (Dark-Adjusted)

```css
--brand-100: oklch(27% 0.05 264);
--brand-200: oklch(35% 0.09 264);
--brand-300: oklch(65% 0.14 264);
--brand-400: oklch(72% 0.14 264);
--brand-500: oklch(45.6% 0.311 264.1); /* Same as light */
--brand-600: oklch(39% 0.25 264); /* Same as light */
```

### Foundation Surfaces (cool, hue 255)

```css
--bg-canvas: oklch(17% 0.008 255);
--bg-subtle: oklch(20% 0.008 255);
--bg-elevated: oklch(24% 0.01 255);
--bg-muted: oklch(28% 0.012 255);
--bg-overlay: oklch(8% 0.004 255 / 0.55);
```

### Text Hierarchy

```css
--text-primary: oklch(96% 0.002 67.8);
--text-secondary: oklch(78% 0.006 67.8);
--text-tertiary: oklch(63% 0.008 67.8);
--text-on-brand: oklch(99% 0 0);
```

### Border Hierarchy

```css
--border-subtle: oklch(30% 0.01 255);
--border-default: oklch(38% 0.012 255);
--border-strong: oklch(48% 0.014 255);
```

### Interactive States

```css
--interactive-primary: var(--brand-500);
--interactive-primary-hover: oklch(52% 0.27 264);
--interactive-primary-soft: oklch(27% 0.05 264);
--interactive-link: var(--brand-400);
--interactive-link-hover: oklch(78% 0.13 264);
--focus-ring: var(--brand-400);
```

### Supporting Accents

```css
--accent-info: oklch(74% 0.12 242.4);
--accent-warm: oklch(82% 0.12 75);
--accent-warm-soft: oklch(30% 0.05 75);
--accent-lilac-soft: oklch(26% 0.03 310);
```

### Semantic States

```css
--positive: oklch(72% 0.14 150);
--positive-soft: oklch(28% 0.05 150);
--warning: oklch(82% 0.12 75);
--warning-soft: oklch(30% 0.05 75);
--danger: oklch(70% 0.16 25);
--danger-soft: oklch(28% 0.05 25);
--info: var(--accent-info);
--info-soft: oklch(28% 0.05 242.4);
```

### shadcn Overrides (Dark)

```css
--accent: oklch(31% 0.045 260);
--accent-foreground: var(--brand-400);
--input: oklch(36% 0.013 255);
```

### Chart Colors (Dark)

```css
--chart-1: var(--brand-400);
--chart-2: oklch(72% 0.145 242.4);
--chart-3: oklch(72% 0.13 150);
--chart-4: oklch(80% 0.13 75);
--chart-5: oklch(67% 0.19 25);
```

---

## 4. Sidebar Theme

### Light Mode

```css
--sidebar: var(--bg-elevated);
--sidebar-foreground: var(--text-primary);
--sidebar-primary: var(--brand-500);
--sidebar-primary-foreground: var(--text-on-brand);
--sidebar-accent: var(--bg-subtle);
--sidebar-accent-foreground: var(--text-primary);
--sidebar-border: var(--border-subtle);
--sidebar-ring: var(--focus-ring);
```

### Dark Mode

```css
--sidebar: var(--bg-subtle);
--sidebar-foreground: var(--text-primary);
--sidebar-primary: var(--brand-500);
--sidebar-primary-foreground: var(--text-on-brand);
--sidebar-accent: var(--bg-elevated);
--sidebar-accent-foreground: var(--text-secondary);
--sidebar-border: var(--border-subtle);
--sidebar-ring: var(--focus-ring);
```

---

## 5. Shadows

### Light Mode

```css
--shadow-card: 0 1px 3px oklch(24% 0.01 67.8 / 0.04), 0 1px 2px oklch(24% 0.01 67.8 / 0.03);
--shadow-card-hover:
  0 10px 30px -12px oklch(45.6% 0.311 264.1 / 0.12), 0 4px 12px -4px oklch(24% 0.01 67.8 / 0.06);
--shadow-elevated: 0 4px 16px oklch(24% 0.01 67.8 / 0.06), 0 1px 3px oklch(24% 0.01 67.8 / 0.04);
--shadow-popover: 0 8px 32px oklch(24% 0.01 67.8 / 0.1), 0 2px 8px oklch(24% 0.01 67.8 / 0.05);
```

### Dark Mode

```css
--shadow-card: 0 1px 3px oklch(8% 0.004 255 / 0.2), 0 1px 2px oklch(8% 0.004 255 / 0.15);
--shadow-card-hover:
  0 10px 30px -12px oklch(45.6% 0.311 264.1 / 0.2), 0 4px 12px -4px oklch(8% 0.004 255 / 0.15);
--shadow-elevated: 0 4px 16px oklch(8% 0.004 255 / 0.25), 0 1px 3px oklch(8% 0.004 255 / 0.15);
--shadow-popover: 0 8px 32px oklch(8% 0.004 255 / 0.35), 0 2px 8px oklch(8% 0.004 255 / 0.2);
```

---

## 6. Border Radius

Base: `--radius: 0.75rem` (12px)

```css
--radius-sm: calc(var(--radius) * 0.6); /* 7.2px */
--radius-md: calc(var(--radius) * 0.8); /* 9.6px */
--radius-lg: var(--radius); /* 12px */
--radius-xl: calc(var(--radius) * 1.4); /* 16.8px */
--radius-2xl: calc(var(--radius) * 1.8); /* 21.6px */
--radius-3xl: calc(var(--radius) * 2.2); /* 26.4px */
--radius-4xl: calc(var(--radius) * 2.6); /* 31.2px */
```

---

## 7. Login Page UI

**File:** `app/(auth)/login/page.tsx`

### Page Background

```tsx
<main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,oklch(from_var(--brand-500)_95%_0.02_h_/_0.4),transparent_46%),var(--bg-canvas)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,oklch(from_var(--brand-500)_27%_0.06_h_/_0.35),transparent_46%),var(--bg-canvas)]">
```

### Login Card Wrapper

**File:** `components/auth/login-page-card.tsx`

```
w-full max-w-md space-y-7 rounded-2xl border border-border-default bg-elevated/95 p-8 shadow-elevated backdrop-blur-sm dark:border-border-subtle
```

- Entrance animation: `scaleIn` variant (scale 0.95 → 1, opacity 0 → 1)
- Transition: `duration: 0.2s`, ease `[0.23, 1, 0.32, 1]`
- Respects `prefers-reduced-motion`

### "Enterprise Workspace" Badge

```
rounded-full border border-border-default bg-subtle/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-secondary-text dark:border-border-subtle dark:bg-surface-muted/40
```

### Heading

```
text-xl font-semibold tracking-tight text-primary-text
```

### Subtitle

```
text-sm text-secondary-text
```

### Error Alert

```
rounded-md border border-danger/50 bg-danger-soft p-3 text-sm text-danger
```

### Form Error (inside form)

```
rounded-md bg-destructive/10 p-3 text-sm text-destructive
```

### Form Labels

```
text-sm text-foreground
```

### SSO Divider

```tsx
<span className="w-full border-t border-border-default dark:border-border-subtle" />
<span className="bg-elevated px-2 text-tertiary">or</span>
```

### SSO Button

**File:** `components/auth/sso-button.tsx`

- Uses `Button` with `variant="outline"` `size="lg"` and `className="w-full gap-3"`
- Microsoft logo colors: `#f25022`, `#00a4ef`, `#7fba00`, `#ffb900`

### Register Link

```
font-medium text-link underline-offset-4 hover:text-link-hover hover:underline dark:text-brand-400 dark:hover:text-link-hover
```

---

## 8. Button Component

**File:** `components/ui/button.tsx`

Uses `class-variance-authority` (CVA) with `@base-ui/react/button`.

### Base Classes

```
group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45 active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4
```

### Variant Styles

| Variant       | Classes                                                                                                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default`     | `bg-interactive text-on-brand shadow-sm hover:bg-interactive-hover`                                                                                                                                                                                                        |
| `outline`     | `border-border-default bg-canvas hover:border-border-strong hover:bg-subtle hover:text-primary-text aria-expanded:bg-subtle aria-expanded:text-primary-text dark:border-border-subtle dark:bg-elevated/50 dark:hover:border-border-default dark:hover:bg-surface-muted/50` |
| `secondary`   | `bg-subtle text-secondary-text hover:bg-surface-muted/80 aria-expanded:bg-subtle aria-expanded:text-secondary-text dark:bg-surface-muted dark:hover:bg-surface-muted/70`                                                                                                   |
| `ghost`       | `hover:bg-subtle hover:text-primary-text aria-expanded:bg-subtle aria-expanded:text-primary-text dark:hover:bg-surface-muted/50`                                                                                                                                           |
| `destructive` | `bg-danger-soft text-danger hover:bg-danger-soft/80 focus-visible:border-danger/40 focus-visible:ring-danger/20 dark:bg-danger-soft dark:text-danger dark:hover:bg-danger-soft/70 dark:focus-visible:ring-danger/40`                                                       |
| `link`        | `text-link underline-offset-4 hover:text-link-hover hover:underline dark:text-brand-400 dark:hover:text-link-hover`                                                                                                                                                        |

### Size Styles

| Size      | Classes                                                               |
| --------- | --------------------------------------------------------------------- |
| `default` | `h-8 gap-1.5 px-2.5`                                                  |
| `xs`      | `h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs`         |
| `sm`      | `h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]` |
| `lg`      | `h-9 gap-1.5 px-2.5`                                                  |
| `icon`    | `size-8`                                                              |
| `icon-xs` | `size-6 rounded-[min(var(--radius-md),10px)]`                         |
| `icon-sm` | `size-7 rounded-[min(var(--radius-md),12px)]`                         |
| `icon-lg` | `size-9`                                                              |

---

## 9. Input Component

**File:** `components/ui/input.tsx`

```
h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-base transition-[border-color,box-shadow,background-color] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/85 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/45 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/20 dark:disabled:bg-input/60 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40
```

---

## 10. Card Component

**File:** `components/ui/card.tsx`

### Card Container

```
group/card flex flex-col gap-4 overflow-hidden rounded-xl border border-border/70 bg-card py-4 text-sm text-card-foreground shadow-[0_1px_0_0_oklch(100%_0_0/.6)_inset]
```

- Size `sm` override: `gap-3 py-3`

### CardHeader

```
group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4
```

### CardTitle

```
text-base leading-snug font-medium
```

- Size `sm`: `text-sm`

### CardDescription

```
text-sm text-muted-foreground
```

### CardContent

```
px-4
```

### CardFooter

```
flex items-center rounded-b-xl border-t border-border/60 bg-muted/45 p-4
```

---

## 11. Sidebar Layout

**File:** `components/layout/unified-sidebar.tsx`

### Dimensions

- Expanded width: `240px`
- Collapsed width: `56px`
- Collapse state persisted to `localStorage` key: `sidebar-collapsed`

### Base Container Classes

```
hidden md:flex md:flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm overflow-hidden shrink-0 sticky top-0 h-screen transition-[border-color] duration-150
```

### Header

```
flex items-center gap-2 px-3 py-4
```

Collapsed: `justify-center px-2`

### Logo Mark

```
flex size-7 shrink-0 items-center justify-center rounded-md bg-primary
```

Icon: `Library` from lucide-react, `size-4 text-white`

### Brand Name

```
text-sm font-semibold tracking-tight
```

### Section Labels

```
px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-tertiary
```

### Nav Area

```
flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3
```

### Theme Toggle & Collapse Toggle

- Ghost icon buttons, `size-7`
- Sun/Moon icons with `size-3.5` and rotation/scale transitions for dark mode switch

---

## 12. Sidebar Nav Items

**File:** `components/layout/sidebar-nav-item.tsx`

### Base Classes

```
flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,border-color] duration-150
```

### Active State

```
border border-brand-500/20 bg-interactive-soft text-link dark:border-brand-400/20 dark:text-brand-400
```

### Inactive State

```
border border-transparent text-secondary-text hover:bg-subtle hover:text-primary-text
```

### Icon

```
size-4 shrink-0
```

### Collapsed Mode

- `justify-center px-2`
- Label hidden, wrapped in `Tooltip` with `side="right"`

---

## 13. Sidebar User Profile

**File:** `components/layout/sidebar-user-profile.tsx`

### Container

```
flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border-default dark:hover:border-border-subtle hover:bg-secondary/55
```

### Avatar

```
size-7 text-[11px]
```

### User Name

```
truncate text-sm font-medium leading-tight
```

### User Role

```
truncate text-xs text-muted-foreground
```

### Logout Button

```
shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-primary-text
```

---

## 14. Sidebar Now-Playing Widget

**File:** `components/layout/sidebar-now-playing.tsx`

### Widget Container

```
mx-2 rounded-xl border border-border-default dark:border-border-subtle bg-elevated p-3 text-card-foreground shadow-[0_1px_0_0_oklch(100%_0_0/.3)_inset]
```

### "Now Playing" Label

```
mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground
```

### Thumbnail

```
relative size-10 shrink-0 overflow-hidden rounded-md bg-muted
```

### Episode Title

```
line-clamp-2 flex-1 text-xs font-medium leading-snug
```

### Play/Pause Button

```
shrink-0 rounded-full p-1.5 text-primary transition-colors hover:bg-secondary
```

### Progress Bar Track

```
h-1 w-full overflow-hidden rounded-full bg-secondary
```

### Progress Bar Fill

```
h-full rounded-full bg-primary transition-[width] duration-150 ease-out
```

### Time Display

```
text-xs text-muted-foreground
```

### Collapsed Mode Play Button

```
flex size-8 items-center justify-center rounded-full bg-primary/12 text-primary hover:bg-primary/18
```

---

## 15. Public Layout

**File:** `app/(public)/layout.tsx`

### Outer Container

```
flex min-h-screen bg-background
```

### Main Content Area

```
flex-1 gradient-brand-light p-4 md:p-6 lg:p-8
```

### Content Max Width

```
mx-auto w-full max-w-[1200px]
```

---

## 16. Domain-Specific Colors

**File:** `lib/domain-colors.ts`

### Badge/Card Colors Per Domain

| Domain                   | Light BG                    | Light Text | Dark BG                    | Dark Text | Border    | Glow                        |
| ------------------------ | --------------------------- | ---------- | -------------------------- | --------- | --------- | --------------------------- |
| Audit Methodology        | `rgba(59, 130, 246, 0.12)`  | `#1d4ed8`  | `rgba(59, 130, 246, 0.2)`  | `#93c5fd` | `#3b82f6` | `rgba(59, 130, 246, 0.15)`  |
| Accounting and Reporting | `rgba(16, 185, 129, 0.12)`  | `#065f46`  | `rgba(16, 185, 129, 0.2)`  | `#6ee7b7` | `#10b981` | `rgba(16, 185, 129, 0.15)`  |
| Audit Technology         | `rgba(139, 92, 246, 0.12)`  | `#5b21b6`  | `rgba(139, 92, 246, 0.2)`  | `#c4b5fd` | `#8b5cf6` | `rgba(139, 92, 246, 0.15)`  |
| Quality and Risk         | `rgba(245, 158, 11, 0.12)`  | `#92400e`  | `rgba(245, 158, 11, 0.2)`  | `#fcd34d` | `#f59e0b` | `rgba(245, 158, 11, 0.15)`  |
| LEAP                     | `rgba(239, 68, 68, 0.12)`   | `#991b1b`  | `rgba(239, 68, 68, 0.2)`   | `#fca5a5` | `#ef4444` | `rgba(239, 68, 68, 0.15)`   |
| Auditing                 | `rgba(20, 184, 166, 0.12)`  | `#0f766e`  | `rgba(20, 184, 166, 0.2)`  | `#5eead4` | `#14b8a6` | `rgba(20, 184, 166, 0.15)`  |
| Fallback                 | `rgba(107, 114, 128, 0.12)` | `#374151`  | `rgba(107, 114, 128, 0.2)` | `#d1d5db` | `#6b7280` | `rgba(107, 114, 128, 0.15)` |

### Card Accent Gradients (vertical)

```
Audit Methodology:        linear-gradient(180deg, #3b82f6, #6366f1, #8b5cf6)
Accounting and Reporting: linear-gradient(180deg, #10b981, #059669, #0d9488)
Audit Technology:         linear-gradient(180deg, #8b5cf6, #a855f7, #d946ef)
Quality and Risk:         linear-gradient(180deg, #f59e0b, #f97316, #ef4444)
LEAP:                     linear-gradient(180deg, #ef4444, #f43f5e, #ec4899)
Auditing:                 linear-gradient(180deg, #14b8a6, #06b6d4, #3b82f6)
Fallback:                 linear-gradient(180deg, #6b7280, #9ca3af, #6b7280)
```

---

## 17. Animations & Transitions

**File:** `lib/animation.ts`

### Transition Configs

| Name         | Duration | Easing                               |
| ------------ | -------- | ------------------------------------ |
| `fast`       | 0.15s    | `[0.23, 1, 0.32, 1]`                 |
| `normal`     | 0.2s     | `[0.23, 1, 0.32, 1]`                 |
| `slow`       | 0.3s     | `[0.23, 1, 0.32, 1]`                 |
| `emphasis`   | 0.25s    | `[0.77, 0, 0.175, 1]`                |
| `panelSlide` | spring   | stiffness: 200, damping: 25, mass: 1 |
| `exitFast`   | 0.1s     | `[0.23, 1, 0.32, 1]`                 |
| `exitNormal` | 0.15s    | `[0.23, 1, 0.32, 1]`                 |
| `drawer`     | 0.35s    | `[0.32, 0.72, 0, 1]`                 |

### Motion Variants

| Variant           | Hidden                        | Visible                     | Exit                          |
| ----------------- | ----------------------------- | --------------------------- | ----------------------------- |
| `fadeUp`          | `opacity: 0, y: 12`           | `opacity: 1, y: 0`          | `opacity: 0, y: 8`            |
| `fadeIn`          | `opacity: 0`                  | `opacity: 1`                | `opacity: 0`                  |
| `scaleIn`         | `opacity: 0, scale: 0.95`     | `opacity: 1, scale: 1`      | `opacity: 0, scale: 0.97`     |
| `slideLeft`       | `opacity: 0, x: -20`          | `opacity: 1, x: 0`          | `opacity: 0, x: -12`          |
| `slideRight`      | `opacity: 0, x: 20`           | `opacity: 1, x: 0`          | `opacity: 0, x: 12`           |
| `slideInFromLeft` | `opacity: 0, x: -30`          | `opacity: 1, x: 0`          | `opacity: 0, x: -16`          |
| `mercuryFade`     | `opacity: 0, y: 8, blur(4px)` | `opacity: 1, y: 0, blur(0)` | `opacity: 0, y: 4, blur(2px)` |

### Stagger Configs

- `staggerContainer`: children stagger by 40ms
- `sectionStagger`: children stagger by 80ms with 100ms initial delay

---

## 18. CSS Utility Classes

Defined in `@layer utilities` in `globals.css`:

### Shadow Utilities

```css
.shadow-card {
  box-shadow: var(--shadow-card);
}
.shadow-card-hover {
  box-shadow: var(--shadow-card-hover);
}
.shadow-elevated {
  box-shadow: var(--shadow-elevated);
}
.shadow-popover {
  box-shadow: var(--shadow-popover);
}
```

### Press Feedback

```css
.press-scale {
  transition: transform 0.12s var(--ease-out);
}
.press-scale:active {
  transform: scale(0.98);
}
```

### Brand Gradient Overlay

```css
.gradient-brand-light {
  background: radial-gradient(
    ellipse at top right,
    oklch(from var(--brand-500) 95% 0.02 h / 0.35),
    transparent 50%
  );
}
.dark .gradient-brand-light {
  background: radial-gradient(
    ellipse at top right,
    oklch(from var(--brand-500) 27% 0.05 h / 0.3),
    transparent 50%
  );
}
```

### Uppercase Label

```css
.label-caps {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
```

---

## 19. Base Layer Resets

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  :focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  ::selection {
    background: oklch(from var(--brand-500) l c h / 0.18);
    color: var(--text-primary);
  }
  .dark ::selection {
    background: oklch(from var(--brand-400) l c h / 0.25);
  }

  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }

  html {
    scroll-behavior: smooth;
  }
  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }
}
```

---

## 20. Theme Provider Setup

**File:** `components/providers/theme-provider.tsx`

```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

Used in root layout:

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

### CSS Dark Mode Variant

```css
@custom-variant dark (&:is(.dark *));
```

---

## 21. Files to Copy / Modify

When applying this style guide to another project, these are the key files:

| File                                         | Action                     | Purpose                           |
| -------------------------------------------- | -------------------------- | --------------------------------- |
| `app/globals.css`                            | **Replace entirely**       | Complete theme system             |
| `public/fonts/GeistVF.woff2`                 | **Copy**                   | Primary font                      |
| `public/fonts/GeistMonoVF.woff2`             | **Copy**                   | Monospace font                    |
| `lib/domain-colors.ts`                       | **Copy**                   | Domain color palettes             |
| `lib/animation.ts`                           | **Copy**                   | Motion animation tokens           |
| `components/providers/theme-provider.tsx`    | **Copy**                   | Dark/light mode provider          |
| `components/ui/button.tsx`                   | **Replace**                | Button styling with CVA           |
| `components/ui/input.tsx`                    | **Replace**                | Input field styling               |
| `components/ui/card.tsx`                     | **Replace**                | Card component styling            |
| `components/auth/login-page-card.tsx`        | **Replace**                | Login card wrapper                |
| `components/auth/login-form.tsx`             | **Replace**                | Login form layout                 |
| `components/auth/sso-button.tsx`             | **Replace**                | SSO button styling                |
| `app/(auth)/login/page.tsx`                  | **Replace**                | Login page layout                 |
| `components/layout/unified-sidebar.tsx`      | **Replace**                | Sidebar structure                 |
| `components/layout/sidebar-nav-item.tsx`     | **Replace**                | Nav item styling                  |
| `components/layout/sidebar-user-profile.tsx` | **Replace**                | User profile section              |
| `components/layout/sidebar-now-playing.tsx`  | **Replace**                | Now-playing widget                |
| `components/layout/mobile-top-bar.tsx`       | **Replace**                | Mobile nav bar                    |
| `app/(public)/layout.tsx`                    | **Update styling classes** | Public layout gradient            |
| `components.json`                            | **Update**                 | shadcn config (`base-nova` style) |

### Required npm Dependencies for Styling

```
tailwindcss@4          # Tailwind CSS v4
@tailwindcss/postcss   # PostCSS plugin
tw-animate-css         # Tailwind animation utilities
next-themes            # Theme switching
class-variance-authority # CVA for button/component variants
clsx                   # Conditional class names
tailwind-merge         # Tailwind class deduplication
motion                 # Framer Motion alternative
lucide-react           # Icon library
@base-ui/react         # Headless component primitives
```
