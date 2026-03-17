'use client';

/**
 * Global audio element that persists across all page navigations.
 *
 * - Renders a hidden audio element shared via AudioContext
 * - Syncs player store state (play/pause, volume, playback rate) to actual audio
 * - Enables seamless playback when navigating away from podcast detail page
 * - HLS.js handles adaptive streaming (.m3u8), native audio for standard formats
 */

import { useHlsPlayer } from '@/hooks/use-hls-player';
import { useAudioRef } from './audio-context';
import { usePlayerStore } from '@/stores/player-store';

export function GlobalAudioPlayer() {
  const audioRef = useAudioRef();
  const { onTimeUpdate, onLoadedMetadata } = useHlsPlayer();
  const pause = usePlayerStore((s) => s.pause);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
      onEnded={pause}
      preload="metadata"
      className="hidden"
      aria-hidden
    />
  );
}
