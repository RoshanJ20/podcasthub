/**
 * Fixed bottom mini-player for mobile viewports.
 *
 * Key responsibilities:
 * - Render a fixed bottom bar when an episode is loaded in the player store
 * - Show a slim progress bar at the top of the bar
 * - Display the episode thumbnail, truncated title, and a play/pause toggle
 * - Navigate to the audit brief detail page on tap (excluding the play/pause button)
 * - Hidden on md+ viewports where the sidebar now-playing widget is used instead
 *
 * Dependencies:
 * - usePlayerStore (Zustand) for playback state and controls
 * - resolveStorageUrl for converting storage keys to browser-loadable URLs
 * - Next.js Image for optimised thumbnail rendering
 * - Next.js Link for navigating to the audit brief detail page
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { resolveStorageUrl } from '@/lib/storage-url';

/**
 * Fixed bottom mini-player bar for mobile viewports.
 *
 * Returns null when no audit brief is loaded so that no space is reserved at the
 * bottom of the page when the player is idle.
 *
 * The progress bar sits flush at the very top of the bar and fills from left
 * to right as the episode plays. Tapping anywhere on the bar (except the
 * play/pause button) navigates to the full audit brief page.
 */
export function MobileBottomPlayer() {
  const currentAuditBrief = usePlayerStore((s) => s.currentAuditBrief);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);

  // Nothing to render when no episode is loaded in the player.
  if (!currentAuditBrief) return null;

  // Progress percentage clamped to [0, 100].
  const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const thumbnailUrl = resolveStorageUrl(currentAuditBrief.thumbnailUrl);

  const handleTogglePlay = (event: React.MouseEvent) => {
    // Prevent the Link wrapper from navigating when toggling playback.
    event.preventDefault();
    event.stopPropagation();
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <div
      data-testid="mobile-bottom-player"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur-sm md:hidden"
    >
      {/* ── Slim progress bar ─────────────────────────────────────────── */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Playback progress"
        className="h-0.5 w-full bg-muted"
      >
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── Player row ────────────────────────────────────────────────── */}
      <Link
        href={`/audit-brief/${currentAuditBrief.id}`}
        className="flex h-14 items-center gap-3 px-3"
        aria-label={`Now playing: ${currentAuditBrief.title}. Tap to open.`}
      >
        {/* Thumbnail */}
        <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            src={thumbnailUrl}
            alt={currentAuditBrief.title}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>

        {/* Title — truncated to one line */}
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{currentAuditBrief.title}</p>

        {/* Play / Pause toggle */}
        <button
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="shrink-0 rounded-full p-2 transition-colors hover:bg-secondary"
        >
          {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
      </Link>
    </div>
  );
}
