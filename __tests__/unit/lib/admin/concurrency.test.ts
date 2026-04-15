/**
 * Unit tests for lib/admin/concurrency.ts.
 *
 * Covers the opt-in semantics of assertFresh and its 409 emission on mismatch.
 */
import { describe, it, expect } from 'vitest';
import { assertFresh } from '@/lib/admin/concurrency';
import { ApiError, ErrorCode } from '@/lib/api/errors';

describe('assertFresh', () => {
  it('does nothing when `expected` is undefined', () => {
    expect(() => assertFresh(undefined, new Date())).not.toThrow();
  });

  it('does nothing when `expected` is null', () => {
    expect(() => assertFresh(null, new Date())).not.toThrow();
  });

  it('accepts matching Date inputs', () => {
    const ts = new Date('2026-04-15T12:00:00Z');
    expect(() => assertFresh(ts, new Date(ts))).not.toThrow();
  });

  it('accepts matching ISO string inputs', () => {
    const ts = new Date('2026-04-15T12:00:00Z');
    expect(() => assertFresh(ts.toISOString(), ts)).not.toThrow();
  });

  it('throws 409 CONFLICT on mismatch', () => {
    const actual = new Date('2026-04-15T12:00:00Z');
    const expected = new Date('2026-04-15T11:00:00Z');

    try {
      assertFresh(expected, actual);
      throw new Error('assertFresh did not throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiErr = error as ApiError;
      expect(apiErr.status).toBe(409);
      expect(apiErr.errorCode).toBe(ErrorCode.CONFLICT);
      expect(apiErr.details).toMatchObject({
        expected: expected.toISOString(),
        actual: actual.toISOString(),
      });
    }
  });

  it('rejects malformed expected inputs as 409', () => {
    expect(() => assertFresh('not-a-date', new Date())).toThrow(ApiError);
  });
});
