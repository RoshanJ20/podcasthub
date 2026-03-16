'use client';

/**
 * Hook that logs 'listen' activity every 30 seconds during playback.
 *
 * Reads isPlaying from the player store and uses a debounced interval
 * to avoid flooding the activity API.
 *
 * @param podcastId - The ID of the podcast currently being played
 */
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';

const LISTEN_INTERVAL_MS = 30_000;

export function useListenTracker(podcastId: string | null) {
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const lastLoggedRef = useRef<number>(0);

  useEffect(() => {
    if (!podcastId || !isPlaying) return;

    const logListen = async () => {
      const now = Date.now();
      // Debounce: skip if last log was less than 25 seconds ago
      if (now - lastLoggedRef.current < 25_000) return;

      lastLoggedRef.current = now;
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'listen',
            podcastId,
          }),
        });
      } catch {
        // Silently fail — fire-and-forget
      }
    };

    // Log immediately on play start
    logListen();

    const interval = setInterval(logListen, LISTEN_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [podcastId, isPlaying]);
}
