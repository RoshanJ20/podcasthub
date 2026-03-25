/**
 * Lightweight hook for seeking the global audio element.
 *
 * Unlike useHlsPlayer (which initialises HLS.js and syncs playback state),
 * this hook only provides a seek function. Use it in components that need
 * to jump to a timestamp without owning the HLS lifecycle — e.g. transcript
 * click-to-seek, bookmark navigation, or detail layout seek controls.
 *
 * Key responsibilities:
 * - Expose a stable `seekTo` callback that updates both the audio element
 *   and the player store
 *
 * Dependencies:
 * - components/audio-player/audio-context (useAudioRef)
 * - stores/player-store (seek action)
 */
'use client';

import { useCallback } from 'react';
import { useAudioRef } from '@/components/audio-player/audio-context';
import { usePlayerStore } from '@/stores/player-store';

/**
 * Returns a stable seek function that jumps the global audio element to the
 * given timestamp and updates the player store.
 *
 * @returns seekTo - A callback that accepts a time in seconds.
 */
export function useSeekTo(): (time: number) => void {
  const audioRef = useAudioRef();

  return useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        usePlayerStore.getState().seek(time);
      }
    },
    [audioRef]
  );
}
