# Stage 3: Audio Experience — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full audio player with HLS streaming, synced transcript viewer, and PDF bulletin viewer.

**Architecture:** Zustand store for player state, HLS.js for adaptive streaming, custom transcript sync logic, react-pdf for bulletins. Client Components for interactivity, with Server Components for data fetching on the podcast detail page.

**Tech Stack:** HLS.js, Zustand, react-pdf, shadcn/ui, Tailwind 4.

**Prerequisite:** Stage 2 (Core Content) is complete — podcast CRUD APIs, file upload, admin dashboard, and public library are functional.

---

## Task 1: Zustand Player Store

**Files:**
- `stores/player-store.ts` — global audio player state
- `stores/__tests__/player-store.test.ts` — unit tests for all state transitions

### Steps

- [ ] **1.1 — Install Zustand**
  ```bash
  npm install zustand
  ```

- [ ] **1.2 — Write failing tests first**
  Create `stores/__tests__/player-store.test.ts`:
  ```typescript
  import { describe, it, expect, beforeEach } from 'vitest';
  import { usePlayerStore } from '../player-store';

  // Reset store between tests
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState());
  });

  describe('player-store', () => {
    describe('initial state', () => {
      it('starts with no podcast loaded', () => {
        const state = usePlayerStore.getState();
        expect(state.currentPodcast).toBeNull();
        expect(state.isPlaying).toBe(false);
        expect(state.currentTime).toBe(0);
        expect(state.duration).toBe(0);
        expect(state.volume).toBe(1);
        expect(state.playbackRate).toBe(1);
        expect(state.audioType).toBe('short');
      });
    });

    describe('loadPodcast', () => {
      it('sets the current podcast and resets playback state', () => {
        const podcast = { id: '1', title: 'Test', audioShortUrl: '/audio/short.m3u8', audioLongUrl: '/audio/long.m3u8' };
        usePlayerStore.getState().loadPodcast(podcast);
        const state = usePlayerStore.getState();
        expect(state.currentPodcast).toEqual(podcast);
        expect(state.isPlaying).toBe(false);
        expect(state.currentTime).toBe(0);
      });
    });

    describe('play / pause', () => {
      it('toggles isPlaying to true', () => {
        usePlayerStore.getState().play();
        expect(usePlayerStore.getState().isPlaying).toBe(true);
      });
      it('toggles isPlaying to false', () => {
        usePlayerStore.getState().play();
        usePlayerStore.getState().pause();
        expect(usePlayerStore.getState().isPlaying).toBe(false);
      });
    });

    describe('seek', () => {
      it('sets currentTime to the given value', () => {
        usePlayerStore.getState().seek(42.5);
        expect(usePlayerStore.getState().currentTime).toBe(42.5);
      });
      it('clamps to 0 if negative', () => {
        usePlayerStore.getState().seek(-10);
        expect(usePlayerStore.getState().currentTime).toBe(0);
      });
      it('clamps to duration if exceeds', () => {
        usePlayerStore.getState().setDuration(100);
        usePlayerStore.getState().seek(150);
        expect(usePlayerStore.getState().currentTime).toBe(100);
      });
    });

    describe('setVolume', () => {
      it('sets volume between 0 and 1', () => {
        usePlayerStore.getState().setVolume(0.5);
        expect(usePlayerStore.getState().volume).toBe(0.5);
      });
      it('clamps to 0', () => {
        usePlayerStore.getState().setVolume(-0.5);
        expect(usePlayerStore.getState().volume).toBe(0);
      });
      it('clamps to 1', () => {
        usePlayerStore.getState().setVolume(1.5);
        expect(usePlayerStore.getState().volume).toBe(1);
      });
    });

    describe('setPlaybackRate', () => {
      it('sets rate to allowed values', () => {
        usePlayerStore.getState().setPlaybackRate(1.5);
        expect(usePlayerStore.getState().playbackRate).toBe(1.5);
      });
      it('rejects invalid rates', () => {
        usePlayerStore.getState().setPlaybackRate(3);
        expect(usePlayerStore.getState().playbackRate).toBe(1); // unchanged from default
      });
    });

    describe('toggleAudioType', () => {
      it('toggles from short to long', () => {
        usePlayerStore.getState().toggleAudioType();
        expect(usePlayerStore.getState().audioType).toBe('long');
      });
      it('toggles from long to short', () => {
        usePlayerStore.getState().toggleAudioType();
        usePlayerStore.getState().toggleAudioType();
        expect(usePlayerStore.getState().audioType).toBe('short');
      });
      it('resets currentTime to 0 on toggle', () => {
        usePlayerStore.getState().seek(30);
        usePlayerStore.getState().toggleAudioType();
        expect(usePlayerStore.getState().currentTime).toBe(0);
      });
    });

    describe('skipForward / skipBackward', () => {
      it('skips forward by 10 seconds', () => {
        usePlayerStore.getState().setDuration(100);
        usePlayerStore.getState().seek(20);
        usePlayerStore.getState().skipForward();
        expect(usePlayerStore.getState().currentTime).toBe(30);
      });
      it('skips backward by 10 seconds', () => {
        usePlayerStore.getState().seek(20);
        usePlayerStore.getState().skipBackward();
        expect(usePlayerStore.getState().currentTime).toBe(10);
      });
      it('clamps skipBackward to 0', () => {
        usePlayerStore.getState().seek(5);
        usePlayerStore.getState().skipBackward();
        expect(usePlayerStore.getState().currentTime).toBe(0);
      });
    });
  });
  ```

