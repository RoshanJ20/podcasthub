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

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { resolveStorageUrl } from '@/lib/storage-url';
import { usePlayerStore } from '@/stores/player-store';
import { useHlsPlayer } from '@/hooks/use-hls-player';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { variants, transitions, sectionStagger } from '@/lib/animation';
import { getDomainColor } from '@/lib/domain-colors';
import { extractAttachmentName } from '@/lib/attachment-utils';
import { formatTime } from '@/lib/format-time';
import { AudioPlayer } from './audio-player';
import { CompactPlayer } from './compact-player';
import dynamic from 'next/dynamic';
import { TranscriptViewer } from './transcript-viewer';
import { BookmarkPanel } from './bookmark-panel';

/** Dynamically import BulletinViewer to avoid SSR issues with react-pdf (DOMMatrix). */
const BulletinViewer = dynamic(() => import('./bulletin-viewer').then((m) => m.BulletinViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2.5">
        <div className="h-5 w-36 animate-pulse rounded-md bg-muted-foreground/15" />
        <div className="flex gap-2">
          <div className="h-7 w-7 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="h-7 w-7 animate-pulse rounded-md bg-muted-foreground/10" />
        </div>
      </div>
      {/* Document skeleton */}
      <div className="mx-auto max-w-lg flex-1 animate-pulse space-y-5 p-10">
        <div className="space-y-3">
          <div className="h-7 w-3/4 rounded-md bg-muted-foreground/15" />
          <div className="h-5 w-1/2 rounded-md bg-muted-foreground/10" />
        </div>
        <div className="space-y-2.5">
          <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-5/6 rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-4/6 rounded bg-muted-foreground/10" />
        </div>
        <div className="h-44 w-full rounded-xl bg-muted-foreground/8" />
        <div className="space-y-2.5">
          <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-3/4 rounded bg-muted-foreground/10" />
        </div>
      </div>
    </div>
  ),
});
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

interface SidebarBookmark {
  id: string;
  timestampSeconds: number;
  note: string | null;
}

