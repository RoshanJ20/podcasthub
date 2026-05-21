'use client';

/**
 * Hook that posts a `listen` activity ping every ~30 seconds during playback,
 * enriched with metadata that lets analytics derive precise listen-time
 * rather than just counting events.
 *
 * Per ping the payload includes:
 * - `positionSeconds` — player.currentTime at ping time
 * - `playbackRate` — current rate (0.5..2.0)
 * - `audioType` — 'short' | 'long'
 * - `sessionId` — UUID stable for one uninterrupted play session; a new id is
 *   minted on every isPlaying false→true transition and on auditBriefId
 *   change, so SQL aggregations can detect resumed vs. fresh listens.
 * - `elapsedSinceLastPingMs` — wall-clock ms since the previous ping in this
 *   session (0 on the first ping). Summing this column gives exact wall-clock
 *   listen time per (user, audit brief, session).
 *
 * The fetch is fire-and-forget with a 5-second AbortController timeout;
 * failures are logged at warn level and never propagate.
 *
 * @param auditBriefId - The ID of the audit brief currently being played; null
 *   or undefined disables emission.
 */
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { createLogger } from '@/lib/logger';
import { withBasePath } from '@/lib/config/base-path';

const log = createLogger('use-listen-tracker');

const LISTEN_INTERVAL_MS = 30_000;
const DEBOUNCE_MS = 25_000;
const FETCH_TIMEOUT_MS = 5_000;

export function useListenTracker(auditBriefId: string | null) {
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const lastLoggedRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auditBriefId || !isPlaying) return;

    /* New session per (isPlaying transition, auditBrief change). */
    const sessionId = crypto.randomUUID();
    sessionIdRef.current = sessionId;
    const sessionStart = Date.now();
    lastLoggedRef.current = 0;

    const logListen = async () => {
      const now = Date.now();
      if (lastLoggedRef.current !== 0 && now - lastLoggedRef.current < DEBOUNCE_MS) return;

      const elapsedSinceLastPingMs =
        lastLoggedRef.current === 0 ? now - sessionStart : now - lastLoggedRef.current;
      lastLoggedRef.current = now;

      const { currentTime, playbackRate, audioType } = usePlayerStore.getState();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        await fetch(withBasePath('/api/activity'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'listen',
            auditBriefId,
            metadata: {
              positionSeconds: currentTime,
              playbackRate,
              audioType,
              sessionId,
              elapsedSinceLastPingMs,
            },
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

    void logListen();

    const interval = setInterval(() => {
      void logListen();
    }, LISTEN_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      sessionIdRef.current = null;
    };
  }, [auditBriefId, isPlaying]);
}