- [ ] **1.3 — Implement `stores/player-store.ts`**
  ```typescript
  import { create } from 'zustand';

  const ALLOWED_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const SKIP_SECONDS = 10;

  interface PodcastInfo {
    id: string;
    title: string;
    audioShortUrl: string;
    audioLongUrl?: string;
    thumbnailUrl?: string;
  }

  interface PlayerState {
    currentPodcast: PodcastInfo | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    playbackRate: number;
    audioType: 'short' | 'long';
    isMiniPlayerVisible: boolean;
  }

  interface PlayerActions {
    loadPodcast: (podcast: PodcastInfo) => void;
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setDuration: (duration: number) => void;
    setVolume: (volume: number) => void;
    setPlaybackRate: (rate: number) => void;
    toggleAudioType: () => void;
    skipForward: () => void;
    skipBackward: () => void;
    setCurrentTime: (time: number) => void;
    closeMiniPlayer: () => void;
  }

  const initialState: PlayerState = {
    currentPodcast: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    audioType: 'short',
    isMiniPlayerVisible: false,
  };

  export const usePlayerStore = create<PlayerState & PlayerActions>()((set, get) => ({
    ...initialState,

    loadPodcast: (podcast) => set({
      currentPodcast: podcast,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      audioType: 'short',
      isMiniPlayerVisible: true,
    }),

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),

    seek: (time) => {
      const { duration } = get();
      set({ currentTime: Math.max(0, Math.min(time, duration)) });
    },

    setDuration: (duration) => set({ duration }),

    setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

    setPlaybackRate: (rate) => {
      if (ALLOWED_PLAYBACK_RATES.includes(rate)) set({ playbackRate: rate });
    },

    toggleAudioType: () => set((state) => ({
      audioType: state.audioType === 'short' ? 'long' : 'short',
      currentTime: 0,
    })),

    skipForward: () => {
      const { currentTime, duration } = get();
      set({ currentTime: Math.min(currentTime + SKIP_SECONDS, duration) });
    },

    skipBackward: () => {
      const { currentTime } = get();
      set({ currentTime: Math.max(currentTime - SKIP_SECONDS, 0) });
    },

    setCurrentTime: (time) => set({ currentTime: time }),

    closeMiniPlayer: () => set({ isMiniPlayerVisible: false, isPlaying: false, currentPodcast: null }),
  }));

  // For test resetting
  usePlayerStore.getInitialState = () => initialState;
  ```

- [ ] **1.4 — Run tests, confirm green**
  ```bash
  npx vitest run stores/__tests__/player-store.test.ts
  ```

---

## Task 2: Audio Player Component

