# Podcast Detail Slide-in Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the podcast detail page from tab-based layout to a two-column layout with a resizable slide-in PDF panel, persistent attachment sidebar, and compact player/transcript/bookmark variants.

**Architecture:** Two-phase animation approach — motion/react animates open/close transitions, then swaps to shadcn `ResizablePanelGroup` for drag-to-resize. New `CompactPlayer` component for the compressed left column. Existing `TranscriptViewer` and `BookmarkPanel` gain `compact` prop. `BulletinViewer` fully rewritten with `@tanstack/react-virtual` for virtualized PDF scrolling.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, motion/react, react-pdf, @tanstack/react-virtual, react-resizable-panels (shadcn), Vitest + RTL

**Spec:** `docs/superpowers/specs/2026-03-17-podcast-detail-slide-panel-design.md`

---

## Task 0: Install Dependencies & shadcn Resizable

**Files:**

- Modify: `package.json`
- Create: `components/ui/resizable.tsx` (via shadcn CLI)

- [ ] **Step 1: Install @tanstack/react-virtual**

Run: `npm install @tanstack/react-virtual`

- [ ] **Step 2: Add shadcn resizable component**

Run: `npx shadcn@latest add resizable`

This installs `react-resizable-panels` and creates `components/ui/resizable.tsx`.

- [ ] **Step 3: Verify installation**

Run: `npm ls @tanstack/react-virtual react-resizable-panels`
Expected: Both packages listed with versions.

- [ ] **Step 4: Add panelSlide animation token**

```typescript
// lib/animation.ts — add to the `transitions` object:
  // Stiffer than normal/slow — intentionally snappier for panel resize feel
  panelSlide: { type: 'spring' as const, stiffness: 200, damping: 25, mass: 1 },
```

Note: The `mercuryFade` variant already exists in `lib/animation.ts` — it will be used for the PDF panel entrance.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/ui/resizable.tsx lib/animation.ts
git commit -m "chore: install resizable panels, react-virtual, add panelSlide token"
```

**Naming note:** The existing `bulletin-viewer.tsx` exports `AttachmentViewer`. The rewrite in Task 5 renames this to `BulletinViewer`. Since `podcast-detail-layout.tsx` is also fully rewritten in Task 6 (the only consumer), no migration step is needed — both files are rewritten together.

---

## Task 1: Filename Extraction Utility

**Files:**

- Create: `lib/attachment-utils.ts`
- Create: `__tests__/unit/lib/attachment-utils.test.ts`

- [ ] **Step 1: Write failing tests for extractAttachmentName**

```typescript
// __tests__/unit/lib/attachment-utils.test.ts
/**
 * Unit tests for attachment filename extraction utility.
 *
 * Verifies parsing of display names from storage URL paths,
 * including edge cases like missing extensions, special characters,
 * and empty/null inputs.
 */
import { describe, it, expect } from 'vitest';
import { extractAttachmentName } from '@/lib/attachment-utils';

