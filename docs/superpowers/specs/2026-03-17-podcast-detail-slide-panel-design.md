# Podcast Detail Page — Slide-in Attachment Panel Redesign

**Date:** 2026-03-17
**Status:** Approved

## Summary

Redesign the podcast detail page (`/podcast/[id]`) from a tab-based layout to a **two-column layout with a resizable slide-in PDF panel**. Attachments move from a tab to a persistent right sidebar. Clicking a file expands the sidebar into a 70% PDF viewer while the left content (player, transcript, bookmarks) compresses to 30%. A draggable divider lets users adjust the split ratio. The transition uses a smooth spring animation (~300-400ms) inspired by Mercury's team settings panel.

## Current State

- **Layout:** Full-width hero card (thumbnail + metadata + player) → AnimatedTabs (Transcript | Attachments | Bookmarks)
- **Attachments:** Rendered inside a tab using `react-pdf` with page-by-page navigation
- **Components:** `podcast-detail-layout.tsx`, `audio-player.tsx`, `transcript-viewer.tsx`, `bulletin-viewer.tsx`, `bookmark-panel.tsx`, `animated-tabs.tsx`
- **Animation:** Framer Motion (motion/react) with centralized tokens in `lib/animation.ts`

## Design

### Layout States

#### Default State (no PDF open)

```
┌──────────────────────────────────────────────┬──────────────┐
│  [← Back]  [Domain] [Year] [Tags]            │              │
│                                               │  ATTACHMENTS │
│  ┌─────────────────────────────────────────┐  │              │
│  │  Hero Card                              │  │  📄 File1    │
│  │  Thumbnail | Title + Desc | Player      │  │  📄 File2    │
│  └─────────────────────────────────────────┘  │  📄 File3    │
│                                               │              │
│  ┌─────────────────────────────────────────┐  │              │
│  │  Transcript (full-width, scrollable)    │  │              │
│  │  with time-synced segments              │  │              │
│  └─────────────────────────────────────────┘  │              │
│                                               │              │
│  ┌─────────────────────────────────────────┐  │              │
│  │  Bookmarks                              │  │              │
│  └─────────────────────────────────────────┘  │              │
└──────────────────────────────────────────────┴──────────────┘
         ~85% (main content)                     ~140px sidebar
```

- Right sidebar is ~140px, always visible when attachments exist
- Shows "Attachments" header + list of file names with document icon
- Each file name is clickable with hover state
- If no attachments, sidebar is hidden and layout is full-width

#### Expanded State (PDF open, ~30/70 default split)

```
┌──────────────┬─┬────────────────────────────────────────────┐
│  Compact     │║│  PDF Toolbar: filename | ⬇ Download | ✕    │
│  Player      │║│                                            │
│  Title       │║│  ┌────────────────────────────────────────┐│
│  ▶ ━━━ 3:22  │║│  │                                        ││
│  1.5x        │║│  │       PDF Content                      ││
│              │║│  │       (all pages rendered,              ││
│  TRANSCRIPT  │║│  │        inline scrollable)               ││
│  (compact,   │║│  │                                        ││
│  ~3-5 segs   │║│  │                                        ││
│  around      │║│  │                                        ││
│  active)     │║│  └────────────────────────────────────────┘│
│              │║│                                            │
│  BOOKMARKS   │║│  📄 File1 (active) | 📄 File2 | 📄 File3  │
│  (collapsed) │║│                                            │
└──────────────┴─┴────────────────────────────────────────────┘
    ~30%        ║              ~70%
           draggable
           divider
```

### Resizable Split View

Uses the **shadcn/ui `Resizable` component** (based on `react-resizable-panels`) for the split view. This provides built-in accessibility (keyboard arrow keys to resize, ARIA attributes), touch support, and handles all drag logic.

- `ResizablePanelGroup` wraps left + right panels with `direction="horizontal"`
- `ResizablePanel` for each side with `defaultSize`, `minSize`, `maxSize` props
- `ResizableHandle` renders the draggable divider with `withHandle` for the grab indicator
- Default split: 30% left / 70% right
- **Minimum left size:** 20% (~250px at typical viewport)
- **Minimum right size:** 40% (~400px, enough for readable PDF)
- PDF re-renders to fit its panel width via `ResizeObserver` (existing pattern in bulletin-viewer)
- Divider position is not persisted — resets to 30/70 on close/reopen

Requires installing the shadcn resizable component: `npx shadcn@latest add resizable`

### Component Behavior

#### Compact Player (expanded state)

Replaces the hero card in the left column. Contains:

- Podcast title (single line, truncated)
- Play/pause button (domain-colored, smaller ~36px circle)
- Progress bar with current time
- **Speed button** (cycles through 0.5x–2x, same as current)
- No thumbnail, no description, no volume control, no skip buttons, no bookmark button, no audio type toggle

