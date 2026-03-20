/**
 * Learning path viewer with Mercury-inspired styling.
 *
 * Layout mirrors the audit brief detail page:
 * - Back link + domain badge
 * - Hero card with domain-colored left edge, title, description, progress
 * - Staggered episode list below with expand/collapse players
 *
 * Dependencies:
 * - motion/react for entrance animations
 * - lib/animation for shared variants and stagger configs
 * - lib/domain-colors for per-domain color tokens
 * - next-themes for dark/light mode
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import { ArrowLeft, CheckCircle2, Circle, ChevronDown } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { variants, transitions, sectionStagger } from '@/lib/animation';
import { getDomainColor } from '@/lib/domain-colors';
import { cn } from '@/lib/utils';
import { EpisodePlayer } from './episode-player';

interface Episode {
  id: string;
  title: string;
  nodeType: string;
  audioUrl: string;
  description: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
  positionX: number;
  positionY: number;
  sortOrder: number;
}

interface PathViewerWrapperProps {
  graphId: string;
  title: string;
  description: string | null;
  domain: string;
  pathType: 'graph' | 'linear';
  episodes: Episode[];
  edges: { id: string; sourceEpisodeId: string; targetEpisodeId: string }[];
}

export function PathViewerWrapper({
  graphId,
  title,
  description,
  domain,
  pathType: _pathType,
  episodes,
  edges: _edges,
}: PathViewerWrapperProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const domainColor = getDomainColor(domain);
  const badgeBg = isDark ? domainColor.darkBg : domainColor.bg;
  const badgeText = isDark ? domainColor.darkText : domainColor.text;

  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch('/api/progress');
        if (!response.ok) return;
        const progressResponse = await response.json();
        const ids = new Set<string>(
          (progressResponse.data ?? [])
            .filter((progress: { graph?: { id: string } }) => progress.graph?.id === graphId)
            .map((progress: { episode?: { id: string } }) => progress.episode?.id)
            .filter(Boolean)
        );
        setCompletedIds(ids);
      } catch {
        // User may not be logged in
      }
    }
    fetchProgress();
  }, [graphId]);

  const handleComplete = useCallback((episodeId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(episodeId);
      return next;
    });
  }, []);

  const sortedEpisodes = [...episodes].sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = sortedEpisodes.filter((e) => completedIds.has(e.id)).length;
  const progress =
    sortedEpisodes.length > 0 ? Math.round((completedCount / sortedEpisodes.length) * 100) : 0;

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
      {/* Back link + badge */}
      <Section {...sectionProps}>
        <Link
          href="/learning-path"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to learning series
        </Link>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: badgeBg, color: badgeText }}
          >
            {domain || 'Learning Series'}
          </span>
          <span className="text-xs text-muted-foreground">{sortedEpisodes.length} episodes</span>
        </div>
      </Section>

      {/* Hero card: domain-colored left edge + title + description + progress */}
      <Section
        className="flex overflow-hidden rounded-xl border border-border bg-card"
        {...sectionProps}
      >
        <div className="w-1.5 shrink-0" style={{ backgroundColor: domainColor.border }} />
        <div className="flex-1 p-5 lg:p-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{title}</h1>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                {completedCount} of {sortedEpisodes.length} completed
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  backgroundColor: domainColor.border,
                }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Episode list */}
      <Section className="mt-8 space-y-2" {...sectionProps}>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Episodes</h2>
        {sortedEpisodes.map((ep, index) => {
          const isCompleted = completedIds.has(ep.id);
          const isExpanded = expandedId === ep.id;

          const EpWrapper = reducedMotion ? 'div' : motion.div;
          const epMotion = reducedMotion
            ? {}
            : {
                initial: { opacity: 0, x: -20 } as const,
                whileInView: { opacity: 1, x: 0 } as const,
                viewport: { once: true, margin: '-30px' } as const,
                transition: transitions.normal,
              };

          return (
            <EpWrapper
              key={ep.id}
              className={cn(
                'overflow-hidden rounded-xl border transition-colors',
                isCompleted ? 'border-border bg-card' : 'border-border bg-card'
              )}
              {...epMotion}
            >
              {/* Episode header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50"
              >
                {/* Completion indicator */}
                {isCompleted ? (
                  <CheckCircle2 className="size-5 shrink-0" style={{ color: domainColor.border }} />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                )}

                {/* Episode number + title */}
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">
                    {index + 1}. {ep.title}
                  </span>
                  {ep.description && !isExpanded && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {ep.description}
                    </p>
                  )}
                </div>

                {/* Expand chevron */}
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={transitions.fast}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      {ep.audioUrl ? (
                        <EpisodePlayer
                          episodeId={ep.id}
                          title={ep.title}
                          description={ep.description}
                          audioUrl={ep.audioUrl}
                          thumbnailUrl={ep.thumbnailUrl}
                          transcript={ep.transcript}
                          isCompleted={isCompleted}
                          graphId={graphId}
                          onComplete={() => handleComplete(ep.id)}
                          domainColor={domainColor}
                        />
                      ) : (
                        <div>
                          {ep.description && (
                            <p className="mb-2 text-sm text-muted-foreground">{ep.description}</p>
                          )}
                          <p className="text-sm italic text-muted-foreground">
                            No audio available for this episode.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </EpWrapper>
          );
        })}
      </Section>
    </Wrapper>
  );
}
