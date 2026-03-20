/**
 * AuditBriefMainContent — the primary left-column content area for the audit brief detail page.
 *
 * Key responsibilities:
 * - Full mode: renders the hero card (thumbnail, title, description, audio player)
 *   and the full-height TranscriptViewer below it.
 * - Compact mode: renders CompactPlayer at the top, a compact TranscriptViewer,
 *   and an inline BookmarkPanel — used when a PDF attachment panel is open on the right.
 *
 * The `compact` prop switches between these two layouts without re-mounting child
 * components, preserving player and transcript scroll state across transitions.
 *
 * Dependencies:
 * - motion/react for the blur-to-clear entrance animation.
 * - next/image for optimised thumbnail rendering.
 * - lib/storage-url for resolving MinIO/Azure Blob asset URLs.
 * - lib/domain-colors for per-domain color token shape (via ReturnType).
 * - components/audio-player/audio-player for the full-size audio controls.
 * - components/audio-player/compact-player for the collapsed audio controls.
 * - components/audio-player/transcript-viewer for the interactive transcript.
 * - components/audio-player/bookmark-panel for the inline bookmark list.
 * - hooks/use-transcript-sync for the TranscriptSegment type.
 */

import Image from 'next/image';
import { motion } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';
import { resolveStorageUrl } from '@/lib/storage-url';
import type { getDomainColor } from '@/lib/domain-colors';
import { AudioPlayer } from './audio-player';
import { CompactPlayer } from './compact-player';
import { TranscriptViewer } from './transcript-viewer';
import { BookmarkPanel } from './bookmark-panel';
import type { TranscriptSegment } from '@/hooks/use-transcript-sync';

/** Props consumed by AuditBriefMainContent. */
export interface AuditBriefMainContentProps {
  /** Whether to render the compact (PDF-open) layout instead of the full layout. */
  compact: boolean;
  /** ID of the auditBrief, used to scope bookmarks. */
  auditBriefId: string;
  /** Resolved thumbnail URL for the hero image in full mode. */
  thumbnailUrl: string;
  /** Audit brief title rendered as the page heading in full mode. */
  title: string;
  /** Audit brief description shown beneath the title in full mode. */
  description: string;
  /** Pre-parsed transcript segments passed to TranscriptViewer. */
  segments: TranscriptSegment[];
  /** Raw full-text transcript string passed to TranscriptViewer. */
  fullText: string | undefined;
  /** Domain color tokens used to accent the hero card and player controls. */
  domainColor: ReturnType<typeof getDomainColor>;
  /** Callback invoked when the user clicks a transcript cue or bookmark timestamp. */
  onSeek: (time: number) => void;
  /** Motion props for the blur-to-clear entrance animation. */
  mercuryIn: Pick<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit' | 'transition'>;
}

/**
 * Renders either the full or compact left-column content for the audit brief detail page.
 *
 * @param props.compact - When true, renders CompactPlayer + compact transcript + bookmarks.
 *   When false, renders the hero card with thumbnail, title, description, and full transcript.
 * @param props.auditBriefId - Audit brief ID used to fetch and save bookmarks.
 * @param props.thumbnailUrl - Thumbnail asset URL for the hero image.
 * @param props.title - Audit brief title for the h1 heading.
 * @param props.description - Audit brief description paragraph.
 * @param props.segments - Parsed transcript segments for synchronised highlighting.
 * @param props.fullText - Raw transcript text for the text-only fallback view.
 * @param props.domainColor - Domain color tokens applied to the card accent stripe and player.
 * @param props.onSeek - Seek callback forwarded to the player from transcript/bookmark clicks.
 * @param props.mercuryIn - Motion animation config (initial/animate/exit/transition).
 * @returns Either the full hero+transcript layout or the compact player+transcript+bookmarks layout.
 */
export function AuditBriefMainContent({
  compact,
  auditBriefId,
  thumbnailUrl,
  title,
  description,
  segments,
  fullText,
  domainColor,
  onSeek,
  mercuryIn,
}: AuditBriefMainContentProps) {
  if (compact) {
    return (
      <motion.div key="compact" {...mercuryIn}>
        <CompactPlayer domainColor={domainColor} onSeek={onSeek} />

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <TranscriptViewer
            segments={segments}
            fullText={fullText}
            onSeek={onSeek}
            domainColor={domainColor}
            compact
          />
        </div>

        <div className="mt-3">
          <BookmarkPanel
            auditBriefId={auditBriefId}
            onSeek={onSeek}
            domainColor={domainColor}
            compact
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div key="full" {...mercuryIn}>
      <div className="flex overflow-hidden rounded-xl border border-border bg-card">
        <div className="w-1.5 shrink-0" style={{ backgroundColor: domainColor.border }} />
        <div className="flex flex-1 flex-col gap-6 p-5 lg:flex-row lg:items-center lg:p-6">
          <div className="flex min-w-0 flex-1 items-start gap-5">
            <div className="relative hidden size-32 shrink-0 overflow-hidden rounded-xl sm:block lg:size-40">
              <Image
                src={resolveStorageUrl(thumbnailUrl)}
                alt={title}
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{title}</h1>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>
          </div>
          <div className="w-full lg:w-100 lg:shrink-0">
            <AudioPlayer domainColor={domainColor} onSeek={onSeek} />
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <TranscriptViewer
          segments={segments}
          fullText={fullText}
          onSeek={onSeek}
          domainColor={domainColor}
        />
      </div>
    </motion.div>
  );
}
