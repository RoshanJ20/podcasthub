/**
 * Simple in-memory rate limiter using a Map.
 *
 * Tracks request counts per key within a sliding time window.
 * Suitable for single-instance deployments; for distributed setups
 * consider a Redis-backed implementation.
 */

/**
 * Configuration for the rate limiter.
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Time window duration in milliseconds. */
  windowMs: number;
}

/**
 * Result returned after checking a rate limit.
 */
export interface RateLimitResult {
  /** Whether the request is allowed. */
  isAllowed: boolean;
  /** Number of requests remaining in the current window. */
  remaining: number;
  /** Timestamp (ms since epoch) when the current window resets. */
  resetAt: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * Creates a rate limiter function with the given configuration.
 *
 * @param config - Rate limit settings (max requests and window duration).
 * @returns A function that accepts a key and returns a rate limit result.
 */
export function createRateLimiter(config: RateLimitConfig): (key: string) => RateLimitResult {
  const windows = new Map<string, WindowEntry>();

  return (key: string): RateLimitResult => {
    const now = Date.now();
    let entry = windows.get(key);

    // Reset window if expired or first request
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + config.windowMs };
      windows.set(key, entry);
    }

    // Check if under the limit
    if (entry.count < config.maxRequests) {
      entry.count++;
      return {
        isAllowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Over the limit
    return {
      isAllowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  };
}
