/**
 * Structured logging for The Audit Brief using Pino.
 *
 * Key responsibilities:
 * - Provides structured JSON logging for production
 * - Pretty-prints logs in development
 * - Supports child loggers with scoped context
 * - Supports request-scoped loggers with correlation ID and user context
 *
 * @example
 * import { createLogger, createRequestLogger } from '@/lib/logger';
 * const log = createLogger('audit-briefs-api');
 * log.info({ auditBriefId: '123' }, 'Audit brief created');
 *
 * // In API route handlers:
 * const reqLog = createRequestLogger('api', request);
 * reqLog.info('Request received'); // includes request_id, user_id, method, path
 */
import pino from 'pino';
import type { NextRequest } from 'next/server';
import { extractRequestContext } from '@/lib/api/request-context';

const isServer = typeof window === 'undefined';
const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev && isServer
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:HH:MM:ss',
          },
        },
      }
    : {}),
  base: {
    env: process.env.NODE_ENV,
    service_name: 'the-audit-brief',
  },
});

/**
 * Creates a child logger with a context label.
 *
 * @param context - A label identifying the module or feature (e.g., 'auth', 'audit-briefs-api')
 * @returns A Pino child logger instance with the context attached
 */
export function createLogger(context: string): pino.Logger {
  return logger.child({ context });
}

/**
 * Creates a request-scoped child logger with correlation ID and user context.
 *
 * Extracts request metadata from headers set by the Edge middleware
 * (x-request-id, x-user-id, x-user-role) and attaches them as Pino bindings.
 * Null fields (unauthenticated requests) are omitted from bindings.
 *
 * @param context - A label identifying the module or feature (e.g., 'api', 'upload')
 * @param request - The incoming Next.js request with middleware-set headers
 * @returns A Pino child logger with request_id, user_id, user_role, method, and path
 */
export function createRequestLogger(context: string, request: NextRequest): pino.Logger {
  const ctx = extractRequestContext(request);

  const bindings: Record<string, string> = {
    context,
    request_id: ctx.requestId,
    method: ctx.method,
    path: ctx.path,
  };

  if (ctx.userId) bindings.user_id = ctx.userId;
  if (ctx.userRole) bindings.user_role = ctx.userRole;

  return logger.child(bindings);
}
