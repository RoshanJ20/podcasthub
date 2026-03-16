/**
 * Full-featured audio player component with HLS streaming support.
 *
 * Provides play/pause, skip +/-10s, progress seeking, volume control,
 * playback speed selection, and audio type toggling (short/long versions).
 * Integrates with the Zustand player store and uses HLS.js for adaptive
 * streaming. Supports keyboard shortcuts (spacebar for play/pause).
 */
'use client';
import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { useHlsPlayer } from '@/hooks/use-hls-player';
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

/** Format seconds as m:ss or h:mm:ss. */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Playback speed options. */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AudioPlayer() {
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
    <div data-testid="audio-player" className="w-full space-y-4 rounded-lg border bg-card p-4">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => usePlayerStore.getState().pause()}
        preload="metadata"
      />

      {/* Podcast title */}
      {currentPodcast && (
        <div className="text-center">
          <h3 className="text-lg font-semibold truncate">{currentPodcast.title}</h3>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-1">
        <Slider
          aria-label="Seek"
          min={0}
          max={duration || 100}
          value={[currentTime]}
          onValueChange={(val: number[]) => seekTo(val[0])}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Skip backward */}
        <Button variant="ghost" size="icon" onClick={skipBackward} aria-label="Skip backward">
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play / Pause */}
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="h-10 w-10"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        {/* Skip forward */}
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
          <Slider
            aria-label="Volume"
            min={0}
            max={1}
            step={0.01}
            value={[volume]}
            onValueChange={(val: number[]) => setVolume(val[0])}
            className="w-24"
          />
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

        {/* Bookmark button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={async () => {
            if (!currentPodcast) return;
            const ts = Math.floor(currentTime);
            try {
              const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  podcastId: currentPodcast.id,
                  timestampSeconds: ts,
                }),
              });
              if (!res.ok) {
                toast.error('Failed to add bookmark');
                return;
              }
              toast.success(`Bookmark added at ${formatTime(ts)}`);
            } catch {
              toast.error('Failed to add bookmark');
            }
          }}
          aria-label="Add bookmark"
        >
          <Bookmark className="h-4 w-4" />
        </Button>

        {/* Audio type toggle */}
        {hasLongVersion && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAudioType}
            aria-label={audioType === 'short' ? 'Short version' : 'Long version'}
            className="text-xs"
          >
            {audioType === 'short' ? 'Short' : 'Long'}
          </Button>
        )}
      </div>
    </div>
  );
}
