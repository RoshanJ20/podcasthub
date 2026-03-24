/**
 * Custom hook for HLS.js audio playback integration.
 *
 * Manages a shared global HTML5 audio element with HLS.js for adaptive streaming (.m3u8)
 * and native playback for standard audio formats. Syncs play/pause, volume,
 * and playback rate from the Zustand player store to the audio element.
 *
 * The audio element is shared across all pages via AudioContext, persisting when navigating.
 */
'use client';
import { useEffect, useCallback, useRef } from 'react';
import Hls from 'hls.js';
import { usePlayerStore } from '@/stores/player-store';
import { useAudioRef } from '@/components/audio-player/audio-context';
import { withBasePath } from '@/lib/config/base-path';

export function useHlsPlayer() {
  const audioRef = useAudioRef();
  const hlsRef = useRef<Hls | null>(null);
  const { currentAuditBrief, audioType, isPlaying, volume, playbackRate } = usePlayerStore();

  /** Derive the active audio URL based on audio type selection. */
  const rawUrl = currentAuditBrief
    ? audioType === 'long' && currentAuditBrief.audioLongUrl
      ? currentAuditBrief.audioLongUrl
      : currentAuditBrief.audioShortUrl
    : null;

  // Resolve storage keys through the media proxy to avoid private IP blocks
  const audioUrl = rawUrl
    ? rawUrl.startsWith('http') || rawUrl.startsWith('/')
      ? rawUrl
      : withBasePath(`/api/media?key=${encodeURIComponent(rawUrl)}`)
    : null;

  /** Initialize HLS.js for .m3u8 streams or set native audio source. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // Reset playback state when audio source changes (e.g. switching Brief/Detailed)
    usePlayerStore.getState().pause();
    usePlayerStore.getState().setCurrentTime(0);

    if (audioUrl.endsWith('.m3u8') && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(audioUrl);
      hls.attachMedia(audio);
      hlsRef.current = hls;
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else {
      audio.src = audioUrl;
    }
  }, [audioUrl, audioRef]);

  /** Sync play/pause state with the audio element. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      const result = audio.play();
      if (result && typeof result.catch === 'function')
        result.catch(() => {
          /* Autoplay blocked by browser — expected, non-critical */
        });
    } else audio.pause();
  }, [isPlaying, audioRef]);

  /** Sync volume with the audio element. */
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, audioRef]);

  /** Sync playback rate with the audio element. */
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioRef]);

  /** Handler for the audio element's timeupdate event. */
  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      usePlayerStore.getState().setCurrentTime(audioRef.current.currentTime);
    }
  }, [audioRef]);

  /** Handler for the audio element's loadedmetadata event. */
  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      usePlayerStore.getState().setDuration(audioRef.current.duration);
    }
  }, [audioRef]);

  /** Imperatively seek the audio element and update store. */
  const seekTo = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        usePlayerStore.getState().seek(time);
      }
    },
    [audioRef]
  );

  return { audioRef, onTimeUpdate, onLoadedMetadata, seekTo };
}
