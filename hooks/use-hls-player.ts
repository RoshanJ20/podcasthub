/**
 * Custom hook for HLS.js audio playback integration.
 *
 * Manages an HTML5 audio element with HLS.js for adaptive streaming (.m3u8)
 * and native playback for standard audio formats. Syncs play/pause, volume,
 * and playback rate from the Zustand player store to the audio element.
 */
'use client';
import { useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayerStore } from '@/stores/player-store';

export function useHlsPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { currentPodcast, audioType, isPlaying, volume, playbackRate } = usePlayerStore();

  /** Derive the active audio URL based on audio type selection. */
  const rawUrl = currentPodcast
    ? audioType === 'long' && currentPodcast.audioLongUrl
      ? currentPodcast.audioLongUrl
      : currentPodcast.audioShortUrl
    : null;

  // Resolve storage keys through the media proxy to avoid private IP blocks
  const audioUrl = rawUrl
    ? rawUrl.startsWith('http') || rawUrl.startsWith('/')
      ? rawUrl
      : `/api/media?key=${encodeURIComponent(rawUrl)}`
    : null;

  /** Initialize HLS.js for .m3u8 streams or set native audio source. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

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
  }, [audioUrl]);

  /** Sync play/pause state with the audio element. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      const result = audio.play();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } else audio.pause();
  }, [isPlaying]);

  /** Sync volume with the audio element. */
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  /** Sync playback rate with the audio element. */
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  /** Handler for the audio element's timeupdate event. */
  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      usePlayerStore.getState().setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  /** Handler for the audio element's loadedmetadata event. */
  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      usePlayerStore.getState().setDuration(audioRef.current.duration);
    }
  }, []);

  /** Imperatively seek the audio element and update store. */
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      usePlayerStore.getState().seek(time);
    }
  }, []);

  return { audioRef, onTimeUpdate, onLoadedMetadata, seekTo };
}
