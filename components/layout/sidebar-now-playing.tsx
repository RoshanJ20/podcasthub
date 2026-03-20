/**
 * Now-playing widget for the application sidebar.
 *
 * Key responsibilities:
 * - Display the currently playing episode's thumbnail, title, and progress
 * - Provide play/pause toggle and a visual progress bar
 * - Adapt to collapsed sidebar mode by showing only a circular play/pause button
 * - Hide entirely when no episode is loaded in the player store
 *
 * Dependencies:
 * - usePlayerStore (Zustand) for playback state and controls
 * - resolveStorageUrl for converting MinIO storage keys to browser-loadable URLs
 * - Next.js Image for optimised thumbnail rendering
 */
'use client';

import Image from 'next/image';
import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { resolveStorageUrl } from '@/lib/storage-url';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format-time';

/**
 * Props for the SidebarNowPlaying component.
 */
interface SidebarNowPlayingProps {
  /**
   * When true, the sidebar is collapsed to icon-only width. Only a circular
   * play/pause button is rendered in this mode.
   */
  collapsed?: boolean;
}

/**
 * Sidebar widget that shows the currently playing episode.
 *
 * Returns null when the player has no loaded episode so the sidebar layout
 * is not disrupted by an empty state.
 *
 * @param props - See {@link SidebarNowPlayingProps}.
 */
export function SidebarNowPlaying({ collapsed = false }: SidebarNowPlayingProps) {
  const currentAuditBrief = usePlayerStore((s) => s.currentAuditBrief);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);

  // Nothing to show when no episode is loaded.
  if (!currentAuditBrief) return null;

  const handleTogglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // Progress percentage clamped to [0, 100] to guard against NaN.
  const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const thumbnailUrl = resolveStorageUrl(currentAuditBrief.thumbnailUrl);

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-2">
        <button
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={cn(
            'flex size-8 items-center justify-center rounded-full transition-colors',
            'bg-accent text-accent-foreground hover:bg-accent/80'
          )}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="now-playing-widget"
      className="mx-2 rounded-lg border bg-card p-3 text-card-foreground"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Now Playing
      </p>

      {/* Thumbnail + title row */}
      <div className="flex items-center gap-3">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            src={thumbnailUrl}
            alt={currentAuditBrief.title}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>

        <p className="line-clamp-2 flex-1 text-xs font-medium leading-snug">
          {currentAuditBrief.title}
        </p>

        {/* Play / Pause toggle */}
        <button
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-secondary"
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 space-y-1">
        <div
          data-testid="now-playing-progress"
          role="progressbar"
          aria-valuenow={Math.round(progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Playback progress"
          className="h-1 w-full overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
