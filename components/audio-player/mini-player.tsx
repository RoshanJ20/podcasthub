/**
 * Mini player component — a persistent fixed bottom bar.
 *
 * Displays a compact player with podcast title, play/pause button,
 * thin progress bar, and close button. Visible when a podcast is loaded
 * and isMiniPlayerVisible is true in the player store. Clicking the
 * title navigates to the full podcast detail page.
 */
'use client';
import { usePlayerStore } from '@/stores/player-store';
import Link from 'next/link';
import { Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MiniPlayer() {
  const {
    currentPodcast,
    isPlaying,
    currentTime,
    duration,
    isMiniPlayerVisible,
    play,
    pause,
    closeMiniPlayer,
  } = usePlayerStore();

  if (!currentPodcast || !isMiniPlayerVisible) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      data-testid="mini-player"
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg"
    >
      {/* Thin progress bar at top of mini player */}
      <div className="h-1 bg-muted" data-testid="mini-player-progress">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex items-center gap-3 px-4 py-2">
        <Link href={`/podcast/${currentPodcast.id}`} className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentPodcast.title}</p>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={isPlaying ? pause : play}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={closeMiniPlayer} aria-label="Close player">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