The compact player is a **new component** (`compact-player.tsx`) that reads from the same Zustand store and uses the same `useHlsPlayer` hook.

#### Compact Transcript (expanded state)

- Shows ~3-5 segments centered on the currently active segment
- Fits the width of the left column (wraps naturally)
- Active segment still highlighted with domain-colored left border + background
- Click-to-seek still works
- Auto-scrolls to keep active segment visible
- Controlled by a `compact` prop on the existing `TranscriptViewer`

#### Compact Bookmarks (expanded state)

- Collapsed by default, showing just a header with count badge: "Bookmarks (3)"
- Expandable via toggle click
- When expanded, shows slim list: timestamps + truncated notes
- Add bookmark button still accessible
- Controlled by a `compact` prop on the existing `BookmarkPanel`

#### Attachment Sidebar (default state, ~140px)

- Header: "Attachments" label
- Each file: document icon (FileText from Lucide) + filename
- **Filename extraction:** Parse basename from the **raw URL** (before `resolveStorageUrl`) via `url.split('/').pop()`, strip extension, replace hyphens/underscores with spaces, title-case. Fallback to "Attachment N" if parsing fails. Note: `resolveStorageUrl` is only used for the PDF `Document` `file` prop and download `href` — not for display name parsing.
- Filename truncated with full name in `title` tooltip on hover
- Subtle hover background to indicate clickability
- When a PDF is open, the active file gets a highlighted background (domain-colored with low opacity)

#### PDF Viewer (expanded state, right panel)

- **Toolbar:** Active filename, scroll-position page indicator (e.g. "Page 3 / 12" — updates as user scrolls), download button, X close button (also closeable via `Escape` key)
- **Content:** Pages rendered in a **virtualized scrollable container** — only pages visible in the viewport plus a 1-page buffer above/below are rendered. Uses `@tanstack/react-virtual` for virtualization to prevent memory/performance issues with large PDFs (50-100+ pages).
- PDF width scales to fit the panel width (responds to panel resize via ResizeObserver)
- Uses existing `react-pdf` Document + Page components
- Virtualized list estimates page height from first rendered page, adjusts dynamically
- **Loading state:** Skeleton placeholder (pulsing gray rectangle matching page dimensions) while PDF loads
- Mercury fade animation on open (blur → clear)
- **File switching:** Keep old PDF visible at reduced opacity until new PDF's `onLoadSuccess` fires, then crossfade to prevent flash of empty content

### Animation & Transitions

**Two-phase approach** to avoid conflicts between motion/react and react-resizable-panels:

- **Phase 1 (open/close animation):** Uses motion/react to animate the layout transition. The `ResizablePanelGroup` is **only mounted when the panel is fully open**. During the open/close animation, layout is controlled by motion/react `animate` on plain flex containers.
- **Phase 2 (resizable):** Once the opening animation completes (`onAnimationComplete`), the flex layout swaps to a `ResizablePanelGroup` with the same 30/70 split. The swap is seamless because the sizes match. Closing reverses: unmount `ResizablePanelGroup`, animate flex containers back.

This ensures smooth spring animation for open/close AND full drag-to-resize once open.

#### Opening (spring, ~300-400ms)

One coordinated animation — everything moves together:

1. `isAttachmentOpen` set to true, triggers animation
2. Right content width animates from 140px → 70% via motion/react `animate`
3. Left content width animates from `calc(100% - 140px)` → 30% via motion/react `animate`
4. Hero card fades out via `AnimatePresence`
5. Compact player fades in at top of left column
6. Transcript reflows via `layout` animation
7. PDF content appears with `mercuryFade` variant (blur → clear)
8. `onAnimationComplete` → swap flex layout to `ResizablePanelGroup` (enables dragging)

New animation token in `lib/animation.ts`:

```typescript
// Stiffer than normal/slow — intentionally snappier for panel resize feel
panelSlide: { type: 'spring', stiffness: 200, damping: 25, mass: 1 }
```

#### Closing (X button)

1. Capture current panel sizes from `ResizablePanelGroup`
2. Swap `ResizablePanelGroup` back to flex layout at the same sizes
3. Animate flex containers: right compresses to 140px, left expands
4. Compact player fades out, hero card fades in
5. Transcript + bookmarks expand
6. `onAnimationComplete` → `isAttachmentOpen` fully cleared

#### File switching

- PDF content area crossfades (opacity out → new doc → opacity in)
- Active file highlight moves in sidebar
- No layout shift — panel stays open at current split ratio

#### Reduced motion

- All transitions instant (duration: 0) per existing `useReducedMotion` hook
- Layout changes still happen, just without animation

### Responsive Behavior

**Note:** Mobile is a follow-up task. This spec scopes implementation to desktop and tablet only.

