/**
 * Prisma query instrumentation for slow query detection.
 *
 * Key responsibilities:
 * - Provides a pure function to conditionally log slow queries at WARN level
 * - Exports a configurable threshold (via SLOW_QUERY_THRESHOLD_MS env var)
 * - Designed to be used with Prisma $extends query wrapper in lib/db.ts
 *
 * Dependencies:
 * - pino (Logger type)
 *
 * @example
 * import { logSlowQuery, SLOW_QUERY_THRESHOLD_MS } from '@/lib/db-instrumentation';
 *
 * // Inside a Prisma $extends query wrapper:
 * const duration = performance.now() - start;
 * logSlowQuery(model, operation, duration, logger);
 */
import type pino from 'pino';

/**
 * Duration threshold in milliseconds above which a query is considered slow.
 * Configurable via the SLOW_QUERY_THRESHOLD_MS environment variable.
 * Defaults to 500ms.
 */
export const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500', 10);

/**
 * Logs a warning if a Prisma query exceeded the slow query threshold.
 *
 * Only logs when duration strictly exceeds the threshold. Includes the
 * Prisma model name, operation type, actual duration, and threshold in
 * the structured log entry for easy filtering and alerting.
 *
 * @param model - The Prisma model name (e.g., 'Podcast', 'User')
 * @param operation - The Prisma operation (e.g., 'findMany', 'create')
 * @param durationMs - The actual query duration in milliseconds
 * @param logger - A Pino logger instance to write the warning to
 * @param threshold - Optional custom threshold; defaults to SLOW_QUERY_THRESHOLD_MS
 */
export function logSlowQuery(
  model: string,
  operation: string,
  durationMs: number,
  logger: pino.Logger,
  threshold: number = SLOW_QUERY_THRESHOLD_MS
): void {
  if (durationMs > threshold) {
    logger.warn(
      {
        model,
        operation,
        duration_ms: durationMs,
        threshold_ms: threshold,
      },
      'Slow query detected'
    );
  }
}
