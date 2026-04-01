/**
 * Self-contained audio player for a single learning path episode.
 *
 * Compact layout: square thumbnail on the left, player controls on the right.
 * Transcript shown below in a fixed-height scrollable area.
 *
 * Dependencies:
 * - lib/domain-colors for DomainColor type
 * - lib/format-time for timestamp formatting
 * - components/ui for Button, Slider
 */
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { resolveStorageUrl } from '@/lib/storage-url';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';
import { withBasePath } from '@/lib/config/base-path';

export interface EpisodePlayerProps {
  episodeId: string;
  title: string;
  description: string | null;
  audioUrl: string;
  thumbnailUrl?: string | null;
  transcript?: string | string[] | null;
  isCompleted: boolean;
  graphId: string;
  onComplete: () => void;
  /** Domain color for accent theming. */
  domainColor?: DomainColor;
}

export function EpisodePlayer({
  episodeId,
  title,
  description,
  audioUrl,
  thumbnailUrl,
  transcript,
  isCompleted,
  graphId,
  onComplete,
  domainColor,
}: EpisodePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [marking, setMarking] = useState(false);

  const resolvedUrl = resolveStorageUrl(audioUrl);
  const resolvedThumbnail = thumbnailUrl ? resolveStorageUrl(thumbnailUrl) : null;

  /** Subscribe to global player state so we can pause when it starts. */
  const globalIsPlaying = usePlayerStore((s) => s.isPlaying);

  /** Pause this episode's audio whenever the global player starts playing. */
  useEffect(() => {
    if (globalIsPlaying) {
      audioRef.current?.pause();
    }
  }, [globalIsPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      usePlayerStore.getState().pause();
      audio.play();
    }
  }, [isPlaying]);

  const seekTo = useCallback((val: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = val;
    setCurrentTime(val);
  }, []);

  const changeVolume = useCallback((val: number) => {
    const audio = audioRef.current;
    if (audio) audio.volume = val;
    setVolume(val);
  }, []);

  const handleMarkComplete = async () => {
    setMarking(true);
    try {
      const res = await fetch(withBasePath('/api/progress'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphId, episodeId }),
      });
      if (!res.ok) throw new Error('Failed to mark complete');
      onComplete();
      toast.success('Episode marked as complete');
    } catch {
      toast.error('Failed to mark episode as complete');
    } finally {
      setMarking(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  const transcriptText = (() => {
    if (!transcript) return null;
    if (typeof transcript === 'string') return transcript;
    if (Array.isArray(transcript) && transcript.length > 0) return transcript.join('\n');
    return null;
  })();

  return (
    <div className="space-y-3" data-testid={`episode-player-${episodeId}`}>
      <audio
        ref={audioRef}
        src={resolvedUrl}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top row: thumbnail + controls */}
      <div className="flex gap-3">
        {/* Square thumbnail */}
        {resolvedThumbnail && (
          <div className="relative shrink-0 size-20 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedThumbnail}
              alt={`Thumbnail for ${title}`}
              className="size-full object-cover"
            />
          </div>
        )}

        {/* Controls + description */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          {description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
          )}

          {/* Player controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex size-8 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105"
              style={{
                backgroundColor: domainColor?.border ?? 'var(--primary)',
                color: 'white',
              }}
            >
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>

            <div
              className="flex-1 space-y-0.5"
              style={{ '--primary': domainColor?.border } as React.CSSProperties}
            >
              <Slider
                aria-label="Seek"
                min={0}
                max={duration || 100}
                value={[currentTime]}
                onValueChange={(value) => seekTo(Array.isArray(value) ? value[0] : value)}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume — compact */}
            <button
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => changeVolume(volume > 0 ? 0 : 1)}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>

          {/* Mark complete — inline */}
          {isCompleted ? (
            <div
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: domainColor?.border }}
            >
              <CheckCircle2 className="size-3.5" />
              Completed
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleMarkComplete}
              disabled={marking}
              style={{ backgroundColor: domainColor?.border, color: 'white' }}
              className="h-7 w-fit text-xs hover:opacity-90"
            >
              <CheckCircle2 className="mr-1 size-3.5" />
              {marking ? 'Marking...' : 'Mark as Complete'}
            </Button>
          )}
        </div>
      </div>

      {/* Transcript — compact scrollable */}
      {transcriptText && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Transcript</p>
          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
            {transcriptText}
          </div>
        </div>
      )}
    </div>
  );
}
