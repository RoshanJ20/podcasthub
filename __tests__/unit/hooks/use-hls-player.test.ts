/**
 * Unit tests for the useHlsPlayer hook.
 *
 * Verifies that the hook provides an audioRef, onTimeUpdate callback,
 * onLoadedMetadata callback, and seekTo function.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHlsPlayer } from '@/hooks/use-hls-player';

vi.mock('@/components/audio-player/audio-context', () => ({
  useAudioRef: () => ({ current: null }),
}));

vi.mock('hls.js', () => ({
  default: class MockHls {
    static isSupported() {
      return true;
    }
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
  },
}));

describe('useHlsPlayer', () => {
  it('returns an audioRef', () => {
    const { result } = renderHook(() => useHlsPlayer());
    expect(result.current.audioRef).toBeDefined();
  });

  it('provides onTimeUpdate callback', () => {
    const { result } = renderHook(() => useHlsPlayer());
    expect(typeof result.current.onTimeUpdate).toBe('function');
  });

  it('provides onLoadedMetadata callback', () => {
    const { result } = renderHook(() => useHlsPlayer());
    expect(typeof result.current.onLoadedMetadata).toBe('function');
  });

  it('provides seekTo function', () => {
    const { result } = renderHook(() => useHlsPlayer());
    expect(typeof result.current.seekTo).toBe('function');
  });
});
