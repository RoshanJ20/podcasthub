/**
 * Rate limiting middleware for API route handlers.
 *
 * Key responsibilities:
 * - Wraps Next.js API route handlers with rate limit enforcement
 * - Provides pre-configured limiters for different endpoint categories (auth, read, write, upload, search)
 * - Returns 429 responses with Retry-After header when limits are exceeded
 * - Adds X-RateLimit-Remaining header to all responses
 *
 * Dependencies:
 * - ./rate-limit (createRateLimiter)
 * - ./errors (createErrorResponse, rateLimited)
 *
 * @example
 * import { withRateLimit } from '@/lib/api/rate-limit-middleware';
 *
 * export const GET = withRateLimit('read', async (req) => {
 *   return NextResponse.json({ data: [] });
 * });
 */
import type { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from './rate-limit';
import { createErrorResponse, rateLimited } from './errors';

/** Pre-configured rate limiters per PRD Section 12.3. */
const authLimiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
const readLimiter = createRateLimiter({ maxRequests: 100, windowMs: 60_000 });
const writeLimiter = createRateLimiter({ maxRequests: 20, windowMs: 60_000 });
const uploadLimiter = createRateLimiter({ maxRequests: 5, windowMs: 300_000 });
const searchLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 });

/** Categories of API endpoints, each with its own rate limit configuration. */
export type EndpointCategory = 'auth' | 'read' | 'write' | 'upload' | 'search';

/**
 * Returns the appropriate rate limiter function for a given endpoint category.
 *
 * @param category - The endpoint category to get the limiter for
 * @returns The rate limiter function for the specified category
 */
function getLimiter(category: EndpointCategory) {
  switch (category) {
    case 'auth':
      return authLimiter;
    case 'read':
      return readLimiter;
    case 'write':
      return writeLimiter;
    case 'upload':
      return uploadLimiter;
    case 'search':
      return searchLimiter;
  }
}

/**
 * Wraps an API route handler with rate limiting based on the client IP address.
 *
 * Extracts the client IP from x-forwarded-for or x-real-ip headers and applies
 * the rate limiter for the specified endpoint category. If the limit is exceeded,
 * returns a 429 response with Retry-After and X-RateLimit-Remaining headers.
 * Successful responses include the X-RateLimit-Remaining header.
 *
 * @param category - The endpoint category determining which rate limit to apply
 * @param handler - The original API route handler to wrap
 * @returns A new handler function that enforces rate limiting before invoking the original
 */
export function withRateLimit(
  category: EndpointCategory,
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const limiter = getLimiter(category);
    const result = limiter(ip);

    if (!result.isAllowed) {
      const response = createErrorResponse(rateLimited());
      response.headers.set('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
      response.headers.set('X-RateLimit-Remaining', '0');
      return response;
    }

    const response = await handler(req, ...args);
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    return response;
  };
}
