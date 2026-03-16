# UI Overhaul — Design Specification

**Date:** 2026-03-16
**Branch:** `ui` (off `feat/stage-1-foundation`)
**Status:** Approved

## Overview

Complete UI transformation of Podcast Hub v2. Two goals: redesign the visual identity (Warm Stone color palette, refined typography, updated spacing/shadows) and layer a comprehensive motion system on top (Motion library + Tailwind for 8 animation patterns). The result should feel professional, fast, and genuinely delightful to use — "Linear meets Spotify" for audit professionals.

### Design Principles

1. **Professional warmth** — Trustworthy and clean, but never cold or sterile
2. **Intentional motion** — Every animation serves a purpose (orientation, feedback, continuity)
3. **Speed perception** — Skeleton morphing + staggered reveals make the app feel faster than it is
4. **Respect the user** — Honor `prefers-reduced-motion`, no gratuitous animation, no blocking transitions

---

## 1. Design System

### 1.1 Color Palette — "Warm Stone"

All tokens use OKLCH color space for perceptual uniformity. Mapped to CSS custom properties consumed by Tailwind `@theme`.

#### Light Mode

| Token                    | Role                                 | Value (approx Tailwind equivalent) |
| ------------------------ | ------------------------------------ | ---------------------------------- |
| `--background`           | Page background                      | `stone-50` (#fafaf9)               |
| `--foreground`           | Primary text                         | `stone-900` (#1c1917)              |
| `--card`                 | Card/surface background              | `white` (#ffffff)                  |
| `--card-foreground`      | Card text                            | `stone-900` (#1c1917)              |
| `--primary`              | Primary accent (CTAs, active states) | `orange-500` (#f97316)             |
| `--primary-foreground`   | Text on primary                      | `white` (#ffffff)                  |
| `--secondary`            | Secondary surfaces                   | `stone-100` (#f5f5f4)              |
| `--secondary-foreground` | Text on secondary                    | `stone-700` (#44403c)              |
| `--muted`                | Muted backgrounds                    | `stone-100` (#f5f5f4)              |
| `--muted-foreground`     | Muted text                           | `stone-500` (#a8a29e)              |
| `--accent`               | Active nav background, highlights    | `amber-100` (#fef3c7)              |
| `--accent-foreground`    | Text on accent                       | `amber-900` (#78350f)              |
| `--destructive`          | Error/danger actions                 | `red-500` (#ef4444)                |
| `--border`               | Default borders                      | `stone-200` (#e7e5e4)              |
| `--input`                | Input borders                        | `stone-300` (#d6d3d1)              |
| `--ring`                 | Focus ring                           | `orange-500` (#f97316)             |

#### Dark Mode

| Token                    | Role                  | Value (approx Tailwind equivalent)                 |
| ------------------------ | --------------------- | -------------------------------------------------- |
| `--background`           | Page background       | `stone-950` (#0c0a09)                              |
| `--foreground`           | Primary text          | `stone-50` (#fafaf9)                               |
| `--card`                 | Card/surface          | `stone-900` (#1c1917)                              |
| `--card-foreground`      | Card text             | `stone-50` (#fafaf9)                               |
| `--primary`              | Primary accent        | `orange-500` (#f97316)                             |
| `--primary-foreground`   | Text on primary       | `white` (#ffffff)                                  |
| `--secondary`            | Secondary surfaces    | `stone-800` (#292524)                              |
| `--secondary-foreground` | Text on secondary     | `stone-300` (#d6d3d1)                              |
| `--muted`                | Muted backgrounds     | `stone-800` (#292524)                              |
| `--muted-foreground`     | Muted text            | `stone-500` (#a8a29e)                              |
| `--accent`               | Active nav background | `rgba(69, 26, 3, 0.4)` (orange-950 at 40% opacity) |
| `--accent-foreground`    | Text on accent        | `orange-200` (#fed7aa)                             |
| `--destructive`          | Error/danger          | `red-400` (#f87171)                                |
| `--border`               | Default borders       | `stone-800` (#292524)                              |
| `--input`                | Input borders         | `stone-700` (#44403c)                              |
| `--ring`                 | Focus ring            | `orange-500` (#f97316)                             |

#### Sidebar Colors

| Token                  | Light                  | Dark                   |
| ---------------------- | ---------------------- | ---------------------- |
| `--sidebar-background` | `white` (#ffffff)      | `stone-900` (#1c1917)  |
| `--sidebar-foreground` | `stone-700` (#44403c)  | `stone-300` (#d6d3d1)  |
| `--sidebar-primary`    | `orange-500` (#f97316) | `orange-500` (#f97316) |
| `--sidebar-accent`     | `amber-100` (#fef3c7)  | `stone-800` (#292524)  |
| `--sidebar-border`     | `stone-200` (#e7e5e4)  | `stone-800` (#292524)  |

#### Chart Colors

| Token       | Value                  | Use                    |
| ----------- | ---------------------- | ---------------------- |
| `--chart-1` | `orange-500` (#f97316) | Primary data series    |
| `--chart-2` | `amber-400` (#fbbf24)  | Secondary data series  |
| `--chart-3` | `yellow-300` (#fde047) | Tertiary data series   |
| `--chart-4` | `stone-400` (#a8a29e)  | Quaternary data series |
| `--chart-5` | `stone-300` (#d6d3d1)  | Quinary data series    |

Replaces the current blue palette to match the Warm Stone identity.

### 1.2 Typography

Font family unchanged: **Geist** (sans) + **Geist Mono** (monospace).

| Element              | Size               | Weight | Letter-spacing | Line-height |
| -------------------- | ------------------ | ------ | -------------- | ----------- |
| Page title (h1)      | 28px / `text-3xl`  | 700    | `-0.02em`      | 1.2         |
| Section heading (h2) | 22px / `text-xl`   | 600    | `-0.01em`      | 1.3         |
| Card title (h3)      | 16px / `text-base` | 600    | `normal`       | 1.4         |
| Body text            | 14px / `text-sm`   | 400    | `normal`       | 1.7         |
| Small/label          | 12px / `text-xs`   | 500    | `normal`       | 1.5         |
| Section label        | 11px / `text-xs`   | 600    | `0.05em`       | 1.0         |
| Mono/code            | 13px               | 400    | `normal`       | 1.6         |

### 1.3 Spacing & Radius

| Token           | Value             | Used for                           |
| --------------- | ----------------- | ---------------------------------- |
| `--radius`      | `0.75rem` (12px)  | Base radius (up from 10px)         |
| `--radius-sm`   | `0.5rem` (8px)    | Buttons, inputs, badges            |
| `--radius-md`   | `0.625rem` (10px) | Dropdowns, popovers                |
| `--radius-lg`   | `0.75rem` (12px)  | Cards, dialogs                     |
| `--radius-xl`   | `1rem` (16px)     | Large cards, sidebar player widget |
| `--radius-full` | `9999px`          | Avatars, pills                     |

### 1.4 Shadows

| Token         | Value                                                      | Used for                  |
| ------------- | ---------------------------------------------------------- | ------------------------- |
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)`                               | Inputs, small elements    |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`   | Cards at rest             |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)`   | Cards on hover, dropdowns |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)` | Dialogs, popovers         |

Dark mode: shadows use `rgba(0,0,0,0.3)` base with subtle colored glows on interactive elements.

---

## 2. Unified Sidebar

### 2.1 Structure

Replace the current split navigation (top nav for public, left sidebar for admin) with a single unified sidebar across the entire application.

```
┌──────────────────────────┐
│ [Logo] PodcastHub   [⌘K] │  Logo + app name + command palette trigger
├──────────────────────────┤
│ MAIN                     │  Section label (uppercase, muted)
│  🏠 Home                 │
│  📚 Library              │
│  🗺️ Learning Paths       │
│  🔍 Search               │
├──────────────────────────┤
│ YOUR STUFF               │  Section label
│  📊 Progress             │
│  👤 Profile              │
├──────────────────────────┤
│ ADMIN                    │  Section label (only for admin users)
│  📈 Dashboard            │
│  ⬆️ Upload               │
│  👥 Users                │
│  📉 Analytics            │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ [thumb] Episode name │ │  Now-playing widget
│ │ Series · 14:32  [▶]  │ │
│ │ ━━━━━━━━░░░░░░░░░░░  │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ (R) Rosh · Admin    [⚙] │  Avatar + name + role + settings gear
└──────────────────────────┘
```

### 2.2 Behavior

| State                             | Width        | Behavior                                                              |
| --------------------------------- | ------------ | --------------------------------------------------------------------- |
| **Expanded (default on desktop)** | 240px        | Full labels, sections, now-playing widget with details                |
| **Collapsed**                     | 56px         | Icon rail only, tooltips on hover, now-playing shows play button only |
| **Mobile**                        | 0px (hidden) | Sheet overlay from left, triggered by hamburger button in top bar     |

- **Toggle:** Collapse/expand button at top or bottom. Persisted to `localStorage`.
- **Collapse animation:** Motion spring on width. Labels fade out (opacity 0) before width shrinks. Icons remain centered throughout.
- **Expand animation:** Width expands first, labels fade in after width settles.
- **Mobile sheet:** Motion `animate` with spring physics, overlay backdrop fades in.

### 2.3 Now-Playing Widget

Embedded at bottom of sidebar, above user profile.

| State                           | Display                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Nothing playing**             | Hidden (sidebar is shorter)                                                                                  |
| **Playing (expanded sidebar)**  | Thumbnail (34px square, rounded), title (truncated), series name, timestamp, play/pause button, progress bar |
| **Playing (collapsed sidebar)** | Circular play/pause button only, orange accent ring shows progress                                           |
| **Playing (mobile)**            | Fixed bottom bar (separate from sidebar), thumbnail + title + play/pause + progress                          |

Clicking the widget navigates to the full podcast detail page with a shared element transition (thumbnail morphs to hero image).

### 2.4 Command Palette (⌘K)

Trigger: Click the `⌘K` badge in sidebar header, or press `⌘K` / `Ctrl+K` anywhere.

Sections:

- **Recent** — Last 5 visited pages/episodes
- **Episodes** — Search by title, fuzzy matching
- **Pages** — Navigate to any page (Home, Library, etc.)
- **Actions** — Toggle theme, toggle sidebar, open profile
- **Admin** — Admin-only actions (upload, manage users) — only for admin users

Built with shadcn `Command` component (uses cmdk under the hood). Animated entry: scale(0.95) + fade → scale(1) + full opacity, 200ms spring.

---

## 3. Animation System

### 3.1 Technology

- **Motion** (v12+, formerly Framer Motion) — Page transitions, layout animations, shared elements, staggered lists, AnimatePresence
- **Tailwind CSS** — Hover states, focus states, simple transitions (color, shadow, scale), micro-interactions via `active:` and `transition-*` utilities
- **CSS native** — `animation-timeline: scroll()` for scroll-driven animations, `@media (prefers-reduced-motion)` for accessibility

### 3.2 Animation Tokens

Centralized in a shared config (`lib/animation.ts`):

```typescript
export const transitions = {
  fast: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] },
  normal: { type: 'spring', stiffness: 80, damping: 10, mass: 1 },
  slow: { type: 'spring', stiffness: 60, damping: 12, mass: 1 },
  emphasis: { type: 'spring', stiffness: 50, damping: 8, mass: 1 },
} as const;

export const variants = {
  fadeUp: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } },
  fadeIn: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  scaleIn: { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } },
  slideLeft: { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } },
  slideRight: { hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } },
} as const;
```

### 3.3 Pattern Implementation

#### 3.3.1 Page Transitions

- Wrap page content in a `PageTransition` component in each layout
- Uses `AnimatePresence` with `mode="wait"`
- Enter: fade in + translateY(8px → 0), 250ms spring
- Exit: fade out, 150ms ease-out
- Key: route pathname

#### 3.3.2 Tab Switches

- Active indicator: `motion.div` with `layoutId="tab-indicator"` — slides between tabs with spring physics
- Content: `AnimatePresence` with directional slide (moving to a higher index slides content left, lower index slides right)
- Duration: 250ms spring
- Used in: podcast detail (transcript/bulletin/bookmarks), learning path editor (graph/linear), admin panels

#### 3.3.3 Staggered Lists & Grids

- Container: `motion.div` with `variants={{ visible: { transition: { staggerChildren: 0.04 } } }}`
- Each item: `motion.div` with `fadeUp` variant
- Triggers on mount and when data changes (e.g., filter/search updates)
- Used in: podcast grid, search results, table rows, learning path list, admin tables

#### 3.3.4 Skeleton → Content Morphing

- Wrap skeleton and real content in `AnimatePresence mode="wait"`
- Skeleton exits: fade out, 100ms
- Content enters: fade in at same position, 200ms
- Skeleton pulse animation continues until exit begins
- Used on: every page with data loading

#### 3.3.5 Micro-interactions

| Element             | Animation                | Implementation                                      |
| ------------------- | ------------------------ | --------------------------------------------------- |
| Buttons             | Press scale to 0.97      | Tailwind `active:scale-[0.97] transition-transform` |
| Bookmark toggle     | Heart bounces on save    | Motion `animate={{ scale: [1, 1.3, 1] }}` on toggle |
| Progress bars       | Animate width on load    | Motion `animate={{ width: percentage }}`            |
| Volume slider       | Smooth thumb tracking    | Tailwind `transition-all`                           |
| Play/pause          | Icon morphs              | Motion `AnimatePresence` crossfade between icons    |
| Toast notifications | Slide in from right      | Sonner default (already working)                    |
| Switches            | Thumb slides with spring | Motion spring on thumb position                     |

#### 3.3.6 Layout Animations

- Sidebar collapse/expand: Motion `animate={{ width }}` with spring
- Main content area: Motion `layout` prop — reflows smoothly when sidebar changes
- Filter changes: `LayoutGroup` wrapping podcast grid — cards reposition with spring physics
- Accordion/collapsible: Motion `animate={{ height: "auto" }}` with overflow hidden
- Dialog/sheet: Motion spring entry (scale + fade for dialogs, slide for sheets)

#### 3.3.7 Shared Element Transitions

- Podcast card thumbnail → podcast detail hero: matching `layoutId` on both elements
- Learning path node → episode player: matching `layoutId`
- Requires careful component structure — both source and target must be mounted during transition
- **App Router constraint:** Next.js App Router unmounts page components on navigation, making cross-page `layoutId` transitions difficult. Approach: use a persistent layout wrapper that keeps the source element mounted during the transition, or use the View Transitions API as a fallback
- Fallback: if shared element transition fails (e.g., direct URL navigation), use standard fade-in

#### 3.3.8 Scroll-Driven Animations

- Transcript progress: CSS `animation-timeline: scroll()` fills a progress indicator as user scrolls through transcript
- Sticky header morph: Motion `useScroll` + `useTransform` — page header shrinks and gets a backdrop blur on scroll
- Section reveals: Intersection Observer triggers `fadeUp` animation as sections enter viewport
- Home page hero: subtle parallax on scroll (translateY at 0.3x scroll speed)

### 3.4 Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- All Motion animations set `duration: 0` (instant state changes)
- Tailwind transitions disabled via `motion-reduce:transition-none`
- Scroll-driven animations disabled
- Shared element transitions fall back to crossfade
- Skeleton → content uses instant swap

Implementation: a `useReducedMotion()` hook that reads the media query and conditionally applies animation config.

---

## 4. New shadcn/ui Components

### 4.1 Components to Install

| Component      | Primary Use Cases                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **Command**    | ⌘K command palette (episode search, page navigation, actions, theme toggle)                     |
| **Accordion**  | Transcript collapsible sections, admin settings panels, FAQ, collapsible filter groups          |
| **Avatar**     | Sidebar user profile, podcast author display, user management table rows                        |
| **Breadcrumb** | Admin subpages (Upload → Edit), learning path editor (Paths → Path Name → Edit), podcast detail |
| **Progress**   | Episode playback progress, learning path completion %, upload progress indicator                |
| **Switch**     | Auto-play next episode, dark mode toggle (profile page)                                         |
| **Popover**    | Episode quick-peek on card hover (title, duration, description preview), filter date range      |

### 4.2 Component Customization

All new components styled to match Warm Stone palette:

- Focus rings use `orange-500`
- Active/selected states use `amber-100` (light) / `orange-950` (dark) backgrounds
- Hover states use `stone-100` (light) / `stone-800` (dark)
- All interactive components get Motion micro-interactions where appropriate

---

## 5. Page-by-Page Impact

### Universal Changes (All Pages)

- New color tokens applied globally via CSS variables
- Updated shadows and border-radius
- Page transition animation (fade + slide) on every route change
- Staggered content load on mount
- Skeleton → content morphing for all data-loading states
- Unified sidebar replaces top nav (public) and old sidebar (admin)
- Breadcrumb navigation on nested pages

### 5.1 Home (`/`)

- Greeting with user name ("Good morning, Rosh")
- "Continue listening" section — shows last played episode with shared element transition to player
- "Recently added" section — staggered podcast card grid
- Quick stats cards (episodes completed, hours listened) — animate numbers on load
- Scroll-driven reveals for sections below the fold

### 5.2 Library (`/bulletins`)

- Filter bar with animated layout reflow when filters are applied/removed
- Staggered podcast card grid with hover: scale(1.02) + shadow-md transition
- Popover quick-peek on card hover (episode count, duration, description preview)
- Shared element transition: card thumbnail → podcast detail hero
- Pagination with fade transition between pages

### 5.3 Podcast Detail (`/podcast/[id]`)

- Hero section with thumbnail (shared element from card or fade-in on direct nav)
- Tab interface (Transcript | Bulletin | Bookmarks) with sliding indicator + directional content transition
- Audio player with micro-interactions: play/pause icon morph, progress bar animation, volume slider
- Bookmark toggle with heart bounce animation
- Transcript viewer with scroll-driven progress indicator
- Sticky header on scroll (shrinks title + adds backdrop blur)

### 5.4 Learning Paths (`/learning-path`)

- Staggered path card list
- Path cards with hover effects and progress indicator animation

### 5.5 Learning Path Detail (`/learning-path/[id]`)

- Tab interface (Graph | Linear) with sliding indicator
- Graph editor: node animations on add/remove, edge draw animations
- Linear editor: drag-and-drop with Motion layout animations
- Episode sidebar: slide-in animation from right
- Auto-save status with animated presence (spinner → checkmark)

### 5.6 Search (`/search`)

- ⌘K command palette as primary search entry point
- Search results with staggered reveal
- Skeleton → content morphing during search
- Result cards with hover effects

### 5.7 Profile (`/profile`)

- Existing profile form fields with focus animations
- Save confirmation with toast + subtle success animation
- If avatar/preferences UI already exists, add micro-interactions; do not add new features

### 5.8 Progress (`/progress`)

- Dashboard stats with animated number counters
- Progress bars animate to final width on load
- Chart animations (Recharts supports `isAnimationActive`)
- Staggered card layout

### 5.9 Admin Dashboard (`/admin`)

- Stat cards with staggered entry + animated counters
- Chart animations on data load
- Quick action buttons with micro-interactions
- Layout animation on sidebar collapse

### 5.10 Admin Upload (`/admin/upload`)

- Multi-step wizard with step transition animations (slide between steps)
- Wizard step indicator with animated progress line
- File drop zone with Motion feedback (scale bounce on drag-over)
- Upload progress bar with animated fill
- Success state with checkmark animation

### 5.11 Admin Tables (Podcasts, Users, Learning Paths)

- Staggered row entry on page load
- Row hover highlight with transition
- Action dropdowns with scale + fade animation
- Pagination with fade transition
- Breadcrumb navigation at top

### 5.12 Admin Analytics (`/admin/analytics`)

- Date range picker with popover animation
- Chart animations (bars grow, lines draw, pies expand)
- Staggered stat cards
- Layout animation when switching between chart types

### 5.13 Auth Pages (Login, Register)

- Centered card with scale-in animation on mount
- Form field focus animations
- Button loading state with spinner
- Error shake animation on validation failure
- Success redirect with fade-out transition

---

## 6. Mobile Strategy

### 6.1 Sidebar

- Hidden by default on screens < 768px
- Triggered by hamburger icon in a slim top bar (height: 48px, contains logo + hamburger + theme toggle)
- Opens as sheet overlay from left with Motion spring animation
- Backdrop overlay fades in
- Swipe-to-close gesture support

### 6.2 Now-Playing (Mobile)

- Fixed bottom bar (height: 64px) when audio is playing
- Shows: thumbnail (40px), title (truncated), play/pause button, slim progress bar
- Tapping the bar navigates to full podcast detail page
- Swipe up to expand to full player view (out of scope for initial implementation)

### 6.3 Responsive Grid

| Breakpoint   | Podcast Grid | Stat Cards        |
| ------------ | ------------ | ----------------- |
| `< 640px`    | 1 column     | 1 column, stacked |
| `640-1024px` | 2 columns    | 2 columns         |
| `> 1024px`   | 3-4 columns  | 4 columns         |

### 6.4 Touch Interactions

- Swipe between tabs (podcast detail, learning path editor)
- Long-press on podcast card for quick actions popover

### 6.5 Reduced Motion

- All Motion animations disabled (instant state changes)
- Tailwind transitions disabled via `motion-reduce:transition-none`
- Scroll-driven animations disabled
- Shared element transitions fall back to instant navigation
- Respects `prefers-reduced-motion` OS setting automatically

---

## 7. Technical Implementation Notes

### 7.1 Dependencies to Add

```
motion          — Animation library (formerly Framer Motion)
```

### 7.2 shadcn/ui Components to Install

```bash
npx shadcn@latest add command accordion avatar breadcrumb progress switch popover
```

### 7.3 New Files to Create

| File                                         | Purpose                                              |
| -------------------------------------------- | ---------------------------------------------------- |
| `lib/animation.ts`                           | Centralized animation tokens (transitions, variants) |
| `components/layout/unified-sidebar.tsx`      | New unified sidebar component                        |
| `components/layout/sidebar-nav-item.tsx`     | Individual nav item with active state                |
| `components/layout/sidebar-now-playing.tsx`  | Now-playing widget for sidebar                       |
| `components/layout/sidebar-user-profile.tsx` | User avatar + name at sidebar bottom                 |
| `components/layout/mobile-top-bar.tsx`       | Slim mobile top bar (hamburger + logo)               |
| `components/layout/mobile-bottom-player.tsx` | Fixed bottom player for mobile                       |
| `components/layout/page-transition.tsx`      | AnimatePresence wrapper for page routes              |
| `components/layout/command-palette.tsx`      | ⌘K command palette                                   |
| `components/ui/animated-tabs.tsx`            | Tab component with Motion sliding indicator          |
| `components/ui/staggered-grid.tsx`           | Grid wrapper with staggered child animations         |
| `components/ui/animated-skeleton.tsx`        | Skeleton with morphing transition to content         |
| `components/ui/animated-number.tsx`          | Number counter animation for stats                   |
| `hooks/use-reduced-motion.ts`                | Hook to detect `prefers-reduced-motion`              |

### 7.4 Files to Modify

| File                                       | Changes                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/globals.css`                          | New Warm Stone color tokens, updated radius/shadow tokens                                                                                                                                                                                                                   |
| `app/layout.tsx`                           | Add page transition wrapper, command palette provider                                                                                                                                                                                                                       |
| `app/(public)/layout.tsx`                  | Replace top nav with unified sidebar                                                                                                                                                                                                                                        |
| `app/(admin)/layout.tsx`                   | Replace admin sidebar with unified sidebar                                                                                                                                                                                                                                  |
| All `page.tsx` files                       | Wrap content in page transition, add staggered animations                                                                                                                                                                                                                   |
| All `loading.tsx` files                    | Update existing `loading.tsx` (currently only `podcast/[id]/loading.tsx`). New `loading.tsx` files should be created for routes that need skeleton states (library, learning paths, admin tables). Alternatively, use inline `Suspense` boundaries with animated skeletons. |
| `components/layout/public-nav.tsx`         | Remove (replaced by unified sidebar)                                                                                                                                                                                                                                        |
| `components/admin/admin-sidebar.tsx`       | Remove (replaced by unified sidebar)                                                                                                                                                                                                                                        |
| `components/audio-player/mini-player.tsx`  | Refactor into sidebar widget + mobile bottom bar                                                                                                                                                                                                                            |
| `components/library/podcast-card.tsx`      | Add shared element layoutId, hover animations                                                                                                                                                                                                                               |
| `components/library/podcast-grid.tsx`      | Wrap in staggered grid                                                                                                                                                                                                                                                      |
| `components/audio-player/audio-player.tsx` | Add micro-interactions (play/pause morph, bookmark bounce)                                                                                                                                                                                                                  |
| `components/ui/skeleton.tsx`               | Update for morphing transition support                                                                                                                                                                                                                                      |

### 7.5 Files to Remove

| File                                      | Reason                                        |
| ----------------------------------------- | --------------------------------------------- |
| `components/layout/public-nav.tsx`        | Replaced by unified sidebar                   |
| `components/admin/admin-sidebar.tsx`      | Replaced by unified sidebar                   |
| `components/audio-player/mini-player.tsx` | Split into sidebar widget + mobile bottom bar |

---

## 8. Out of Scope

- Backend API changes (this is a pure frontend overhaul)
- Database schema changes
- Authentication flow changes
- New feature development (only UI/UX improvements to existing features)
- Internationalization (i18n)
- Accessibility audit beyond reduced motion support (a11y audit should be a separate initiative)