**Files:**
- `components/audio-player/audio-player.tsx` — full audio player UI
- `components/audio-player/progress-slider.tsx` — seek slider
- `components/audio-player/volume-control.tsx` — volume slider with mute
- `components/audio-player/playback-speed.tsx` — speed selector
- `components/audio-player/__tests__/audio-player.test.tsx` — component tests
- `hooks/use-hls-player.ts` — HLS.js integration hook

### Steps

- [ ] **2.1 — Install HLS.js**
  ```bash
  npm install hls.js
  ```

- [ ] **2.2 — Create `hooks/use-hls-player.ts`**
  ```typescript
  'use client';
  import { useRef, useEffect, useCallback } from 'react';
  import Hls from 'hls.js';
  import { usePlayerStore } from '@/stores/player-store';

  export function useHlsPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const { currentPodcast, audioType, isPlaying, volume, playbackRate } = usePlayerStore();

    // Derive the active audio URL
    const audioUrl = currentPodcast
      ? (audioType === 'long' && currentPodcast.audioLongUrl ? currentPodcast.audioLongUrl : currentPodcast.audioShortUrl)
      : null;

    // Initialize HLS or native playback
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !audioUrl) return;

      if (audioUrl.endsWith('.m3u8') && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(audioUrl);
        hls.attachMedia(audio);
        hlsRef.current = hls;
        return () => { hls.destroy(); hlsRef.current = null; };
      } else {
        // Native playback (Safari HLS support or direct MP3)
        audio.src = audioUrl;
      }
    }, [audioUrl]);

    // Sync play/pause
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) audio.play().catch(() => {});
      else audio.pause();
    }, [isPlaying]);

    // Sync volume
    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

    // Sync playback rate
    useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = playbackRate; }, [playbackRate]);

    // Time update handler
    const onTimeUpdate = useCallback(() => {
      if (audioRef.current) {
        usePlayerStore.getState().setCurrentTime(audioRef.current.currentTime);
      }
    }, []);

    // Duration loaded handler
    const onLoadedMetadata = useCallback(() => {
      if (audioRef.current) {
        usePlayerStore.getState().setDuration(audioRef.current.duration);
      }
    }, []);

    // Seek function (imperative)
    const seekTo = useCallback((time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        usePlayerStore.getState().seek(time);
      }
    }, []);

    return { audioRef, onTimeUpdate, onLoadedMetadata, seekTo };
  }
  ```

