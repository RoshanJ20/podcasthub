/**
 * Request context extraction for structured logging and tracing.
 *
 * Key responsibilities:
 * - Extracts correlation ID, user identity, timing, and request metadata from headers
 * - Provides a typed RequestContext interface for consistent use across the logging layer
 * - Generates fallback request IDs when middleware headers are absent (e.g., in tests)
 *
 * Dependencies:
 * - next/server (NextRequest)
 *
 * @example
 * import { extractRequestContext } from '@/lib/api/request-context';
 *
 * const ctx = extractRequestContext(request);
 * logger.info({ request_id: ctx.requestId, user_id: ctx.userId }, 'Processing request');
 */
import type { NextRequest } from 'next/server';

/**
 * Typed representation of request metadata extracted from headers.
 *
 * Populated by middleware-set headers (x-request-id, x-user-id, etc.)
 * and used by the logging layer to attach context to all log entries.
 */
export interface RequestContext {
  /** Unique correlation ID for the request lifecycle */
  requestId: string;
  /** Authenticated user ID, or null if unauthenticated */
  userId: string | null;
  /** Authenticated user role, or null if unauthenticated */
  userRole: string | null;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request pathname (e.g., /api/auditBriefs) */
  path: string;
  /** Client IP address from proxy headers, or 'unknown' */
  ip: string;
  /** Epoch milliseconds when the request entered middleware, or null */
  requestStart: number | null;
}

/**
 * Extracts request context from Next.js request headers.
 *
 * Reads correlation ID, user identity, timing, and network metadata
 * set by the Edge middleware. Generates a fallback UUID for the request ID
 * when the header is absent (e.g., direct calls in tests or non-middleware paths).
 *
 * @param request - The incoming Next.js request
 * @returns A typed RequestContext object with all available metadata
 */
export function extractRequestContext(request: NextRequest): RequestContext {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const userId = request.headers.get('x-user-id') ?? null;
  const userRole = request.headers.get('x-user-role') ?? null;
  const ip =
    request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';

  const rawStart = request.headers.get('x-request-start');
  const parsed = rawStart ? Number(rawStart) : NaN;
  const requestStart = Number.isFinite(parsed) ? parsed : null;

  return {
    requestId,
    userId,
    userRole,
    method: request.method,
    path: request.nextUrl.pathname,
    ip,
    requestStart,
  };
}
