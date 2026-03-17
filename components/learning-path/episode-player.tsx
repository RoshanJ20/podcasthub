/**
 * Self-contained audio player for a single learning path episode.
 *
 * Renders play/pause, seek, volume, time display, "Mark as Complete"
 * button, and optional transcript. Uses domain colors for the play
 * button and slider accent.
 *
 * Dependencies:
 * - lib/domain-colors for DomainColor type
 * - lib/format-time for timestamp formatting
 * - components/ui for Button, Slider
 */
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { resolveStorageUrl } from '@/lib/storage-url';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

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

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
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
      const res = await fetch('/api/progress', {
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
      {/* Thumbnail */}
      {resolvedThumbnail && (
        <div className="overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedThumbnail}
            alt={`Thumbnail for ${title}`}
            className="h-40 w-full rounded-lg object-cover"
          />
        </div>
      )}

      {description && <p className="text-sm text-muted-foreground">{description}</p>}

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

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Domain-colored play button */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex size-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: domainColor?.border ?? 'var(--primary)',
            color: 'white',
          }}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>

        {/* Seek slider — domain-colored */}
        <div
          className="flex-1 space-y-1"
          style={{ '--primary': domainColor?.border } as React.CSSProperties}
        >
          <Slider
            aria-label="Seek"
            min={0}
            max={duration || 100}
            value={[currentTime]}
            onValueChange={(value) => seekTo(Array.isArray(value) ? value[0] : value)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => changeVolume(volume > 0 ? 0 : 1)}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
          <div style={{ '--primary': domainColor?.border } as React.CSSProperties}>
            <Slider
              aria-label="Volume"
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={(value) => changeVolume(Array.isArray(value) ? value[0] : value)}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Mark complete */}
      <div>
        {isCompleted ? (
          <div
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: domainColor?.border }}
          >
            <CheckCircle2 className="size-4" />
            Completed
          </div>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleMarkComplete}
            disabled={marking}
            style={{ backgroundColor: domainColor?.border, color: 'white' }}
            className="hover:opacity-90"
          >
            <CheckCircle2 className="mr-1 size-4" />
            {marking ? 'Marking...' : 'Mark as Complete'}
          </Button>
        )}
      </div>

      {/* Transcript */}
      {transcriptText && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium">Transcript</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const blob = new Blob([transcriptText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title}-transcript.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="mr-1 size-3.5" />
              Download
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
            {transcriptText}
          </div>
        </div>
      )}
    </div>
  );
}
