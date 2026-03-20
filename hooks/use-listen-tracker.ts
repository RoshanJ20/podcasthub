'use client';

/**
 * Hook that logs 'listen' activity every 30 seconds during playback.
 *
 * Reads isPlaying from the player store and uses a debounced interval
 * to avoid flooding the activity API.
 *
 * @param auditBriefId - The ID of the audit brief currently being played
 */
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { createLogger } from '@/lib/logger';

const log = createLogger('use-listen-tracker');

const LISTEN_INTERVAL_MS = 30_000;

export function useListenTracker(auditBriefId: string | null) {
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const lastLoggedRef = useRef<number>(0);

  useEffect(() => {
    if (!auditBriefId || !isPlaying) return;

    const logListen = async () => {
      const now = Date.now();
      // Debounce: skip if last log was less than 25 seconds ago
      if (now - lastLoggedRef.current < 25_000) return;

      lastLoggedRef.current = now;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'listen',
            auditBriefId,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        log.warn(
          { error: error instanceof Error ? error.message : String(error), auditBriefId },
          'Activity tracking failed'
        );
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Log immediately on play start
    logListen();

    const interval = setInterval(logListen, LISTEN_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [auditBriefId, isPlaying]);
}
