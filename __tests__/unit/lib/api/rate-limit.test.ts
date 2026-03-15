/**
 * Unit tests for the in-memory rate limiter.
 *
 * Covers request allowance, blocking at limit, window reset,
 * independent key tracking, and remaining count accuracy.
 */
import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '@/lib/api/rate-limit';

describe('createRateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
    const result = limiter('user-1');
    expect(result.isAllowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests at the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    limiter('user-1');
    limiter('user-1');
    limiter('user-1');
    const result = limiter('user-1');
    expect(result.isAllowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 100 });
    const first = limiter('user-1');
    expect(first.isAllowed).toBe(true);

    const blocked = limiter('user-1');
    expect(blocked.isAllowed).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    const afterReset = limiter('user-1');
    expect(afterReset.isAllowed).toBe(true);
    expect(afterReset.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    const result1 = limiter('user-a');
    const result2 = limiter('user-b');
    expect(result1.isAllowed).toBe(true);
    expect(result2.isAllowed).toBe(true);

    // user-a should now be blocked
    const result3 = limiter('user-a');
    expect(result3.isAllowed).toBe(false);

    // user-b should also be blocked
    const result4 = limiter('user-b');
    expect(result4.isAllowed).toBe(false);
  });

  it('returns correct remaining count', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    expect(limiter('user-1').remaining).toBe(2);
    expect(limiter('user-1').remaining).toBe(1);
    expect(limiter('user-1').remaining).toBe(0);
    // After limit, remaining stays at 0
    expect(limiter('user-1').remaining).toBe(0);
  });
});
