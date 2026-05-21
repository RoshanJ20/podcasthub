/**
 * Unit tests for the enriched useListenTracker hook.
 *
 * Behaviour under test:
 * - Fires a `listen` POST every ~30s while `isPlaying` is true, debounced to
 *   skip pings <25s apart (carried over from the original implementation).
 * - Each ping carries enriched metadata: positionSeconds, playbackRate,
 *   audioType (pulled from the player store at ping time), a UUID sessionId
 *   stable for the duration of one play session, and elapsedSinceLastPingMs.
 * - A new sessionId is minted on every isPlaying false→true transition and on
 *   auditBrief change.
 * - Fetch failures are swallowed and logged via Pino warn.
 * - The interval is torn down on unmount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { storeState } = vi.hoisted(() => ({
  storeState: {
    isPlaying: false as boolean,
    currentTime: 0 as number,
    playbackRate: 1 as number,
    audioType: 'short' as 'short' | 'long',
  },
}));

vi.mock('@/stores/player-store', () => {
  const usePlayerStore: ((selector: (s: typeof storeState) => unknown) => unknown) & {
    getState: () => typeof storeState;
  } = ((selector: (s: typeof storeState) => unknown) => selector(storeState)) as ((
    selector: (s: typeof storeState) => unknown
  ) => unknown) & {
    getState: () => typeof storeState;
  };
  usePlayerStore.getState = () => storeState;
  return { usePlayerStore };
});

vi.mock('@/lib/config/base-path', () => ({
  withBasePath: (p: string) => `/auditbrief${p}`,
}));

const { warnSpy } = vi.hoisted(() => ({ warnSpy: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: warnSpy, info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { useListenTracker } from '@/hooks/use-listen-tracker';

const BRIEF_ID = 'brief-1';
const FIXED_UUID = '00000000-0000-0000-0000-000000000001';

let uuidCounter = 0;
function nextUuid() {
  uuidCounter += 1;
  return `00000000-0000-0000-0000-${String(uuidCounter).padStart(12, '0')}`;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  uuidCounter = 0;
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(
    () => nextUuid() as `${string}-${string}-${string}-${string}-${string}`
  );
  global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
  storeState.isPlaying = false;
  storeState.currentTime = 0;
  storeState.playbackRate = 1;
  storeState.audioType = 'short';
  warnSpy.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function lastFetchBody() {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
  return JSON.parse(calls[calls.length - 1][1].body);
}

describe('useListenTracker — emission gating', () => {
  it('does not fire when isPlaying is false', async () => {
    renderHook(() => useListenTracker(BRIEF_ID));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fire when auditBriefId is null', async () => {
    storeState.isPlaying = true;
    renderHook(() => useListenTracker(null));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fires immediately on play start with full enriched metadata', async () => {
    storeState.isPlaying = true;
    storeState.currentTime = 12.5;
    storeState.playbackRate = 1.5;
    storeState.audioType = 'long';

    renderHook(() => useListenTracker(BRIEF_ID));
    await vi.advanceTimersByTimeAsync(0);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = lastFetchBody();
    expect(body).toMatchObject({
      activityType: 'listen',
      auditBriefId: BRIEF_ID,
      metadata: {
        positionSeconds: 12.5,
        playbackRate: 1.5,
        audioType: 'long',
        sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        elapsedSinceLastPingMs: 0,
      },
    });
  });
});

describe('useListenTracker — sessions', () => {
  it('reuses the same sessionId across continuous pings', async () => {
    storeState.isPlaying = true;
    renderHook(() => useListenTracker(BRIEF_ID));

    await vi.advanceTimersByTimeAsync(0);
    const first = lastFetchBody().metadata.sessionId;

    await vi.advanceTimersByTimeAsync(30_000);
    const second = lastFetchBody().metadata.sessionId;

    await vi.advanceTimersByTimeAsync(30_000);
    const third = lastFetchBody().metadata.sessionId;

    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('reports ~30000 elapsedSinceLastPingMs on subsequent pings in the same session', async () => {
    storeState.isPlaying = true;
    renderHook(() => useListenTracker(BRIEF_ID));

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(30_000);

    const body = lastFetchBody();
    expect(body.metadata.elapsedSinceLastPingMs).toBe(30_000);
  });

  it('mints a new sessionId after pause→play', async () => {
    storeState.isPlaying = true;
    const { rerender } = renderHook(() => useListenTracker(BRIEF_ID));

    await vi.advanceTimersByTimeAsync(0);
    const firstSession = lastFetchBody().metadata.sessionId;

    // Pause: isPlaying becomes false, effect re-runs and cleans up
    act(() => {
      storeState.isPlaying = false;
    });
    rerender();
    await vi.advanceTimersByTimeAsync(5_000);

    // Resume
    act(() => {
      storeState.isPlaying = true;
    });
    rerender();
    await vi.advanceTimersByTimeAsync(0);

    const secondSession = lastFetchBody().metadata.sessionId;
    expect(secondSession).not.toBe(firstSession);
  });

  it('mints a new sessionId when the auditBriefId changes mid-play', async () => {
    storeState.isPlaying = true;
    const { rerender } = renderHook(({ id }: { id: string }) => useListenTracker(id), {
      initialProps: { id: 'brief-A' },
    });

    await vi.advanceTimersByTimeAsync(0);
    const firstSession = lastFetchBody().metadata.sessionId;

    rerender({ id: 'brief-B' });
    await vi.advanceTimersByTimeAsync(0);

    const secondSession = lastFetchBody().metadata.sessionId;
    expect(secondSession).not.toBe(firstSession);
    expect(lastFetchBody().auditBriefId).toBe('brief-B');
  });
});

describe('useListenTracker — store reads at ping time', () => {
  it('reflects player state at ping time, not at hook mount', async () => {
    storeState.isPlaying = true;
    storeState.currentTime = 5;
    storeState.playbackRate = 1;
    storeState.audioType = 'short';

    renderHook(() => useListenTracker(BRIEF_ID));
    await vi.advanceTimersByTimeAsync(0);
    expect(lastFetchBody().metadata.positionSeconds).toBe(5);

    // Mutate the store mid-session (rate change + position advance)
    storeState.currentTime = 120;
    storeState.playbackRate = 2;
    storeState.audioType = 'long';

    await vi.advanceTimersByTimeAsync(30_000);
    expect(lastFetchBody().metadata.positionSeconds).toBe(120);
    expect(lastFetchBody().metadata.playbackRate).toBe(2);
    expect(lastFetchBody().metadata.audioType).toBe('long');
  });
});

describe('useListenTracker — lifecycle', () => {
  it('clears the interval on unmount so no further pings fire', async () => {
    storeState.isPlaying = true;
    const { unmount } = renderHook(() => useListenTracker(BRIEF_ID));
    await vi.advanceTimersByTimeAsync(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    unmount();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('logs a warn but does not throw when fetch rejects', async () => {
    storeState.isPlaying = true;
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    renderHook(() => useListenTracker(BRIEF_ID));
    await vi.advanceTimersByTimeAsync(0);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ auditBriefId: BRIEF_ID }),
      expect.stringContaining('Activity tracking failed')
    );
  });
});

// Quiet the unused-import lint that the FIXED_UUID alias was for documentation
void FIXED_UUID;