describe('extractAttachmentName', () => {
  it('extracts human-readable name from URL path', () => {
    expect(extractAttachmentName('/bulletins/Q3-Bulletin.pdf')).toBe('Q3 Bulletin');
  });

  it('replaces underscores with spaces', () => {
    expect(extractAttachmentName('/bulletins/standards_update.pdf')).toBe('Standards Update');
  });

  it('handles deeply nested paths', () => {
    expect(extractAttachmentName('/storage/podcasts/123/reference-guide.pdf')).toBe(
      'Reference Guide'
    );
  });

  it('returns fallback for empty string', () => {
    expect(extractAttachmentName('')).toBe('Attachment');
  });

  it('returns fallback with index when provided', () => {
    expect(extractAttachmentName('', 2)).toBe('Attachment 3');
  });

  it('handles URL without extension', () => {
    expect(extractAttachmentName('/bulletins/my-document')).toBe('My Document');
  });

  it('handles storage keys (not paths)', () => {
    expect(extractAttachmentName('bulletins/audit-report-2025.pdf')).toBe('Audit Report 2025');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/attachment-utils.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/attachment-utils.ts
/**
 * Utilities for working with podcast attachment URLs.
 *
 * Key responsibilities:
 * - Extract human-readable display names from storage URL paths
 * - Title-case and clean up filenames for sidebar display
 *
 * @example
 * import { extractAttachmentName } from '@/lib/attachment-utils';
 * extractAttachmentName('/bulletins/Q3-Bulletin.pdf'); // 'Q3 Bulletin'
 */

/**
 * Extracts a human-readable display name from an attachment URL.
 *
 * Parses the basename from the URL path, strips the file extension,
 * replaces hyphens and underscores with spaces, and title-cases the result.
 *
 * @param url - Raw storage URL or key (before resolveStorageUrl)
 * @param index - Optional zero-based index for the fallback name
 * @returns Human-readable name like "Q3 Bulletin" or "Attachment 3"
 */
export function extractAttachmentName(url: string, index?: number): string {
  if (!url) {
    return index !== undefined ? `Attachment ${index + 1}` : 'Attachment';
  }

  const basename = url.split('/').pop() ?? '';
  if (!basename) {
    return index !== undefined ? `Attachment ${index + 1}` : 'Attachment';
  }

  // Strip file extension
  const nameWithoutExt = basename.replace(/\.[^.]+$/, '');

  // Replace hyphens and underscores with spaces, then title-case
  const words = nameWithoutExt
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join(' ') || (index !== undefined ? `Attachment ${index + 1}` : 'Attachment');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/lib/attachment-utils.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/attachment-utils.ts __tests__/unit/lib/attachment-utils.test.ts
git commit -m "feat: add attachment filename extraction utility"
```

---

## Task 2: CompactPlayer Component

**Files:**

- Create: `components/audio-player/compact-player.tsx`
- Create: `__tests__/unit/components/audio-player/compact-player.test.tsx`

- [ ] **Step 1: Write failing tests for CompactPlayer**

```typescript
// __tests__/unit/components/audio-player/compact-player.test.tsx
/**
 * Unit tests for the CompactPlayer component.
 *
 * Verifies that the compact player renders only essential controls
 * (title, play/pause, progress bar, speed button) and does NOT render
 * volume, skip, bookmark, or audio type toggle controls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompactPlayer } from '@/components/audio-player/compact-player';
import { usePlayerStore } from '@/stores/player-store';

// Mock HLS.js
vi.mock('hls.js', () => ({
  default: class MockHls {
    static isSupported() {
      return true;
    }
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
  },
}));

function resetStore() {
  usePlayerStore.setState({
    currentPodcast: {
      id: '1',
      title: 'Test Podcast Title',
      audioShortUrl: '/short.mp3',
      audioLongUrl: '/long.mp3',
    },
    isPlaying: false,
    currentTime: 30,
    duration: 120,
    volume: 1,
    playbackRate: 1,
    audioType: 'short',
    isMiniPlayerVisible: false,
  });
}

beforeEach(() => {
  cleanup();
  resetStore();
});

describe('CompactPlayer', () => {
  it('renders the podcast title', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.textContent).toContain('Test Podcast Title');
  });

  it('renders play/pause button', () => {
    const { container } = render(<CompactPlayer />);
    const btn = container.querySelector('button[aria-label="Play"]');
    expect(btn).not.toBeNull();
  });

  it('renders pause button when playing', () => {
    usePlayerStore.setState({ isPlaying: true });
    const { container } = render(<CompactPlayer />);
    const btn = container.querySelector('button[aria-label="Pause"]');
    expect(btn).not.toBeNull();
  });

  it('renders speed button', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.textContent).toContain('1x');
  });

  it('cycles speed on click', async () => {
    const { container } = render(<CompactPlayer />);
    const user = userEvent.setup();
    const speedBtn = container.querySelector('button[aria-label="1x"]')!;
    await user.click(speedBtn);
    expect(container.textContent).toContain('1.25x');
  });

  it('renders progress bar (seek slider)', () => {
    const { container } = render(<CompactPlayer />);
    const slider = container.querySelector('[aria-label="Seek"]');
    expect(slider).not.toBeNull();
  });

  it('renders current time', () => {
    const { container } = render(<CompactPlayer />);
    expect(container.textContent).toContain('0:30');
  });

  it('does NOT render volume control', () => {
    const { container } = render(<CompactPlayer />);
    const volume = container.querySelector('[aria-label="Volume"]');
    const mute = container.querySelector('button[aria-label="Mute"]');
    expect(volume).toBeNull();
    expect(mute).toBeNull();
  });

  it('does NOT render skip buttons', () => {
    const { container } = render(<CompactPlayer />);
    const skipFwd = container.querySelector('button[aria-label="Skip forward"]');
    const skipBack = container.querySelector('button[aria-label="Skip backward"]');
    expect(skipFwd).toBeNull();
    expect(skipBack).toBeNull();
  });

  it('does NOT render bookmark button', () => {
    const { container } = render(<CompactPlayer />);
    const bookmark = container.querySelector('button[aria-label="Add bookmark"]');
    expect(bookmark).toBeNull();
  });

  it('does NOT render audio type toggle', () => {
    const { container } = render(<CompactPlayer />);
    const toggle = container.querySelector('button[aria-label="Brief Summary version"]');
    expect(toggle).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/audio-player/compact-player.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write CompactPlayer implementation**

```typescript
// components/audio-player/compact-player.tsx
/**
 * Compact audio player for the compressed left column.
 *
 * Displays only essential controls: title, play/pause, progress bar,
 * current time, and playback speed. Used when the PDF panel is open
 * and the left column is at 30% width.
 *
 * Dependencies:
 * - motion/react for play/pause icon morph
 * - lib/animation for transition tokens
 * - lib/domain-colors for DomainColor type
 * - stores/player-store for playback state
 * - hooks/use-hls-player for audio control
 */
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/stores/player-store';
import { useHlsPlayer } from '@/hooks/use-hls-player';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { transitions } from '@/lib/animation';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

/** Playback speed options. */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface CompactPlayerProps {
  /** Domain color for accent theming. */
  domainColor?: DomainColor;
}

/**
 * Minimal audio player for the compact left column.
 *
 * Renders title, play/pause, seek bar, current time, and speed control.
 * Does NOT render volume, skip, bookmark, or audio type controls.
 *
 * @param domainColor - Domain color for accent theming on play button and progress bar
 */
export function CompactPlayer({ domainColor }: CompactPlayerProps) {
  const { currentPodcast, isPlaying, currentTime, duration, playbackRate, togglePlay, setPlaybackRate } =
    usePlayerStore();
  const { seekTo } = useHlsPlayer();
  const reducedMotion = useReducedMotion();

  return (
    <div data-testid="compact-player" className="space-y-2 rounded-xl border border-border bg-card p-3">
      {/* Title */}
      <p className="truncate text-sm font-semibold">{currentPodcast?.title ?? 'Untitled'}</p>

      {/* Play/pause + progress row */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: domainColor?.border ?? 'var(--primary)',
            color: 'white',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isPlaying ? 'pause' : 'play'}
              initial={reducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
              transition={transitions.fast}
              className="flex items-center justify-center"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </button>

        <div className="flex flex-1 items-center gap-2">
          <div className="flex-1" style={{ '--primary': domainColor?.border } as React.CSSProperties}>
            <Slider
              aria-label="Seek"
              min={0}
              max={duration || 100}
              value={[currentTime]}
              onValueChange={(value) => seekTo(Array.isArray(value) ? value[0] : value)}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Speed button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const idx = SPEED_OPTIONS.indexOf(playbackRate);
            const nextIdx = (idx + 1) % SPEED_OPTIONS.length;
            setPlaybackRate(SPEED_OPTIONS[nextIdx]);
          }}
          aria-label={`${playbackRate}x`}
          className="h-7 text-xs font-mono"
        >
          {playbackRate}x
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/components/audio-player/compact-player.test.tsx`
Expected: All 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/audio-player/compact-player.tsx __tests__/unit/components/audio-player/compact-player.test.tsx
git commit -m "feat: add CompactPlayer component for slide-in panel"
```

---

## Task 3: TranscriptViewer Compact Mode

**Files:**

- Modify: `components/audio-player/transcript-viewer.tsx`
- Modify: `__tests__/unit/components/transcript-viewer.test.tsx`

- [ ] **Step 1: Write failing tests for compact mode**

Append these tests to the existing `__tests__/unit/components/transcript-viewer.test.tsx`, inside the `describe('TranscriptViewer', ...)` block:

```typescript
  // --- Compact mode tests ---

  it('shows only segments around active in compact mode', () => {
    const manySegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `Segment ${i}`,
    }));
    usePlayerStore.setState({ currentTime: 75 }); // Active index = 7
    const { container } = render(<TranscriptViewer segments={manySegments} compact />);
    const segments = container.querySelectorAll('[data-segment]');
    // Should show ~5 segments (2 before, active, 2 after)
    expect(segments.length).toBeLessThanOrEqual(5);
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });

  it('includes the active segment in compact mode', () => {
    const manySegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `Segment ${i}`,
    }));
    usePlayerStore.setState({ currentTime: 75 });
    const { container } = render(<TranscriptViewer segments={manySegments} compact />);
    const active = container.querySelector('[data-active="true"]');
    expect(active).not.toBeNull();
  });

  it('still calls onSeek in compact mode', async () => {
    const onSeek = vi.fn();
    const manySegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `Segment ${i}`,
    }));
    usePlayerStore.setState({ currentTime: 75 });
    const { container } = render(
      <TranscriptViewer segments={manySegments} onSeek={onSeek} compact />
    );
    const user = userEvent.setup();
    const segments = container.querySelectorAll('[data-segment]');
    await user.click(segments[0]);
    expect(onSeek).toHaveBeenCalled();
  });

  it('renders all segments when compact is false', () => {
    const manySegments = Array.from({ length: 20 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      text: `Segment ${i}`,
    }));
    const { container } = render(<TranscriptViewer segments={manySegments} />);
    const segments = container.querySelectorAll('[data-segment]');
    expect(segments.length).toBe(20);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/transcript-viewer.test.tsx`
Expected: FAIL — `compact` prop not recognized / all segments still rendered.

- [ ] **Step 3: Add compact prop to TranscriptViewer**

In `components/audio-player/transcript-viewer.tsx`:

1. Add `compact?: boolean` to `TranscriptViewerProps` interface.
2. Before the segments map, filter to a window around `activeIndex`:

```typescript
/** In compact mode, show only ~5 segments around the active one. */
const COMPACT_WINDOW = 2;
const visibleSegments = compact
  ? segments
      .map((seg, i) => ({ seg, i }))
      .filter(({ i }) => Math.abs(i - activeIndex) <= COMPACT_WINDOW)
  : segments.map((seg, i) => ({ seg, i }));
```

3. Update the `.map()` to iterate over `visibleSegments` instead of `segments`, using `({ seg, i })` destructuring. The `i` is the original index (for `data-segment-index`, `isActive` check, and `onSeek`).

4. Adjust the container height class to be shorter in compact mode:

```typescript
const containerHeight = compact
  ? 'max-h-60 overflow-y-auto'
  : 'h-[calc(100vh-300px)] min-h-100 overflow-y-auto';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/components/transcript-viewer.test.tsx`
Expected: All tests PASS (both existing and new compact mode tests).

- [ ] **Step 5: Commit**

```bash
git add components/audio-player/transcript-viewer.tsx __tests__/unit/components/transcript-viewer.test.tsx
git commit -m "feat: add compact mode to TranscriptViewer"
```

---

## Task 4: BookmarkPanel Compact Mode

**Files:**

- Modify: `components/audio-player/bookmark-panel.tsx`
- Create: `__tests__/unit/components/audio-player/bookmark-panel.test.tsx`

- [ ] **Step 1: Write failing tests for compact mode**

```typescript
// __tests__/unit/components/audio-player/bookmark-panel.test.tsx
/**
 * Unit tests for BookmarkPanel compact mode.
 *
 * Verifies that compact mode renders a collapsed header with bookmark count,
 * can be toggled open, and that full mode renders the complete panel.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkPanel } from '@/components/audio-player/bookmark-panel';
import { usePlayerStore } from '@/stores/player-store';

// Mock fetch for bookmark API
const mockBookmarks = [
  { id: '1', podcastId: 'pod-1', timestampSeconds: 30, note: 'First note', createdAt: '2025-01-01' },
  { id: '2', podcastId: 'pod-1', timestampSeconds: 90, note: null, createdAt: '2025-01-01' },
];

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: mockBookmarks }),
}) as unknown as typeof fetch;

function resetStore() {
  usePlayerStore.setState({
    currentPodcast: { id: 'pod-1', title: 'Test', audioShortUrl: '/s.mp3', audioLongUrl: null },
    isPlaying: false,
    currentTime: 0,
    duration: 120,
    volume: 1,
    playbackRate: 1,
    audioType: 'short',
    isMiniPlayerVisible: false,
  });
}

beforeEach(() => {
  cleanup();
  resetStore();
  vi.clearAllMocks();
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockBookmarks }),
  });
});

describe('BookmarkPanel compact mode', () => {
  it('renders collapsed header with count in compact mode', async () => {
    const { container } = render(<BookmarkPanel podcastId="pod-1" compact />);
    await waitFor(() => {
      expect(container.textContent).toContain('Bookmarks');
      expect(container.textContent).toContain('2');
    });
  });

  it('does not show bookmark list when compact and collapsed', async () => {
    const { container } = render(<BookmarkPanel podcastId="pod-1" compact />);
    await waitFor(() => {
      expect(container.textContent).toContain('2');
    });
    // Bookmark notes should not be visible
    expect(container.textContent).not.toContain('First note');
  });

  it('expands to show bookmarks on toggle click in compact mode', async () => {
    const { container } = render(<BookmarkPanel podcastId="pod-1" compact />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(container.textContent).toContain('2');
    });
    const toggle = container.querySelector('button[aria-label="Toggle bookmarks"]')!;
    await user.click(toggle);
    await waitFor(() => {
      expect(container.textContent).toContain('First note');
    });
  });

  it('renders full panel when compact is false', async () => {
    const { container } = render(<BookmarkPanel podcastId="pod-1" />);
    await waitFor(() => {
      expect(container.textContent).toContain('First note');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/audio-player/bookmark-panel.test.tsx`
Expected: FAIL — `compact` prop not recognized.

- [ ] **Step 3: Add compact prop to BookmarkPanel**

In `components/audio-player/bookmark-panel.tsx`:

1. Add `compact?: boolean` to `BookmarkPanelProps`.
2. Add state: `const [isExpanded, setIsExpanded] = useState(false);`
3. When `compact` is true and not expanded, render a collapsed header:

```tsx
if (compact && !isExpanded) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <button
        onClick={() => setIsExpanded(true)}
        aria-label="Toggle bookmarks"
        className="flex w-full items-center justify-between text-sm"
      >
        <span className="font-medium">Bookmarks</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
          {bookmarks.length}
        </span>
      </button>
    </div>
  );
}
```

4. When `compact` is true and expanded, render the full list but with a collapse button:

```tsx
if (compact && isExpanded) {
  // Render the existing bookmark list wrapped in a compact container
  // Add a collapse toggle at the top
}
```

The full (non-compact) mode remains unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/components/audio-player/bookmark-panel.test.tsx`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/audio-player/bookmark-panel.tsx __tests__/unit/components/audio-player/bookmark-panel.test.tsx
git commit -m "feat: add compact mode to BookmarkPanel"
```

---

## Task 5: BulletinViewer Rewrite (Virtualized Scrollable PDF)

**Files:**

- Rewrite: `components/audio-player/bulletin-viewer.tsx`
- Rewrite: `__tests__/unit/components/bulletin-viewer.test.tsx`

- [ ] **Step 1: Write new tests for the rewritten BulletinViewer**

```typescript
// __tests__/unit/components/bulletin-viewer.test.tsx
/**
 * Unit tests for the rewritten BulletinViewer component.
 *
 * Verifies virtualized PDF rendering with all pages scrollable,
 * toolbar with filename/page indicator/download/close button,
 * and loading/empty states. Uses mocked react-pdf and react-virtual.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulletinViewer } from '@/components/audio-player/bulletin-viewer';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Simulate a width measurement
    this.callback(
      [{ contentRect: { width: 600 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

let capturedOnLoadSuccess: ((data: { numPages: number }) => void) | null = null;

vi.mock('react-pdf', () => ({
  Document: ({
    children,
    onLoadSuccess,
  }: {
    children: React.ReactNode;
    onLoadSuccess?: (data: { numPages: number }) => void;
  }) => {
    capturedOnLoadSuccess = onLoadSuccess ?? null;
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid={`pdf-page-${pageNumber}`} style={{ height: 800 }}>
      Page {pageNumber}
    </div>
  ),
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' }, version: '4.0.0' },
}));

// Mock @tanstack/react-virtual to render all items for testing
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        key: i,
        start: i * 800,
        size: 800,
      })),
    getTotalSize: () => count * 800,
    measureElement: vi.fn(),
  }),
}));

function simulatePdfLoad(numPages: number) {
  act(() => {
    capturedOnLoadSuccess?.({ numPages });
  });
}

beforeEach(() => {
  cleanup();
  capturedOnLoadSuccess = null;
});

describe('BulletinViewer', () => {
  it('renders the PDF document', () => {
    const { container } = render(
      <BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />
    );
    expect(container.querySelector('[data-testid="pdf-document"]')).not.toBeNull();
  });

  it('renders all pages in scrollable container after load', () => {
    const { container } = render(
      <BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />
    );
    simulatePdfLoad(5);
    for (let i = 1; i <= 5; i++) {
      expect(container.querySelector(`[data-testid="pdf-page-${i}"]`)).not.toBeNull();
    }
  });

  it('does NOT render page navigation buttons', () => {
    const { container } = render(
      <BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />
    );
    simulatePdfLoad(3);
    expect(container.querySelector('button[aria-label="Next page"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Previous page"]')).toBeNull();
  });

  it('renders close button that calls onClose', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <BulletinViewer url="/bulletins/test.pdf" onClose={onClose} />
    );
    const user = userEvent.setup();
    const closeBtn = container.querySelector('button[aria-label="Close PDF viewer"]')!;
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders download link', () => {
    const { container } = render(
      <BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />
    );
    const downloadLink = container.querySelector('a[aria-label="Download PDF"]');
    expect(downloadLink).not.toBeNull();
  });

  it('displays filename in toolbar', () => {
    const { container } = render(
      <BulletinViewer url="/bulletins/Q3-Bulletin.pdf" onClose={vi.fn()} filename="Q3 Bulletin" />
    );
    expect(container.textContent).toContain('Q3 Bulletin');
  });

  it('shows page count after load', () => {
    const { container } = render(
      <BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />
    );
    simulatePdfLoad(12);
    expect(container.textContent).toContain('12');
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<BulletinViewer url="/bulletins/test.pdf" onClose={onClose} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows loading skeleton before PDF loads', () => {
    const { container } = render(
      <BulletinViewer url="/bulletins/test.pdf" onClose={vi.fn()} />
    );
    // Before simulatePdfLoad, skeleton should be visible
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/components/bulletin-viewer.test.tsx`
Expected: FAIL — old component has different API (`urls` prop, no `onClose`).

- [ ] **Step 3: Rewrite BulletinViewer**

```typescript
// components/audio-player/bulletin-viewer.tsx
/**
 * Virtualized PDF viewer for the slide-in attachment panel.
 *
 * Renders all pages of a PDF in a scrollable container using
 * @tanstack/react-virtual to virtualize rendering (only visible
 * pages + 1-page buffer are in the DOM). Includes a toolbar with
 * filename, page indicator, download, and close button.
 *
 * Dependencies:
 * - react-pdf for PDF rendering (Document + Page components)
 * - @tanstack/react-virtual for scroll virtualization
 * - motion/react for mercury fade entrance animation
 * - lib/animation for variant/transition tokens
 * - lib/storage-url for resolving storage keys to URLs
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { variants, getTransition } from '@/lib/animation';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { resolveStorageUrl } from '@/lib/storage-url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** Default estimated height for a PDF page before measurement. */
const ESTIMATED_PAGE_HEIGHT = 800;

interface BulletinViewerProps {
  /** Single PDF URL (raw storage key — resolved internally). */
  url: string;
  /** Display name for the toolbar. */
  filename?: string;
  /** Called when the user clicks the close button or presses Escape. */
  onClose: () => void;
}

/**
 * Virtualized PDF viewer with toolbar.
 *
 * Renders all pages in a scrollable container, virtualizing to only
 * mount visible pages + a 1-page buffer above/below.
 *
 * @param url - Raw storage URL for the PDF
 * @param filename - Human-readable name for the toolbar display
 * @param onClose - Callback when the close button is clicked
 */
export function BulletinViewer({ url, filename, onClose }: BulletinViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const resolvedUrl = resolveStorageUrl(url);
  const Wrapper = reducedMotion ? 'div' : motion.div;
  const wrapperProps = reducedMotion
    ? {}
    : {
        initial: 'hidden' as const,
        animate: 'visible' as const,
        variants: variants.mercuryFade,
        transition: getTransition('slow'),
      };

  /** Handle successful PDF document load. */
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  /** Track container width for responsive PDF rendering. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** Handle Escape key to close. */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  /** Virtualize the page list. */
  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_PAGE_HEIGHT,
    overscan: 1,
  });

  /** Compute current visible page for the page indicator. */
  const virtualItems = virtualizer.getVirtualItems();
  const currentVisiblePage = virtualItems.length > 0 ? virtualItems[0].index + 1 : 0;

  return (
    <Wrapper ref={containerRef} className="flex h-full flex-col" {...wrapperProps}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="truncate text-sm font-medium">{filename ?? 'PDF'}</span>
          {numPages > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Page {currentVisiblePage} / {numPages}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <a
            href={resolvedUrl}
            download
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted"
            aria-label="Download PDF"
          >
            <Download className="h-4 w-4" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close PDF viewer"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable PDF container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-muted/30">
        <Document file={resolvedUrl} onLoadSuccess={onDocumentLoadSuccess}>
          {numPages > 0 ? (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map((virtualItem) => (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Page
                    pageNumber={virtualItem.index + 1}
                    width={containerWidth - 32}
                    className="mx-auto"
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Loading skeleton */
            <div className="flex items-center justify-center p-8">
              <div className="h-[600px] w-full max-w-md animate-pulse rounded bg-muted" />
            </div>
          )}
        </Document>
      </div>
    </Wrapper>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/components/bulletin-viewer.test.tsx`
Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/audio-player/bulletin-viewer.tsx __tests__/unit/components/bulletin-viewer.test.tsx
git commit -m "feat: rewrite BulletinViewer with virtualized scrollable PDF"
```

---

## Task 6: Podcast Detail Layout Rewrite

This is the main layout orchestration task — the largest change. It replaces the tab-based layout with the two-column slide-in panel design.

**Files:**

- Rewrite: `components/audio-player/podcast-detail-layout.tsx`
- Create: `__tests__/integration/components/podcast-detail-layout.test.tsx`

- [ ] **Step 1: Write failing integration tests (TDD — tests first)**

```typescript
// __tests__/integration/components/podcast-detail-layout.test.tsx
/**
 * Integration tests for the podcast detail layout.
 *
 * Verifies the two-column layout with attachment sidebar,
 * slide-in PDF panel opening/closing, file switching,
 * compact mode activation, and active file highlighting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PodcastDetailLayout } from '@/components/audio-player/podcast-detail-layout';

// Mock HLS.js
vi.mock('hls.js', () => ({
  default: class MockHls {
    static isSupported() { return true; }
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
  },
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>
  ),
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' }, version: '4.0.0' },
}));

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    measureElement: vi.fn(),
  }),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock fetch for bookmarks
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
}) as unknown as typeof fetch;

const mockPodcast = {
  id: 'pod-1',
  title: 'Test Podcast',
  description: 'A test podcast description',
  domain: 'Audit Methodology',
  year: 2025,
  tags: ['audit', 'methodology'],
  thumbnailUrl: '/thumbnails/test.jpg',
  audioShortUrl: '/audio/short.mp3',
  audioLongUrl: '/audio/long.mp3',
  bulletinUrls: ['/bulletins/Q3-Bulletin.pdf', '/bulletins/Standards-Update.pdf'],
  transcripts: [
    {
      id: 't1',
      fullText: 'Full transcript text',
      segments: [
        { start: 0, end: 10, text: 'Segment one' },
        { start: 10, end: 20, text: 'Segment two' },
      ],
      transcriptType: 'short',
    },
  ],
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  });
});

describe('PodcastDetailLayout', () => {
  it('renders the attachment sidebar with filenames', () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    expect(container.textContent).toContain('Q3 Bulletin');
    expect(container.textContent).toContain('Standards Update');
  });

  it('renders sidebar header "Attachments"', () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    expect(container.textContent).toContain('Attachments');
  });

  it('renders the hero card with full audio player in default state', () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    expect(container.textContent).toContain('Test Podcast');
    expect(container.querySelector('[data-testid="audio-player"]')).not.toBeNull();
  });

  it('opens PDF panel when clicking an attachment', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const fileButton = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(fileButton);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).not.toBeNull();
    });
  });

  it('shows compact player when PDF panel is open', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const fileButton = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(fileButton);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="compact-player"]')).not.toBeNull();
    });
  });

  it('highlights the active file in the sidebar', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const fileButton = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(fileButton);
    await waitFor(() => {
      expect(fileButton.getAttribute('data-active')).toBe('true');
    });
  });

  it('closes PDF panel when clicking close button', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const fileButton = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(fileButton);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).not.toBeNull();
    });
    const closeBtn = container.querySelector('button[aria-label="Close PDF viewer"]')!;
    await user.click(closeBtn);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="pdf-document"]')).toBeNull();
    });
  });

  it('switches files when clicking a different attachment', async () => {
    const { container } = render(<PodcastDetailLayout podcast={mockPodcast} />);
    const user = userEvent.setup();
    const file0 = container.querySelector('[data-testid="attachment-file-0"]')!;
    await user.click(file0);
    await waitFor(() => {
      expect(file0.getAttribute('data-active')).toBe('true');
    });
    const file1 = container.querySelector('[data-testid="attachment-file-1"]')!;
    await user.click(file1);
    await waitFor(() => {
      expect(file1.getAttribute('data-active')).toBe('true');
      expect(file0.getAttribute('data-active')).toBe('false');
    });
  });

  it('hides sidebar when no attachments', () => {
    const noAttachments = { ...mockPodcast, bulletinUrls: [] };
    const { container } = render(<PodcastDetailLayout podcast={noAttachments} />);
    expect(container.textContent).not.toContain('Attachments');
    expect(container.querySelector('[data-testid="attachment-sidebar"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/integration/components/podcast-detail-layout.test.tsx`
Expected: FAIL — layout doesn't have sidebar, compact player, or attachment handling yet.

- [ ] **Step 3: Rewrite podcast-detail-layout.tsx**

```typescript
// components/audio-player/podcast-detail-layout.tsx
/**
 * Client-side layout for the podcast detail page.
 *
 * Two-column layout with persistent attachment sidebar on the right.
 * Clicking a file opens a slide-in PDF panel (70% width) while the
 * left column compresses to 30% with compact player/transcript/bookmarks.
 *
 * Two-phase animation: motion/react animates open/close, then swaps
 * to ResizablePanelGroup for drag-to-resize once animation completes.
 *
 * Dependencies:
 * - motion/react for open/close animations
 * - lib/animation for shared variants and transition configs
 * - lib/domain-colors for per-domain color tokens
 * - lib/attachment-utils for filename extraction
 * - next-themes for dark/light mode
 * - components/ui/resizable for drag-to-resize split view
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import { ArrowLeft, FileText } from 'lucide-react';
import { resolveStorageUrl } from '@/lib/storage-url';
import { usePlayerStore } from '@/stores/player-store';
import { useHlsPlayer } from '@/hooks/use-hls-player';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { variants, transitions, sectionStagger } from '@/lib/animation';
import { getDomainColor } from '@/lib/domain-colors';
import { extractAttachmentName } from '@/lib/attachment-utils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { AudioPlayer } from './audio-player';
import { CompactPlayer } from './compact-player';
import { TranscriptViewer } from './transcript-viewer';
import { BulletinViewer } from './bulletin-viewer';
import { BookmarkPanel } from './bookmark-panel';
import type { TranscriptSegment } from '@/hooks/use-transcript-sync';

interface Transcript {
  id: string;
  fullText: string;
  segments: TranscriptSegment[] | unknown;
  transcriptType: string;
}

interface PodcastRecord {
  id: string;
  title: string;
  description: string;
  domain: string;
  year: number;
  tags: string[];
  thumbnailUrl: string;
  audioShortUrl: string;
  audioLongUrl: string | null;
  bulletinUrls: string[];
  transcripts: Transcript[];
}

interface PodcastDetailLayoutProps {
  podcast: PodcastRecord;
  relatedPodcasts?: PodcastRecord[];
}

export function PodcastDetailLayout({ podcast }: PodcastDetailLayoutProps) {
  const { seekTo } = useHlsPlayer();
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const domainColor = getDomainColor(podcast.domain);
  const badgeBg = isDark ? domainColor.darkBg : domainColor.bg;
  const badgeText = isDark ? domainColor.darkText : domainColor.text;

  const hasAttachments = podcast.bulletinUrls.length > 0;

  /** Slide-in panel state. */
  const [activeAttachmentUrl, setActiveAttachmentUrl] = useState<string | null>(null);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const isAttachmentOpen = activeAttachmentUrl !== null;

  /** Open an attachment in the PDF panel. */
  const openAttachment = (url: string) => {
    setIsAnimationComplete(false);
    setActiveAttachmentUrl(url);
  };

  /** Close the PDF panel. */
  const closeAttachment = () => {
    setIsAnimationComplete(false);
    setActiveAttachmentUrl(null);
  };

  /** Load the podcast into the player store on mount. */
  useEffect(() => {
    usePlayerStore.getState().loadPodcast({
      id: podcast.id,
      title: podcast.title,
      audioShortUrl: podcast.audioShortUrl,
      audioLongUrl: podcast.audioLongUrl,
      thumbnailUrl: podcast.thumbnailUrl,
    });
  }, [
    podcast.id,
    podcast.title,
    podcast.audioShortUrl,
    podcast.audioLongUrl,
    podcast.thumbnailUrl,
  ]);

  /** Extract transcript segments for the active audio type. */
  const audioType = usePlayerStore((s) => s.audioType);
  const activeTranscript =
    podcast.transcripts.find((t) => t.transcriptType === audioType) ?? podcast.transcripts[0];

  const segments: TranscriptSegment[] = useMemo(
    () =>
      Array.isArray(activeTranscript?.segments)
        ? (activeTranscript.segments as TranscriptSegment[])
        : [],
    [activeTranscript]
  );

  /** Active filename for the PDF toolbar. */
  const activeFilename = activeAttachmentUrl
    ? extractAttachmentName(activeAttachmentUrl)
    : undefined;

  /* Choose wrapper element based on reduced-motion preference. */
  const Wrapper = reducedMotion ? 'div' : motion.div;
  const Section = reducedMotion ? 'div' : motion.div;

  const wrapperProps = reducedMotion
    ? {}
    : { variants: sectionStagger, initial: 'hidden' as const, animate: 'visible' as const };
  const sectionProps = reducedMotion
    ? {}
    : { variants: variants.slideInFromLeft, transition: transitions.normal };

  /** Shared left-column content (compact or full). */
  const leftContent = (
    <>
      {/* Back link + badges */}
      <Section {...sectionProps}>
        <Link
          href="/bulletins"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to library
        </Link>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: badgeBg, color: badgeText }}
          >
            {podcast.domain}
          </span>
          <span className="text-xs text-muted-foreground">{podcast.year}</span>
          {podcast.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </Section>

      {/* Hero card OR compact player */}
      <AnimatePresence mode="wait">
        {isAttachmentOpen ? (
          <motion.div
            key="compact"
            initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={transitions.fast}
          >
            <CompactPlayer domainColor={domainColor} />
          </motion.div>
        ) : (
          <motion.div
            key="hero"
            initial={reducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={transitions.fast}
          >
            <Section
              className="flex overflow-hidden rounded-xl border border-border bg-card"
              {...sectionProps}
            >
              {/* Domain-colored left edge */}
              <div className="w-1.5 shrink-0" style={{ backgroundColor: domainColor.border }} />
              <div className="flex flex-1 flex-col gap-6 p-5 lg:flex-row lg:items-start lg:p-6">
                <div className="flex min-w-0 flex-1 items-start gap-5">
                  <div className="relative hidden size-32 shrink-0 overflow-hidden rounded-xl sm:block lg:size-40">
                    <Image
                      src={resolveStorageUrl(podcast.thumbnailUrl)}
                      alt={podcast.title}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                      {podcast.title}
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {podcast.description}
                    </p>
                  </div>
                </div>
                <div className="w-full lg:w-100 lg:shrink-0">
                  <AudioPlayer domainColor={domainColor} />
                </div>
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript */}
      <Section className="mt-6" {...sectionProps}>
        <TranscriptViewer
          segments={segments}
          fullText={activeTranscript?.fullText}
          onSeek={seekTo}
          domainColor={domainColor}
          compact={isAttachmentOpen}
        />
      </Section>

      {/* Bookmarks */}
      <Section className="mt-4" {...sectionProps}>
        <BookmarkPanel
          podcastId={podcast.id}
          onSeek={seekTo}
          domainColor={domainColor}
          compact={isAttachmentOpen}
        />
      </Section>
    </>
  );

  /** Attachment sidebar file list. */
  const sidebarContent = (
    <div data-testid="attachment-sidebar" className="space-y-2 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Attachments
      </h3>
      {podcast.bulletinUrls.map((url, index) => {
        const isActive = activeAttachmentUrl === url;
        return (
          <button
            key={url}
            data-testid={`attachment-file-${index}`}
            data-active={isActive ? 'true' : 'false'}
            title={url.split('/').pop() ?? `Attachment ${index + 1}`}
            onClick={() => openAttachment(url)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            style={
              isActive
                ? {
                    backgroundColor: isDark
                      ? `${domainColor.darkBg}40`
                      : `${domainColor.bg}`,
                    borderLeft: `2px solid ${domainColor.border}`,
                  }
                : undefined
            }
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{extractAttachmentName(url, index)}</span>
          </button>
        );
      })}
    </div>
  );

  /** PDF viewer panel (right side when open). */
  const pdfPanel = activeAttachmentUrl ? (
    <BulletinViewer
      url={activeAttachmentUrl}
      filename={activeFilename}
      onClose={closeAttachment}
    />
  ) : null;

  /** No attachments — render full-width layout without sidebar. */
  if (!hasAttachments) {
    return (
      <Wrapper className="mx-auto max-w-5xl px-4 py-8 lg:py-12" {...wrapperProps}>
        {leftContent}
      </Wrapper>
    );
  }

  /** Phase 2: resizable mode — panel fully open, animation done. */
  if (isAttachmentOpen && isAnimationComplete) {
    return (
      <Wrapper className="mx-auto max-w-7xl px-4 py-8 lg:py-12" {...wrapperProps}>
        <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-120px)]">
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="h-full overflow-y-auto pr-4">{leftContent}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} minSize={40}>
            <div className="flex h-full flex-col">
              {pdfPanel}
              <div className="border-t border-border">{sidebarContent}</div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Wrapper>
    );
  }

  /** Phase 1: default or animating — motion/react controls widths. */
  return (
    <Wrapper className="mx-auto max-w-7xl px-4 py-8 lg:py-12" {...wrapperProps}>
      <div className="flex min-h-[calc(100vh-120px)] gap-4">
        {/* Left column */}
        <motion.div
          className="min-w-0 overflow-y-auto"
          animate={{ flex: isAttachmentOpen ? '0 0 30%' : '1 1 0%' }}
          transition={reducedMotion ? { duration: 0 } : transitions.panelSlide}
          onAnimationComplete={() => {
            if (isAttachmentOpen) setIsAnimationComplete(true);
          }}
        >
          {leftContent}
        </motion.div>

        {/* Right column: sidebar or PDF viewer */}
        <motion.div
          className="shrink-0 overflow-hidden rounded-xl border border-border bg-card"
          animate={{
            width: isAttachmentOpen ? '70%' : 140,
            flex: isAttachmentOpen ? '0 0 70%' : '0 0 140px',
          }}
          transition={reducedMotion ? { duration: 0 } : transitions.panelSlide}
        >
          {isAttachmentOpen ? (
            <div className="flex h-full flex-col">
              {pdfPanel}
              <div className="border-t border-border">{sidebarContent}</div>
            </div>
          ) : (
            sidebarContent
          )}
        </motion.div>
      </div>
    </Wrapper>
  );
}
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run __tests__/unit/components/ __tests__/integration/components/`
Expected: All tests pass — both existing unit tests and the new integration tests.

- [ ] **Step 5: Commit**

```bash
git add components/audio-player/podcast-detail-layout.tsx __tests__/integration/components/podcast-detail-layout.test.tsx
git commit -m "feat: rewrite podcast detail layout with slide-in PDF panel"
```

---

## Task 7: Visual Review & Polish

- [ ] **Step 1: Start dev server and test manually**

Run: `npm run dev`

Open a podcast detail page with attachments. Verify:

- Default state: hero card, transcript, bookmarks visible. Sidebar shows file names.
- Click a file: panel slides in smoothly, player compresses, transcript shows ~5 segments.
- Drag the divider: both sides resize. PDF re-renders to fit.
- Click X: panel closes, layout restores.
- Click a different file while panel is open: PDF switches.
- Escape key closes the panel.

- [ ] **Step 2: Test with no attachments**

Open a podcast with `bulletinUrls: []`. Verify the page renders full-width with no sidebar.

- [ ] **Step 3: Test reduced motion**

In browser dev tools, enable "Prefer reduced motion". Verify all transitions are instant.

- [ ] **Step 4: Fix any visual issues discovered**

Address spacing, overflow, or animation timing issues found during manual testing.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Commit any polish fixes**

```bash
git add components/audio-player/ lib/animation.ts
git commit -m "fix: polish slide-in panel animations and responsive layout"
```