- [ ] **2.3 — Write failing component tests**
  Create `components/audio-player/__tests__/audio-player.test.tsx`:
  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { AudioPlayer } from '../audio-player';
  import { usePlayerStore } from '@/stores/player-store';

  // Mock HLS.js
  vi.mock('hls.js', () => ({
    default: { isSupported: () => true },
  }));

  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState());
  });

  describe('AudioPlayer', () => {
    it('renders play button when paused', () => {
      usePlayerStore.setState({ currentPodcast: { id: '1', title: 'Test', audioShortUrl: '/test.mp3' } });
      render(<AudioPlayer />);
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('renders pause button when playing', () => {
      usePlayerStore.setState({ currentPodcast: { id: '1', title: 'Test', audioShortUrl: '/test.mp3' }, isPlaying: true });
      render(<AudioPlayer />);
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('displays current time and duration', () => {
      usePlayerStore.setState({ currentTime: 65, duration: 300 });
      render(<AudioPlayer />);
      expect(screen.getByText('1:05')).toBeInTheDocument();
      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('renders skip forward and backward buttons', () => {
      render(<AudioPlayer />);
      expect(screen.getByRole('button', { name: /skip forward/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip backward/i })).toBeInTheDocument();
    });

    it('renders volume control', () => {
      render(<AudioPlayer />);
      expect(screen.getByRole('slider', { name: /volume/i })).toBeInTheDocument();
    });

    it('renders playback speed selector', () => {
      render(<AudioPlayer />);
      expect(screen.getByRole('button', { name: /1x/i })).toBeInTheDocument();
    });

    it('renders audio type toggle when long version available', () => {
      usePlayerStore.setState({
        currentPodcast: { id: '1', title: 'Test', audioShortUrl: '/short.mp3', audioLongUrl: '/long.mp3' },
      });
      render(<AudioPlayer />);
      expect(screen.getByRole('button', { name: /short|long/i })).toBeInTheDocument();
    });

    it('does not render audio type toggle when no long version', () => {
      usePlayerStore.setState({
        currentPodcast: { id: '1', title: 'Test', audioShortUrl: '/short.mp3' },
      });
      render(<AudioPlayer />);
      expect(screen.queryByRole('button', { name: /toggle.*duration/i })).not.toBeInTheDocument();
    });
  });
  ```

- [ ] **2.4 — Implement `components/audio-player/audio-player.tsx`**
  - `'use client'` directive
  - Uses `useHlsPlayer` hook for audio element management
  - Uses `usePlayerStore` for state
  - Layout: podcast title + thumbnail at top, progress slider in middle, controls at bottom
  - Controls row: skip back, play/pause, skip forward, volume, speed, duration toggle
  - Formats time as `m:ss` or `h:mm:ss`
  - Keyboard: spacebar toggles play/pause, left/right arrow skip

- [ ] **2.5 — Implement sub-components**
  - `progress-slider.tsx`: range input styled as progress bar, shows buffered range, click to seek
  - `volume-control.tsx`: volume icon (changes based on level), range slider, click icon to mute/unmute
  - `playback-speed.tsx`: dropdown with options [0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x], shows current speed

- [ ] **2.6 — Run tests, confirm green**
  ```bash
  npx vitest run components/audio-player/__tests__/audio-player.test.tsx
  ```

---

## Task 3: Mini Player (Persistent)

**Files:**
- `components/audio-player/mini-player.tsx` — fixed bottom bar
- `components/audio-player/__tests__/mini-player.test.tsx` — component tests

### Steps

- [ ] **3.1 — Write failing tests**
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { MiniPlayer } from '../mini-player';
  import { usePlayerStore } from '@/stores/player-store';

  describe('MiniPlayer', () => {
    it('is hidden when no podcast is loaded', () => {
      render(<MiniPlayer />);
      expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument();
    });

    it('shows when a podcast is loaded and isMiniPlayerVisible is true', () => {
      usePlayerStore.setState({
        currentPodcast: { id: '1', title: 'Test Pod', audioShortUrl: '/test.mp3' },
        isMiniPlayerVisible: true,
      });
      render(<MiniPlayer />);
      expect(screen.getByTestId('mini-player')).toBeInTheDocument();
      expect(screen.getByText('Test Pod')).toBeInTheDocument();
    });

    it('shows play/pause button', () => { /* ... */ });
    it('shows thin progress bar', () => { /* ... */ });
    it('closes when X button is clicked', async () => { /* ... */ });
    it('navigates to full player page on click', () => { /* ... */ });
  });
  ```

- [ ] **3.2 — Implement `components/audio-player/mini-player.tsx`**
  ```typescript
  'use client';
  import { usePlayerStore } from '@/stores/player-store';
  import Link from 'next/link';
  import { Play, Pause, X } from 'lucide-react';
  import { Button } from '@/components/ui/button';

  export function MiniPlayer() {
    const { currentPodcast, isPlaying, currentTime, duration, isMiniPlayerVisible, play, pause, closeMiniPlayer } = usePlayerStore();

    if (!currentPodcast || !isMiniPlayerVisible) return null;

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div data-testid="mini-player" className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
        {/* Thin progress bar at top of mini player */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex items-center gap-3 px-4 py-2">
          <Link href={`/podcast/${currentPodcast.id}`} className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentPodcast.title}</p>
          </Link>
          <Button variant="ghost" size="icon" onClick={isPlaying ? pause : play} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={closeMiniPlayer} aria-label="Close player">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
  ```

- [ ] **3.3 — Add MiniPlayer to root layout**
  In `app/layout.tsx`, add `<MiniPlayer />` inside the body, after `{children}`:
  ```typescript
  import { MiniPlayer } from '@/components/audio-player/mini-player';

  // Inside the layout return:
  <body>
    {children}
    <MiniPlayer />
  </body>
  ```

- [ ] **3.4 — Run tests, confirm green**

---

## Task 4: Transcript Viewer

**Files:**
- `components/audio-player/transcript-viewer.tsx` — timestamped transcript display
- `components/audio-player/__tests__/transcript-viewer.test.tsx` — component tests
- `hooks/use-transcript-sync.ts` — hook for syncing transcript with playback

### Steps

- [ ] **4.1 — Write failing tests**
  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { TranscriptViewer } from '../transcript-viewer';
  import { usePlayerStore } from '@/stores/player-store';

  const mockSegments = [
    { start: 0, end: 10, text: 'Welcome to the audit methodology podcast.' },
    { start: 10, end: 25, text: 'Today we discuss the new framework.' },
    { start: 25, end: 40, text: 'Let us begin with the key changes.' },
  ];

  describe('TranscriptViewer', () => {
    it('renders all transcript segments', () => {
      render(<TranscriptViewer segments={mockSegments} />);
      expect(screen.getByText('Welcome to the audit methodology podcast.')).toBeInTheDocument();
      expect(screen.getByText('Today we discuss the new framework.')).toBeInTheDocument();
      expect(screen.getByText('Let us begin with the key changes.')).toBeInTheDocument();
    });

    it('displays timestamps for each segment', () => {
      render(<TranscriptViewer segments={mockSegments} />);
      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByText('0:10')).toBeInTheDocument();
      expect(screen.getByText('0:25')).toBeInTheDocument();
    });

    it('highlights the active segment based on currentTime', () => {
      usePlayerStore.setState({ currentTime: 15 });
      render(<TranscriptViewer segments={mockSegments} />);
      const activeSegment = screen.getByText('Today we discuss the new framework.').closest('[data-segment]');
      expect(activeSegment).toHaveAttribute('data-active', 'true');
    });

    it('calls seek when a segment is clicked', async () => {
      const onSeek = vi.fn();
      render(<TranscriptViewer segments={mockSegments} onSeek={onSeek} />);
      await userEvent.click(screen.getByText('Today we discuss the new framework.'));
      expect(onSeek).toHaveBeenCalledWith(10);
    });

    it('shows empty state when no segments', () => {
      render(<TranscriptViewer segments={[]} />);
      expect(screen.getByText(/no transcript available/i)).toBeInTheDocument();
    });
  });
  ```

- [ ] **4.2 — Create `hooks/use-transcript-sync.ts`**
  ```typescript
  'use client';
  import { useMemo, useRef, useEffect } from 'react';
  import { usePlayerStore } from '@/stores/player-store';

  interface Segment {
    start: number;
    end: number;
    text: string;
  }

  export function useTranscriptSync(segments: Segment[]) {
    const currentTime = usePlayerStore((s) => s.currentTime);
    const containerRef = useRef<HTMLDivElement>(null);

    // Find the active segment index
    const activeIndex = useMemo(() => {
      return segments.findIndex((seg) => currentTime >= seg.start && currentTime < seg.end);
    }, [segments, currentTime]);

    // Auto-scroll to active segment
    useEffect(() => {
      if (activeIndex < 0 || !containerRef.current) return;
      const activeElement = containerRef.current.querySelector(`[data-segment-index="${activeIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [activeIndex]);

    return { activeIndex, containerRef };
  }
  ```

- [ ] **4.3 — Implement `components/audio-player/transcript-viewer.tsx`**
  ```typescript
  'use client';
  import { useTranscriptSync } from '@/hooks/use-transcript-sync';
  import { ScrollArea } from '@/components/ui/scroll-area';
  import { cn } from '@/lib/utils';

  interface Segment {
    start: number;
    end: number;
    text: string;
  }

  interface TranscriptViewerProps {
    segments: Segment[];
    onSeek?: (time: number) => void;
  }

  function formatTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  export function TranscriptViewer({ segments, onSeek }: TranscriptViewerProps) {
    const { activeIndex, containerRef } = useTranscriptSync(segments);

    if (segments.length === 0) {
      return <p className="text-muted-foreground text-center py-8">No transcript available.</p>;
    }

    return (
      <ScrollArea className="h-[500px]" ref={containerRef}>
        <div className="space-y-1 p-4">
          {segments.map((segment, index) => (
            <div
              key={index}
              data-segment
              data-segment-index={index}
              data-active={index === activeIndex ? 'true' : 'false'}
              className={cn(
                'flex gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted',
                index === activeIndex && 'bg-primary/10 border-l-2 border-primary'
              )}
              onClick={() => onSeek?.(segment.start)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onSeek?.(segment.start); }}
            >
              <span className="text-xs text-muted-foreground font-mono w-10 flex-shrink-0 pt-0.5">
                {formatTimestamp(segment.start)}
              </span>
              <p className="text-sm leading-relaxed">{segment.text}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }
  ```

- [ ] **4.4 — Run tests, confirm green**

---

## Task 5: PDF Bulletin Viewer

**Files:**
- `components/audio-player/bulletin-viewer.tsx` — PDF viewer using react-pdf
- `components/audio-player/__tests__/bulletin-viewer.test.tsx` — component tests

### Steps

- [ ] **5.1 — Install react-pdf**
  ```bash
  npm install react-pdf
  ```
  Configure the PDF.js worker in `app/layout.tsx` or a provider:
  ```typescript
  import { pdfjs } from 'react-pdf';
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  ```

- [ ] **5.2 — Write failing tests**
  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { BulletinViewer } from '../bulletin-viewer';

  // Mock react-pdf
  vi.mock('react-pdf', () => ({
    Document: ({ children, onLoadSuccess }: any) => {
      onLoadSuccess?.({ numPages: 3 });
      return <div data-testid="pdf-document">{children}</div>;
    },
    Page: ({ pageNumber }: any) => <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>,
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' }, version: '4.0.0' },
  }));

  describe('BulletinViewer', () => {
    it('renders the PDF document', () => {
      render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });

    it('shows page navigation controls', () => {
      render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    });

    it('navigates to next page', async () => {
      render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
      await userEvent.click(screen.getByRole('button', { name: /next page/i }));
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
      expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    });

    it('renders download button', () => {
      render(<BulletinViewer urls={['/bulletins/test.pdf']} />);
      expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
    });

    it('shows bulletin selector when multiple PDFs', () => {
      render(<BulletinViewer urls={['/bulletins/a.pdf', '/bulletins/b.pdf']} />);
      expect(screen.getByRole('combobox', { name: /select bulletin/i })).toBeInTheDocument();
    });

    it('shows empty state when no bulletin URLs', () => {
      render(<BulletinViewer urls={[]} />);
      expect(screen.getByText(/no bulletins available/i)).toBeInTheDocument();
    });
  });
  ```

- [ ] **5.3 — Implement `components/audio-player/bulletin-viewer.tsx`**
  ```typescript
  'use client';
  import { useState, useCallback } from 'react';
  import { Document, Page } from 'react-pdf';
  import { Button } from '@/components/ui/button';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

  interface BulletinViewerProps {
    urls: string[];
  }

  export function BulletinViewer({ urls }: BulletinViewerProps) {
    const [activeUrl, setActiveUrl] = useState(urls[0] || '');
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setCurrentPage(1);
    }, []);

    if (urls.length === 0) {
      return <p className="text-muted-foreground text-center py-8">No bulletins available.</p>;
    }

    return (
      <div className="space-y-4">
        {urls.length > 1 && (
          <Select value={activeUrl} onValueChange={(v) => { setActiveUrl(v); setCurrentPage(1); }}>
            <SelectTrigger aria-label="Select bulletin"><SelectValue /></SelectTrigger>
            <SelectContent>
              {urls.map((url, i) => <SelectItem key={url} value={url}>Bulletin {i + 1}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Document file={activeUrl} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={currentPage} width={600} />
        </Document>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm">Page {currentPage} of {numPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)} aria-label="Next page">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <a href={activeUrl} download className="inline-flex items-center gap-1 text-sm text-primary hover:underline" aria-label="Download">
          <Download className="h-4 w-4" /> Download PDF
        </a>
      </div>
    );
  }
  ```

- [ ] **5.4 — Run tests, confirm green**

---

## Task 6: Podcast Detail Page

**Files:**
- `app/(public)/podcast/[id]/page.tsx` — podcast detail page
- `app/(public)/podcast/[id]/loading.tsx` — loading skeleton
- `components/audio-player/podcast-detail-layout.tsx` — layout for player + tabs

### Steps

- [ ] **6.1 — Create `app/(public)/podcast/[id]/page.tsx`**
  ```typescript
  import { notFound } from 'next/navigation';
  import { prisma } from '@/lib/prisma';
  import { PodcastDetailLayout } from '@/components/audio-player/podcast-detail-layout';

  interface Props {
    params: Promise<{ id: string }>;
  }

  export default async function PodcastPage({ params }: Props) {
    const { id } = await params;
    const podcast = await prisma.podcast.findFirst({
      where: { id, is_archived: false },
      include: { transcripts: true },
    });

    if (!podcast) notFound();

    // Fetch related podcasts (same domain, exclude current)
    const relatedPodcasts = await prisma.podcast.findMany({
      where: { domain: podcast.domain, is_archived: false, id: { not: podcast.id } },
      take: 4,
      orderBy: { created_at: 'desc' },
    });

    return <PodcastDetailLayout podcast={podcast} relatedPodcasts={relatedPodcasts} />;
  }
  ```

- [ ] **6.2 — Create `components/audio-player/podcast-detail-layout.tsx`**
  - `'use client'` component
  - Layout structure:
    - Top: podcast title, domain badge, year, tags, description
    - Middle: `<AudioPlayer />` (full-size player)
    - Below player: Tabs — "Transcript", "Bulletins"
      - Transcript tab: `<TranscriptViewer segments={segments} onSeek={seekTo} />`
      - Bulletins tab: `<BulletinViewer urls={podcast.bulletin_urls} />`
    - Bottom: "Related Podcasts" section with PodcastCard grid
  - On mount: calls `usePlayerStore.getState().loadPodcast(...)` to set up the player

- [ ] **6.3 — Create loading skeleton**
  `app/(public)/podcast/[id]/loading.tsx`:
  ```typescript
  import { Skeleton } from '@/components/ui/skeleton';

  export default function Loading() {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  ```

- [ ] **6.4 — Verify page renders and player works end-to-end**

---

## Task 7: Component Tests

**Files:**
- `components/audio-player/__tests__/audio-player.test.tsx` — (from Task 2)
- `components/audio-player/__tests__/mini-player.test.tsx` — (from Task 3)
- `components/audio-player/__tests__/transcript-viewer.test.tsx` — (from Task 4)
- `components/audio-player/__tests__/bulletin-viewer.test.tsx` — (from Task 5)
- `hooks/__tests__/use-hls-player.test.ts` — hook tests
- `hooks/__tests__/use-transcript-sync.test.ts` — hook tests

### Steps

- [ ] **7.1 — Write hook tests for `use-hls-player`**
  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { renderHook } from '@testing-library/react';
  import { useHlsPlayer } from '../use-hls-player';

  vi.mock('hls.js', () => ({
    default: class MockHls {
      static isSupported() { return true; }
      loadSource = vi.fn();
      attachMedia = vi.fn();
      destroy = vi.fn();
    },
  }));

  describe('useHlsPlayer', () => {
    it('returns an audioRef', () => {
      const { result } = renderHook(() => useHlsPlayer());
      expect(result.current.audioRef).toBeDefined();
    });

    it('provides onTimeUpdate callback', () => {
      const { result } = renderHook(() => useHlsPlayer());
      expect(typeof result.current.onTimeUpdate).toBe('function');
    });

    it('provides seekTo function', () => {
      const { result } = renderHook(() => useHlsPlayer());
      expect(typeof result.current.seekTo).toBe('function');
    });
  });
  ```

- [ ] **7.2 — Write hook tests for `use-transcript-sync`**
  ```typescript
  describe('useTranscriptSync', () => {
    it('returns activeIndex of -1 when no segments match', () => { /* ... */ });
    it('returns correct activeIndex based on currentTime', () => { /* ... */ });
    it('provides a containerRef', () => { /* ... */ });
  });
  ```

- [ ] **7.3 — Run all component and hook tests**
  ```bash
  npx vitest run components/audio-player/__tests__/ hooks/__tests__/ stores/__tests__/
  ```

- [ ] **7.4 — Verify all tests pass**

---

## Task 8: E2E Test

**Files:**
- `e2e/audio-player.spec.ts` — Playwright end-to-end test

### Steps

- [ ] **8.1 — Install Playwright (if not already from Stage 1)**
  ```bash
  npx playwright install
  ```

- [ ] **8.2 — Create `e2e/audio-player.spec.ts`**
  ```typescript
  import { test, expect } from '@playwright/test';

  test.describe('Audio Player E2E', () => {
    test.beforeEach(async ({ page }) => {
      // Seed a test podcast via API or database
    });

    test('browse library, open podcast, play audio, verify transcript sync', async ({ page }) => {
      // 1. Navigate to library
      await page.goto('/bulletins');
      await expect(page.locator('h1')).toContainText('Technical Content');

      // 2. Click on a podcast card
      await page.locator('[data-testid="podcast-card"]').first().click();
      await expect(page).toHaveURL(/\/podcast\/.+/);

      // 3. Verify podcast detail page loaded
      await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();

      // 4. Click play
      await page.click('button[aria-label="Play"]');
      await expect(page.locator('button[aria-label="Pause"]')).toBeVisible();

      // 5. Wait a moment and verify transcript highlights
      await page.waitForTimeout(2000);
      const activeSegment = page.locator('[data-active="true"]');
      await expect(activeSegment).toBeVisible();

      // 6. Click a transcript segment to seek
      const secondSegment = page.locator('[data-segment]').nth(1);
      await secondSegment.click();

      // 7. Verify mini player appears when navigating away
      await page.goto('/bulletins');
      await expect(page.locator('[data-testid="mini-player"]')).toBeVisible();
    });

    test('toggle audio type between short and long', async ({ page }) => {
      await page.goto('/podcast/test-id');
      // Click duration toggle
      await page.click('button[aria-label*="toggle"]');
      // Verify audio source changed
    });

    test('PDF bulletin viewer navigation', async ({ page }) => {
      await page.goto('/podcast/test-id');
      // Switch to Bulletins tab
      await page.click('text=Bulletins');
      await expect(page.locator('[data-testid="pdf-document"]')).toBeVisible();
      // Navigate pages
      await page.click('button[aria-label="Next page"]');
      await expect(page.locator('text=Page 2')).toBeVisible();
    });
  });
  ```

- [ ] **8.3 — Run E2E tests**
  ```bash
  npx playwright test e2e/audio-player.spec.ts
  ```

---

## Task 9: Commit and Verify

### Steps

- [ ] **9.1 — Run lint and type check**
  ```bash
  npm run lint
  npx tsc --noEmit
  ```

- [ ] **9.2 — Run full test suite**
  ```bash
  npx vitest run
  ```

- [ ] **9.3 — Run build**
  ```bash
  npm run build
  ```

- [ ] **9.4 — Commit**
  ```bash
  git add -A
  git commit -m "feat: add audio player, transcript viewer, bulletin viewer, and mini player (Stage 3)"
  ```

---

## Verification Checklist

After completing all tasks, confirm:

- [ ] Zustand player store handles all state transitions correctly
- [ ] HLS.js plays audio with adaptive streaming
- [ ] Audio player has play/pause, seek, skip, volume, speed, and duration toggle
- [ ] Mini player persists across page navigation
- [ ] Transcript viewer highlights the active segment and auto-scrolls
- [ ] Clicking a transcript segment seeks the audio
- [ ] PDF bulletin viewer renders pages with navigation
- [ ] Podcast detail page loads data server-side and renders the full experience
- [ ] All unit and component tests pass
- [ ] E2E test covers the full browse-to-play flow
- [ ] No TypeScript errors, no lint warnings
- [ ] Build succeeds without errors
