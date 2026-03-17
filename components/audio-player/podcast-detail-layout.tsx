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
import { AudioPlayer } from './audio-player';
import { CompactPlayer } from './compact-player';
import dynamic from 'next/dynamic';
import { TranscriptViewer } from './transcript-viewer';
import { BookmarkPanel } from './bookmark-panel';

/** Dynamically import BulletinViewer to avoid SSR issues with react-pdf (DOMMatrix). */
const BulletinViewer = dynamic(() => import('./bulletin-viewer').then((m) => m.BulletinViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-[400px] w-full max-w-md animate-pulse rounded bg-muted" />
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

  /** Slide-in panel state. */
  const [activeAttachmentUrl, setActiveAttachmentUrl] = useState<string | null>(null);
  const isAttachmentOpen = activeAttachmentUrl !== null;

  /** Open an attachment in the PDF panel. */
  const openAttachment = (url: string) => {
    setActiveAttachmentUrl(url);
  };

  /** Close the PDF panel. */
  const closeAttachment = () => {
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
      {/* Persistent audio element — survives hero/compact player swaps */}
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => usePlayerStore.getState().pause()}
        preload="metadata"
        className="hidden"
      />

      {/* Hero card OR compact player */}
      <AnimatePresence mode="wait" initial={false}>
        {isAttachmentOpen ? (
          <motion.div
            key="compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.fast}
          >
            <CompactPlayer domainColor={domainColor} onSeek={seekTo} />
          </motion.div>
        ) : (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.fast}
            className="flex overflow-hidden rounded-xl border border-border bg-card"
          >
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
                <AudioPlayer domainColor={domainColor} onSeek={seekTo} />
              </div>
            </div>
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
        {headerContent}
        {leftContent}
      </Wrapper>
    );
  }

  /** Two-column layout: main content + attachment sidebar/PDF panel. */
  return (
    <Wrapper className="mx-auto px-4 py-8 lg:py-12" {...wrapperProps}>
      {/* Back link + badges — above the flex row so sidebar aligns with hero card */}
      {!isAttachmentOpen && headerContent}

      <div className="flex items-stretch gap-4">
        {/* Left column — expands/compresses with CSS transition */}
        <div
          className="min-w-0 pr-4 transition-[flex] duration-300 ease-out"
          style={{ flex: isAttachmentOpen ? '0 0 340px' : '1 1 0%' }}
        >
          {leftContent}
        </div>

        {/* Right area — PDF panel when open, compact sidebar when closed */}
        {isAttachmentOpen ? (
          <div className="h-[calc(100vh-120px)] sticky top-4 flex-1 overflow-hidden rounded-xl border border-border bg-card transition-[flex] duration-300 ease-out">
            {pdfPanel}
          </div>
        ) : (
          <div className="w-[180px] shrink-0 rounded-xl border border-border bg-card">
            {sidebarContent}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