| Breakpoint              | Behavior                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop (≥1024px)**   | Full two-column layout as described                                                                                                                                 |
| **Tablet (768-1023px)** | Same layout, sidebar narrows. Min left size enforced by ResizablePanel `minSize`                                                                                    |
| **Mobile (<768px)**     | _Follow-up task._ For now, hide the sidebar and show attachments as a horizontal row of file chips below the transcript. PDF opens in a simple modal/sheet overlay. |

### State Management

All new state is **local to `podcast-detail-layout.tsx`** — no new Zustand store needed:

```typescript
const [activeAttachmentUrl, setActiveAttachmentUrl] = useState<string | null>(null);
const isAttachmentOpen = activeAttachmentUrl !== null;
```

The draggable divider is handled entirely by the shadcn `ResizableHandle` component.

## Dependencies to Install

| Package                   | Purpose                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `react-resizable-panels`  | Required by shadcn/ui `Resizable` component (installed via `npx shadcn@latest add resizable`) |
| `@tanstack/react-virtual` | Virtualized scrolling for PDF pages to prevent memory issues with large documents             |

## Files to Create

| File                                                              | Purpose                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `components/audio-player/compact-player.tsx`                      | Minimal player for 30% column (title, play/pause, progress, speed) |
| `components/ui/resizable.tsx`                                     | shadcn/ui Resizable component (installed via CLI)                  |
| `__tests__/unit/components/audio-player/compact-player.test.tsx`  | Unit tests for compact player                                      |
| `__tests__/unit/components/audio-player/bookmark-panel.test.tsx`  | Unit tests for bookmark panel (new file — none exists currently)   |
| `__tests__/integration/components/podcast-detail-layout.test.tsx` | Integration tests for the full layout                              |

## Files to Modify

| File                                                   | Changes                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/audio-player/podcast-detail-layout.tsx`    | Replace tab layout with two-column + sidebar. Add open/close state, ResizablePanelGroup for split view, conditional rendering of hero vs compact player                                                                                                                                  |
| `components/audio-player/bulletin-viewer.tsx`          | **Full rewrite.** Remove page navigation, render pages via virtualized scroll. Remove attachment selector dropdown (sidebar handles selection). Add X close button to toolbar. Accept single `url` prop instead of `urls` array. Existing tests will be rewritten to match new behavior. |
| `components/audio-player/transcript-viewer.tsx`        | Add `compact` prop: when true, show only ~3-5 segments around active index                                                                                                                                                                                                               |
| `components/audio-player/bookmark-panel.tsx`           | Add `compact` prop: when true, collapse to header + count badge with toggle                                                                                                                                                                                                              |
| `lib/animation.ts`                                     | Add `panelSlide` transition token                                                                                                                                                                                                                                                        |
| `__tests__/unit/components/transcript-viewer.test.tsx` | Add compact mode test cases (keep at existing path for consistency with current location)                                                                                                                                                                                                |
| `__tests__/unit/components/bulletin-viewer.test.tsx`   | Rewrite for new virtualized scrollable behavior, X close button, single URL prop (keep at existing path)                                                                                                                                                                                 |

## Files NOT Changed

| File                                 | Reason                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `audio-player.tsx`                   | Hero card still uses the full player — no changes needed                                                              |
| `stores/player-store.ts`             | No new global state needed                                                                                            |
| `app/(public)/podcast/[id]/page.tsx` | Server component unchanged — same data passed to layout                                                               |
| `components/ui/animated-tabs.tsx`    | No longer imported by podcast-detail-layout, but may be used elsewhere. Do NOT delete — check for other usages first. |

## Testing Strategy

### New Unit Tests (Vitest + RTL)

| Test File                                                        | Cases                                                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `__tests__/unit/components/audio-player/compact-player.test.tsx` | Renders title, play/pause, progress, speed button; does NOT render volume/skip/bookmark/audio-type |
| `__tests__/unit/components/audio-player/bookmark-panel.test.tsx` | Compact mode renders collapsed with count badge; toggle expands; full mode unchanged               |

### Modified Unit Tests

| Test File                                              | Changes                                                                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/unit/components/transcript-viewer.test.tsx` | Add compact mode cases: shows limited segments around active index, still supports click-to-seek (existing path)                  |
| `__tests__/unit/components/bulletin-viewer.test.tsx`   | **Rewrite.** Test virtualized scrollable rendering, X close button callback, single URL prop, no page nav buttons (existing path) |

### Integration Tests

| Test File                                                         | Cases                                                                                                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/integration/components/podcast-detail-layout.test.tsx` | Clicking attachment opens panel; X closes panel; file switching works; sidebar shows filenames; compact mode activates when panel open |

### Unchanged Tests

- `__tests__/unit/components/audio-player/audio-labels.test.tsx` — hero player unmodified
