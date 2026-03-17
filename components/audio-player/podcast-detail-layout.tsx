/**
 * Client-side layout for the podcast detail page.
 *
 * Layout: Thumbnail + metadata on the left, player on the right.
 * Below the hero row: AnimatedTabs with Transcript, Attachments, Bookmarks.
 *
 * Sections cascade in from the left using sectionStagger + slideInFromLeft.
 * Domain colors thread through all child components.
 *
 * Dependencies:
 * - motion/react for entrance animations
 * - lib/animation for shared variants and stagger configs
 * - lib/domain-colors for per-domain color tokens
 * - next-themes for dark/light mode
 * - components/ui/animated-tabs for tab UI
 */
'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { ArrowLeft } from 'lucide-react';
import { resolveStorageUrl } from '@/lib/storage-url';
import { usePlayerStore } from '@/stores/player-store';
import { useHlsPlayer } from '@/hooks/use-hls-player';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { variants, transitions, sectionStagger } from '@/lib/animation';
import { getDomainColor } from '@/lib/domain-colors';
import { AnimatedTabs } from '@/components/ui/animated-tabs';
import { AudioPlayer } from './audio-player';
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

  /** Build tab items for AnimatedTabs. */
  const tabItems = useMemo(() => {
    const items = [
      {
        value: 'transcript',
        label: 'Transcript',
        content: (
          <TranscriptViewer
            segments={segments}
            fullText={activeTranscript?.fullText}
            onSeek={seekTo}
            domainColor={domainColor}
          />
        ),
      },
    ];

    if (hasAttachments) {
      items.push({
        value: 'attachments',
        label: 'Attachments',
        content: (
          <BulletinViewer
            url={podcast.bulletinUrls[0]}
            onClose={() => {
              /* Close handled by parent slide-in panel in future refactor */
            }}
          />
        ),
      });
    }

    items.push({
      value: 'bookmarks',
      label: 'Bookmarks',
      content: <BookmarkPanel podcastId={podcast.id} onSeek={seekTo} domainColor={domainColor} />,
    });

    return items;
  }, [
    segments,
    activeTranscript?.fullText,
    seekTo,
    domainColor,
    hasAttachments,
    podcast.bulletinUrls,
    podcast.id,
  ]);

  /* Choose wrapper element based on reduced-motion preference. */
  const Wrapper = reducedMotion ? 'div' : motion.div;
  const Section = reducedMotion ? 'div' : motion.div;

  const wrapperProps = reducedMotion
    ? {}
    : { variants: sectionStagger, initial: 'hidden' as const, animate: 'visible' as const };
  const sectionProps = reducedMotion
    ? {}
    : { variants: variants.slideInFromLeft, transition: transitions.normal };

  return (
    <Wrapper className="mx-auto max-w-5xl px-4 py-8 lg:py-12" {...wrapperProps}>
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

      {/* Hero card: colored left edge, thumbnail + metadata, player */}
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

      {/* Tabs: Transcript / Attachments / Bookmarks */}
      <Section className="mt-8" {...sectionProps}>
        <AnimatedTabs tabs={tabItems} defaultValue="transcript" layoutId="podcast-detail-tabs" />
      </Section>
    </Wrapper>
  );
}
