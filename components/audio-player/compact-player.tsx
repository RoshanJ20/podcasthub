/**
 * Compact audio player for the compressed left column.
 *
 * Displays only essential controls: title, play/pause, progress bar,
 * current time, and playback speed. Used when the PDF panel is open
 * and the left column is at 30% width.
 *
 * Key responsibilities:
 * - Render a minimal, space-efficient audio player UI
 * - Delegate all playback state to the shared Zustand player store
 * - Support domain-color theming via optional domainColor prop
 * - Respect reduced-motion preferences for play/pause icon animation
 *
 * Dependencies:
 * - motion/react for play/pause icon morph animation
 * - lib/animation for transition tokens
 * - lib/domain-colors for DomainColor type
 * - stores/player-store for playback state
 * - hooks/use-hls-player for audio seeking
 * - hooks/use-reduced-motion for accessibility
 */
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/stores/player-store';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { transitions } from '@/lib/animation';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

/** Ordered list of playback speed options the user can cycle through. */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Props for the CompactPlayer component.
 *
 * @param domainColor - Optional domain color palette for accent theming.
 */
interface CompactPlayerProps {
  domainColor?: DomainColor;
  /** Seek function from the parent layout's audio element. */
  onSeek?: (time: number) => void;
}

/**
 * A minimal audio player showing title, play/pause, seek slider, current time,
 * and a playback speed toggle. Omits volume, skip, bookmark, and audio type
 * controls that are present in the full AudioPlayer.
 *
 * @param props - Component props containing optional domain color.
 * @returns The compact player React element.
 */
export function CompactPlayer({ domainColor, onSeek }: CompactPlayerProps) {
  const {
    currentAuditBrief,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    audioType,
    togglePlay,
    setPlaybackRate,
    toggleAudioType,
  } = usePlayerStore();
  const seekTo = onSeek ?? (() => {});
  const reducedMotion = useReducedMotion();

  /** Advance to the next speed option in a circular manner. */
  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    setPlaybackRate(SPEED_OPTIONS[nextIndex]);
  };

  return (
    <div
      data-testid="compact-player"
      className="space-y-2 rounded-xl border border-border bg-card p-3"
    >
      {/* Audit brief title — truncated to a single line */}
      <p className="truncate text-sm font-semibold">{currentAuditBrief?.title ?? 'Untitled'}</p>

      {/* Playback controls row: play/pause + seek slider + time */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: domainColor?.border ?? 'var(--primary)',
            color: 'white',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isPlaying ? 'pause' : 'play'}
              initial={reducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
              transition={transitions.fast}
              className="flex items-center justify-center"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </button>

        <div className="flex flex-1 items-center gap-2">
          {/* Seek slider — domain-colored when a domainColor is provided */}
          <div
            className="flex-1"
            style={{ '--primary': domainColor?.border } as React.CSSProperties}
          >
            <Slider
              aria-label="Seek"
              min={0}
              max={duration || 100}
              value={[currentTime]}
              onValueChange={(value) => seekTo(Array.isArray(value) ? value[0] : value)}
            />
          </div>

          {/* Current time display */}
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Speed + audio type row */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={cycleSpeed}
          aria-label={`${playbackRate}x`}
          className="h-7 text-xs font-mono"
        >
          {playbackRate}x
        </Button>
        {currentAuditBrief?.audioLongUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAudioType}
            aria-label={
              audioType === 'short' ? 'Brief Summary version' : 'Detailed Overview version'
            }
            className="h-7 text-[11px]"
          >
            {audioType === 'short' ? 'Brief' : 'Detailed'}
          </Button>
        )}
      </div>
    </div>
  );
}