/** Slim bookmark list for the 180px sidebar with inline add. */
function SidebarBookmarks({
  podcastId,
  onSeek,
  domainColor,
}: {
  podcastId: string;
  onSeek: (time: number) => void;
  domainColor: ReturnType<typeof getDomainColor>;
}) {
  const [bookmarks, setBookmarks] = useState<SidebarBookmark[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const currentTime = usePlayerStore((s) => s.currentTime);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchBookmarks = useCallback(() => {
    fetch(`/api/bookmarks?podcastId=${podcastId}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => {
        const items = (d.data ?? []) as SidebarBookmark[];
        items.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
        setBookmarks(items);
      })
      .catch(() => {});
  }, [podcastId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  useEffect(() => {
    if (isAdding && inputRef.current) inputRef.current.focus();
  }, [isAdding]);

  /** Add bookmark at current time with optional note. */
  const handleAdd = async () => {
    const ts = Math.floor(currentTime);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId,
          timestampSeconds: ts,
          note: newNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        setIsAdding(false);
        setNewNote('');
        fetchBookmarks();
      }
    } catch {
      /* non-critical */
    }
  };

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bookmarks
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          aria-label="Add bookmark"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Inline add form */}
      {isAdding && (
        <div className="mb-2 space-y-1.5">
          <div
            className="rounded bg-muted/60 px-1.5 py-1 text-xs font-mono tabular-nums"
            style={{ color: domainColor.border }}
          >
            {formatTime(Math.floor(currentTime))}
          </div>
          <input
            ref={inputRef}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewNote('');
              }
            }}
            placeholder="Note (optional)..."
            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              className="flex-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewNote('');
              }}
              className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {bookmarks.length === 0 && !isAdding ? (
        <p className="text-xs text-muted-foreground">No bookmarks yet</p>
      ) : (
        <div className="space-y-0.5">
          {bookmarks.map((bm) => (
            <button
              key={bm.id}
              onClick={() => onSeek(bm.timestampSeconds)}
              className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted"
            >
              <span
                className="shrink-0 font-mono tabular-nums"
                style={{ color: domainColor.border }}
              >
                {formatTime(bm.timestampSeconds)}
              </span>
              {bm.note && <span className="truncate text-muted-foreground">{bm.note}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Renders the podcast detail page with a two-column layout.
 *
 * Default state: main content left + 140px attachment sidebar right.
 * Expanded state: 30/70 split with compact player on left, PDF viewer on right.
 *
 * @param props.podcast - The podcast record to display.
 * @param props.relatedPodcasts - Optional list of related podcasts (reserved for future use).
 */
export function PodcastDetailLayout({ podcast }: PodcastDetailLayoutProps) {
  const { audioRef, onTimeUpdate, onLoadedMetadata, seekTo } = useHlsPlayer();
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const domainColor = getDomainColor(podcast.domain);
  const badgeBg = isDark ? domainColor.darkBg : domainColor.bg;
  const badgeText = isDark ? domainColor.darkText : domainColor.text;

  const hasAttachments = podcast.bulletinUrls.length > 0;

  /** Slide-in panel state.
   * contentHidden: left content fades out before panel starts moving.
   * isTransitionDone: panel has finished extending, compact content can load.
   */
  const [activeAttachmentUrl, setActiveAttachmentUrl] = useState<string | null>(null);
  const [contentHidden, setContentHidden] = useState(false);
  const [isTransitionDone, setIsTransitionDone] = useState(false);
  const isAttachmentOpen = activeAttachmentUrl !== null;

  /** Open an attachment: hide content first, then after a tick start the panel extension. */
  const openAttachment = (url: string) => {
    setContentHidden(true);
    setIsTransitionDone(false);
    // Small delay so the content disappears before panel starts moving
    setTimeout(() => setActiveAttachmentUrl(url), 50);
    // Fallback: if onTransitionEnd doesn't fire (e.g. jsdom), complete after 400ms
    setTimeout(() => {
      setIsTransitionDone(true);
      setContentHidden(false);
    }, 400);
  };

  /** Close the PDF panel: collapse panel first, content loads after. */
  const closeAttachment = () => {
    setContentHidden(true);
    setIsTransitionDone(false);
    setActiveAttachmentUrl(null);
    // Full content loads immediately on close (no need to wait)
    setTimeout(() => {
      setContentHidden(false);
      setIsTransitionDone(true);
    }, 350);
  };

  /** Prefetch PDF attachments into browser cache so they open instantly. */
  useEffect(() => {
    if (!hasAttachments) return;
    podcast.bulletinUrls.forEach((url) => {
      const resolved = resolveStorageUrl(url);
      fetch(resolved, { priority: 'low' } as RequestInit).catch(() => {
        /* Non-critical — PDF will load on demand if prefetch fails */
      });
    });
  }, [hasAttachments, podcast.bulletinUrls]);

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

  /** Persistent audio element — must live outside AnimatePresence. */
  const audioElement = (
    <audio
      ref={audioRef}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
      onEnded={() => usePlayerStore.getState().pause()}
      preload="metadata"
      className="hidden"
    />
  );

  /** Mercury fade — blur-to-clear entrance, same as page load. */
  const mercuryIn = {
    initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0 },
    transition: transitions.slow,
  };

  /** Full left column content (default state — no PDF open). */
  const fullContent = (
    <motion.div key="full" {...mercuryIn}>
      <div className="flex overflow-hidden rounded-xl border border-border bg-card">
        <div className="w-1.5 shrink-0" style={{ backgroundColor: domainColor.border }} />
        <div className="flex flex-1 flex-col gap-6 p-5 lg:flex-row lg:items-center lg:p-6">
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
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {podcast.description}
              </p>
            </div>
          </div>
          <div className="w-full lg:w-100 lg:shrink-0">
            <AudioPlayer domainColor={domainColor} onSeek={seekTo} />
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <TranscriptViewer
          segments={segments}
          fullText={activeTranscript?.fullText}
          onSeek={seekTo}
          domainColor={domainColor}
        />
      </div>
    </motion.div>
  );

  /** Compact left column content (PDF panel open). */
  const compactContent = (
    <motion.div key="compact" {...mercuryIn}>
      <CompactPlayer domainColor={domainColor} onSeek={seekTo} />

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <TranscriptViewer
          segments={segments}
          fullText={activeTranscript?.fullText}
          onSeek={seekTo}
          domainColor={domainColor}
          compact
        />
      </div>

      <div className="mt-3">
        <BookmarkPanel podcastId={podcast.id} onSeek={seekTo} domainColor={domainColor} compact />
      </div>
    </motion.div>
  );

  /** Attachment sidebar file list. */
  const sidebarContent = (
    <div data-testid="attachment-sidebar" className="space-y-1.5 p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
              isActive ? 'font-medium' : 'hover:bg-muted'
            }`}
            style={
              isActive
                ? {
                    backgroundColor: isDark ? domainColor.darkBg : domainColor.bg,
                    color: isDark ? domainColor.darkText : domainColor.text,
                    borderLeft: `3px solid ${domainColor.border}`,
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

  /** Build attachment options for the toolbar dropdown. */
  const attachmentOptions = useMemo(
    () =>
      podcast.bulletinUrls.map((url, index) => ({
        url,
        name: extractAttachmentName(url, index),
      })),
    [podcast.bulletinUrls]
  );

  /** PDF viewer panel (right side when open). */
  const pdfPanel = activeAttachmentUrl ? (
    <BulletinViewer
      url={activeAttachmentUrl}
      filename={activeFilename}
      onClose={closeAttachment}
      attachments={attachmentOptions}
      onSelectAttachment={openAttachment}
    />
  ) : null;

  /** Back link + badges — reusable block. */
  const headerContent = (
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
  );

  /** No attachments — render full-width layout without sidebar. */
  if (!hasAttachments) {
    return (
      <Wrapper className="mx-auto max-w-5xl px-4 py-8 lg:py-12" {...wrapperProps}>
        {audioElement}
        {headerContent}
        {fullContent}
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <BookmarkPanel podcastId={podcast.id} onSeek={seekTo} domainColor={domainColor} />
        </div>
      </Wrapper>
    );
  }

  /** Two-column layout: main content + attachment sidebar/PDF panel. */
  return (
    <Wrapper className="mx-auto px-4 py-8 lg:py-12" {...wrapperProps}>
      {/* Back link + badges — above the flex row so sidebar aligns with hero card */}
      {!isAttachmentOpen && headerContent}

      {audioElement}

      <div className="flex items-start gap-4">
        {/* Left column — waits for panel transition, then swaps content */}
        <div
          className="min-w-0 pr-4 transition-[flex] duration-300 ease-out"
          style={{ flex: isAttachmentOpen ? '0 0 340px' : '1 1 0%' }}
          onTransitionEnd={() => {
            setIsTransitionDone(true);
            setContentHidden(false);
          }}
        >
          {contentHidden
            ? null
            : isAttachmentOpen
              ? isTransitionDone
                ? compactContent
                : null
              : fullContent}
        </div>

        {/* Right area — PDF panel when open, compact sidebar when closed */}
        {isAttachmentOpen ? (
          <div className="h-[calc(100vh-120px)] sticky top-4 flex-1 overflow-hidden rounded-xl border border-border bg-card transition-[flex] duration-300 ease-out">
            {pdfPanel}
          </div>
        ) : (
          <div className="sticky top-8 w-[180px] shrink-0 self-stretch rounded-xl border border-border bg-card">
            {sidebarContent}
            <div className="border-t border-border">
              <SidebarBookmarks podcastId={podcast.id} onSeek={seekTo} domainColor={domainColor} />
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
