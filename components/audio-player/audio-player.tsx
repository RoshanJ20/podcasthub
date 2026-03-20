/**
 * Full-featured audio player with Mercury-inspired styling.
 *
 * Domain-colored left strip, filled play button, glow shadow in dark mode,
 * animated play/pause icon morph, and bookmark bounce micro-interaction.
 * Integrates with the Zustand player store and uses HLS.js for adaptive streaming.
 *
 * Dependencies:
 * - motion/react for icon morph and bookmark bounce
 * - lib/animation for transition tokens
 * - lib/domain-colors for DomainColor type
 * - next-themes for dark/light mode detection
 */
'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { usePlayerStore } from '@/stores/player-store';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { transitions } from '@/lib/animation';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

/** Playback speed options. */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface AudioPlayerProps {
  /** Domain color for accent theming. */
  domainColor?: DomainColor;
  /** Seek function from the parent layout's audio element. */
  onSeek?: (time: number) => void;
}

export function AudioPlayer({ domainColor, onSeek }: AudioPlayerProps) {
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

  /** Handle keyboard shortcuts. */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    },
    [togglePlay]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const hasLongVersion = currentAuditBrief?.audioLongUrl;

  return (
    <div data-testid="audio-player" className="w-full space-y-2">
      {/* Progress bar — domain-colored */}
      <div className="space-y-1">
        <div style={{ '--primary': domainColor?.border } as React.CSSProperties}>
          <Slider
            aria-label="Seek"
            min={0}
            max={duration || 100}
            value={[currentTime]}
            onValueChange={(value) => seekTo(Array.isArray(value) ? value[0] : value)}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center">
        {/* Play / Pause — domain-colored filled circle */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-150 hover:scale-105 active:scale-95 active:duration-[100ms]"
          style={{
            backgroundColor: domainColor?.border ?? 'var(--primary)',
            color: 'white',
            boxShadow: domainColor
              ? `0 2px 8px ${domainColor.glow.replace('0.15', '0.3')}`
              : undefined,
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
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      {/* Secondary controls row */}
      <div className="flex items-center justify-between gap-4">
        {/* Playback speed */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const idx = SPEED_OPTIONS.indexOf(playbackRate);
            const nextIdx = (idx + 1) % SPEED_OPTIONS.length;
            setPlaybackRate(SPEED_OPTIONS[nextIdx]);
          }}
          aria-label={`${playbackRate}x`}
          className="text-xs font-mono"
        >
          {playbackRate}x
        </Button>

        {/* Audio type toggle */}
        {hasLongVersion && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAudioType}
            aria-label={
              audioType === 'short' ? 'Brief Summary version' : 'Detailed Overview version'
            }
            className="text-xs"
          >
            {audioType === 'short' ? 'Brief Summary' : 'Detailed Overview'}
          </Button>
        )}
      </div>
    </div>
  );
}
