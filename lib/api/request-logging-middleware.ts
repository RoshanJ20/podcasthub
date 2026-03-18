/**
 * Request logging middleware for API route handlers.
 *
 * Key responsibilities:
 * - Logs structured request entry and completion for API routes
 * - Captures request duration from middleware-set x-request-start header
 * - Propagates correlation ID (x-request-id) into error responses
 * - Catches unhandled errors and returns structured 500 responses
 *
 * Dependencies:
 * - @/lib/logger (createRequestLogger)
 * - @/lib/api/request-context (extractRequestContext)
 * - @/lib/api/errors (ApiError, createErrorResponse, internalError)
 *
 * @example
 * import { withRequestLogging } from '@/lib/api/request-logging-middleware';
 *
 * export const POST = withRequestLogging(async (request) => {
 *   const user = requireAuth(request);
 *   // ... handler logic
 *   return NextResponse.json({ data });
 * });
 *
 * // Composing with rate limiting (logging wraps outside):
 * export const POST = withRequestLogging(withRateLimit('write', handler));
 */
import type { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { extractRequestContext } from '@/lib/api/request-context';
import { ApiError, createErrorResponse, internalError } from '@/lib/api/errors';

/**
 * Wraps an API route handler with structured request logging and error handling.
 *
 * Logs an INFO entry on request entry, an INFO entry on completion with status
 * and duration, WARN for expected ApiErrors, and ERROR for unhandled exceptions.
 * Sets x-request-id on all response headers and includes request_id in error
 * response bodies.
 *
 * @param handler - The API route handler to wrap
 * @returns A new handler with logging and error handling applied
 */
export function withRequestLogging(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
): (req: NextRequest, ...args: unknown[]) => Promise<NextResponse> {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const ctx = extractRequestContext(req);
    const log = createRequestLogger('api', req);

    log.info('Request received');
    const start = ctx.requestStart ?? Date.now();

    try {
      const response = await handler(req, ...args);
      const durationMs = Date.now() - start;

      log.info({ status: response.status, duration_ms: durationMs }, 'Request completed');
      response.headers.set('x-request-id', ctx.requestId);

      return response;
    } catch (error) {
      const durationMs = Date.now() - start;

      if (error instanceof ApiError) {
        log.warn(
          { status: error.status, error_code: error.errorCode, duration_ms: durationMs },
          'Request failed'
        );
        const response = createErrorResponse(error, ctx.requestId);
        response.headers.set('x-request-id', ctx.requestId);
        return response;
      }

      log.error({ error, duration_ms: durationMs }, 'Unhandled error');
      const response = createErrorResponse(internalError(), ctx.requestId);
      response.headers.set('x-request-id', ctx.requestId);
      return response;
    }
  };
}
