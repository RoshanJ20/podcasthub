/**
 * Unit tests for the useReducedMotion hook.
 *
 * Verifies that the hook correctly reads and reacts to the
 * `prefers-reduced-motion` media query via a mocked matchMedia API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

describe('useReducedMotion', () => {
  const mockMatchMedia = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('matchMedia', mockMatchMedia);
  });

  it('should return true when prefers-reduced-motion is reduce', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('should return false when prefers-reduced-motion is no-preference', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
