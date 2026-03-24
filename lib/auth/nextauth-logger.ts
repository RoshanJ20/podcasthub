/**
 * NextAuth-compatible logger that delegates to Pino.
 *
 * Key responsibilities:
 * - Bridges NextAuth's internal error/warn/debug logging to Pino structured output
 * - Extracts verbose metadata from NextAuth error objects for production debugging
 *
 * Dependencies:
 * - pino (Logger type)
 */
import type { Logger } from 'pino';
import type { LoggerInstance } from 'next-auth';

/**
 * Builds a NextAuth-compatible logger that delegates to the application's
 * Pino structured logger. Extracts NextAuth-specific metadata from error
 * objects that would otherwise be lost with default console logging.
 *
 * @param pinoLogger - The Pino child logger to delegate to.
 * @returns A partial LoggerInstance compatible with NextAuth's logger option.
 *
 * @example
 * ```ts
 * const log = createLogger('next-auth');
 * const authOptions = { logger: buildNextAuthLogger(log) };
 * ```
 */
export function buildNextAuthLogger(pinoLogger: Logger): Partial<LoggerInstance> {
  return {
    error(code: string, metadata: Error | { error: Error; [key: string]: unknown }) {
      if (metadata instanceof Error) {
        pinoLogger.error(
          {
            code,
            errorName: metadata.name,
            errorMessage: metadata.message,
            stack: metadata.stack,
          },
          'NextAuth internal error'
        );
      } else {
        const cause = metadata.error;
        const extraFields = Object.fromEntries(
          Object.entries(metadata).filter(([key]) => key !== 'error')
        );

        pinoLogger.error(
          {
            code,
            errorName: cause?.name ?? 'unknown',
            errorMessage: cause?.message ?? '',
            stack: cause?.stack,
            ...extraFields,
          },
          'NextAuth internal error (verbose)'
        );
      }
    },

    warn(code) {
      pinoLogger.warn({ code }, 'NextAuth warning');
    },

    debug(code: string, metadata: unknown) {
      pinoLogger.debug({ code, metadata }, 'NextAuth debug');
    },
  };
}
