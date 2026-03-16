'use client';

/**
 * Self-contained audio player for a single learning path episode.
 *
 * Renders an optional thumbnail image, an HTML5 audio element with
 * play/pause, seek, volume, time display, a "Mark as Complete" button,
 * and an optional transcript section.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { resolveStorageUrl } from '@/lib/storage-url';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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

  // Parse transcript text from JSON array if needed
  const transcriptText = (() => {
    if (!transcript) return null;
    if (typeof transcript === 'string') return transcript;
    if (Array.isArray(transcript) && transcript.length > 0) return transcript.join('\n');
    return null;
  })();

  return (
    <div className="space-y-3 pt-3" data-testid={`episode-player-${episodeId}`}>
      {/* Thumbnail */}
      {resolvedThumbnail && (
        <div className="rounded overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedThumbnail}
            alt={`Thumbnail for ${title}`}
            className="w-full h-40 object-cover rounded"
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
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="h-9 w-9 shrink-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="flex-1 space-y-1">
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
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeVolume(volume > 0 ? 0 : 1)}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
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

      {/* Mark complete button */}
      <div>
        {isCompleted ? (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </div>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleMarkComplete}
            disabled={marking}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {marking ? 'Marking...' : 'Mark as Complete'}
          </Button>
        )}
      </div>

      {/* Transcript */}
      {transcriptText && (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
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
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted/30 rounded p-3">
            {transcriptText}
          </div>
        </div>
      )}
    </div>
  );
}
