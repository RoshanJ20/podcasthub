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

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { usePlayerStore } from '@/stores/player-store';
import { useHlsPlayer } from '@/hooks/use-hls-player';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { transitions } from '@/lib/animation';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Volume1,
  Bookmark,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

/** Playback speed options. */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface AudioPlayerProps {
  /** Domain color for accent theming. */
  domainColor?: DomainColor;
}

export function AudioPlayer({ domainColor }: AudioPlayerProps) {
  const {
    currentPodcast,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    audioType,
    togglePlay,
    skipForward,
    skipBackward,
    setVolume,
    setPlaybackRate,
    toggleAudioType,
  } = usePlayerStore();

  const { audioRef, onTimeUpdate, onLoadedMetadata, seekTo } = useHlsPlayer();

  const reducedMotion = useReducedMotion();
  const [bookmarkBounce, setBookmarkBounce] = useState(false);

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

  /** Volume icon based on level. */
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  /** Toggle mute — restore to full volume when unmuting. */
  const lastNonZeroVolume = usePlayerStore((s) => (s.volume > 0 ? s.volume : 1));
  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(lastNonZeroVolume);
    }
  };

  const hasLongVersion = currentPodcast?.audioLongUrl;

  return (
    <div data-testid="audio-player" className="w-full space-y-2">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => usePlayerStore.getState().pause()}
        preload="metadata"
      />

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
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" onClick={skipBackward} aria-label="Skip backward">
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play / Pause — domain-colored filled circle */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
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

        <Button variant="ghost" size="icon" onClick={skipForward} aria-label="Skip forward">
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Secondary controls row */}
      <div className="flex items-center justify-between gap-4">
        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            className="h-8 w-8"
          >
            <VolumeIcon className="h-4 w-4" />
          </Button>
          <div style={{ '--primary': domainColor?.border } as React.CSSProperties}>
            <Slider
              aria-label="Volume"
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={(value) => setVolume(Array.isArray(value) ? value[0] : value)}
              className="w-24"
            />
          </div>
        </div>

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

        {/* Bookmark button with bounce micro-animation */}
        <motion.div
          animate={bookmarkBounce ? { scale: [1, 1.3, 1] } : {}}
          transition={transitions.fast}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={async () => {
              if (!currentPodcast) return;
              const timestampSeconds = Math.floor(currentTime);
              try {
                const response = await fetch('/api/bookmarks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    podcastId: currentPodcast.id,
                    timestampSeconds,
                  }),
                });
                if (!response.ok) {
                  toast.error('Failed to add bookmark');
                  return;
                }
                setBookmarkBounce(true);
                setTimeout(() => setBookmarkBounce(false), 400);
                toast.success(`Bookmark added at ${formatTime(timestampSeconds)}`);
              } catch {
                toast.error('Failed to add bookmark');
              }
            }}
            aria-label="Add bookmark"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </motion.div>

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
