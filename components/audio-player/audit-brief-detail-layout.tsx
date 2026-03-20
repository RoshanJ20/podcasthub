/**
 * Client-side layout for the audit brief detail page.
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
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { resolveStorageUrl } from '@/lib/storage-url';
import { usePlayerStore } from '@/stores/player-store';
import { useHlsPlayer } from '@/hooks/use-hls-player';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { variants, transitions, sectionStagger } from '@/lib/animation';
import { getDomainColor } from '@/lib/domain-colors';
import { extractAttachmentName } from '@/lib/attachment-utils';
import { useListenTracker } from '@/hooks/use-listen-tracker';
import dynamic from 'next/dynamic';
import { BookmarkPanel } from './bookmark-panel';
import { SidebarBookmarks } from './sidebar-bookmarks';
import { AttachmentSidebar } from './attachment-sidebar';
import { BulletinViewerSkeleton } from './bulletin-viewer-skeleton';
import { AuditBriefDetailHeader } from './audit-brief-detail-header';
import { AuditBriefMainContent } from './audit-brief-main-content';
import { useFavorites } from '@/hooks/use-favorites';

/** Dynamically import BulletinViewer to avoid SSR issues with react-pdf (DOMMatrix). */
const BulletinViewer = dynamic(() => import('./bulletin-viewer').then((m) => m.BulletinViewer), {
  ssr: false,
  loading: () => <BulletinViewerSkeleton />,
});
import type { TranscriptSegment } from '@/hooks/use-transcript-sync';

interface Transcript {
  id: string;
  fullText: string;
  segments: TranscriptSegment[] | unknown;
  transcriptType: string;
}

interface AuditBriefRecord {
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

interface AuditBriefDetailLayoutProps {
  auditBrief: AuditBriefRecord;
  relatedAuditBriefs?: AuditBriefRecord[];
}

/**
 * Renders the audit brief detail page with a two-column layout.
 *
 * Default state: main content left + 140px attachment sidebar right.
 * Expanded state: 30/70 split with compact player on left, PDF viewer on right.
 *
 * @param props.auditBrief - The audit brief record to display.
 * @param props.relatedAuditBriefs - Optional list of related audit briefs (reserved for future use).
 */
export function AuditBriefDetailLayout({ auditBrief }: AuditBriefDetailLayoutProps) {
  const { seekTo } = useHlsPlayer();
  const reducedMotion = useReducedMotion();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const domainColor = getDomainColor(auditBrief.domain);
  const badgeBg = isDark ? domainColor.darkBg : domainColor.bg;
  const badgeText = isDark ? domainColor.darkText : domainColor.text;

  const hasAttachments = auditBrief.bulletinUrls.length > 0;

  /** Track listen events for analytics. */
  useListenTracker(auditBrief.id);

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
    auditBrief.bulletinUrls.forEach((url) => {
      const resolved = resolveStorageUrl(url);
      fetch(resolved, { priority: 'low' } as RequestInit).catch(() => {
        /* Non-critical — PDF will load on demand if prefetch fails */
      });
    });
  }, [hasAttachments, auditBrief.bulletinUrls]);

  /** Load the audit brief into the player store on mount. */
  useEffect(() => {
    usePlayerStore.getState().loadAuditBrief({
      id: auditBrief.id,
      title: auditBrief.title,
      audioShortUrl: auditBrief.audioShortUrl,
      audioLongUrl: auditBrief.audioLongUrl,
      thumbnailUrl: auditBrief.thumbnailUrl,
    });
  }, [
    auditBrief.id,
    auditBrief.title,
    auditBrief.audioShortUrl,
    auditBrief.audioLongUrl,
    auditBrief.thumbnailUrl,
  ]);

  /** Extract transcript segments for the active audio type. */
  const audioType = usePlayerStore((s) => s.audioType);
  const activeTranscript =
    auditBrief.transcripts.find((t) => t.transcriptType === audioType) ?? auditBrief.transcripts[0];

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
  const Section: React.ElementType = reducedMotion ? 'div' : motion.div;

  const wrapperProps = reducedMotion
    ? {}
    : { variants: sectionStagger, initial: 'hidden' as const, animate: 'visible' as const };
  const sectionProps = reducedMotion
    ? {}
    : { variants: variants.slideInFromLeft, transition: transitions.normal };

  /** Mercury fade — blur-to-clear entrance, same as page load. */
  const mercuryIn = {
    initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0 },
    transition: transitions.slow,
  };

  /** Shared props for AuditBriefMainContent in both full and compact modes. */
  const mainContentProps = {
    auditBriefId: auditBrief.id,
    thumbnailUrl: auditBrief.thumbnailUrl,
    title: auditBrief.title,
    description: auditBrief.description,
    segments,
    fullText: activeTranscript?.fullText,
    domainColor,
    onSeek: seekTo,
    mercuryIn,
  };

  /** Build attachment options for the toolbar dropdown. */
  const attachmentOptions = useMemo(
    () =>
      auditBrief.bulletinUrls.map((url, index) => ({
        url,
        name: extractAttachmentName(url, index),
      })),
    [auditBrief.bulletinUrls]
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

  /** Shared props for the AuditBriefDetailHeader component. */
  const headerProps = {
    domain: auditBrief.domain,
    year: auditBrief.year,
    tags: auditBrief.tags,
    badgeBg,
    badgeText,
    isFavorite: isFavorite(auditBrief.id),
    onToggleFavorite: () => toggleFavorite(auditBrief.id),
    sectionProps,
    Section,
  };

  /** No attachments — render full-width layout without sidebar. */
  if (!hasAttachments) {
    return (
      <Wrapper className="mx-auto max-w-5xl px-4 py-8 lg:py-12" {...wrapperProps}>
        <AuditBriefDetailHeader {...headerProps} />
        <AuditBriefMainContent compact={false} {...mainContentProps} />
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <BookmarkPanel auditBriefId={auditBrief.id} onSeek={seekTo} domainColor={domainColor} />
        </div>
      </Wrapper>
    );
  }

  /** Two-column layout: main content + attachment sidebar/PDF panel. */
  return (
    <Wrapper className="mx-auto px-4 py-8 lg:py-12" {...wrapperProps}>
      {/* Back link + badges — above the flex row so sidebar aligns with hero card */}
      {!isAttachmentOpen && <AuditBriefDetailHeader {...headerProps} />}

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
          {contentHidden ? null : isAttachmentOpen ? (
            isTransitionDone ? (
              <AuditBriefMainContent compact={true} {...mainContentProps} />
            ) : null
          ) : (
            <AuditBriefMainContent compact={false} {...mainContentProps} />
          )}
        </div>

        {/* Right area — PDF panel when open, compact sidebar when closed */}
        {isAttachmentOpen ? (
          <div className="h-[calc(100vh-120px)] sticky top-4 flex-1 overflow-hidden rounded-xl border border-border bg-card transition-[flex] duration-300 ease-out">
            {pdfPanel}
          </div>
        ) : (
          <div className="sticky top-8 w-[180px] shrink-0 self-stretch rounded-xl border border-border bg-card">
            <AttachmentSidebar
              bulletinUrls={auditBrief.bulletinUrls}
              activeAttachmentUrl={activeAttachmentUrl}
              domainColor={domainColor}
              onOpen={openAttachment}
            />
            <div className="border-t border-border">
              <SidebarBookmarks
                auditBriefId={auditBrief.id}
                onSeek={seekTo}
                domainColor={domainColor}
              />
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
