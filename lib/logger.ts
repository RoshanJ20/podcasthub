/**
 * Structured logging for Podcast Hub v2 using Pino.
 *
 * Key responsibilities:
 * - Provides structured JSON logging for production
 * - Pretty-prints logs in development
 * - Supports child loggers with scoped context
 *
 * @example
 * import { createLogger } from '@/lib/logger';
 * const log = createLogger('podcasts-api');
 * log.info({ podcastId: '123' }, 'Podcast created');
 */
import pino from 'pino';

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
    service_name: 'podcast-hub-v2',
  },
});

/**
 * Creates a child logger with a context label.
 *
 * @param context - A label identifying the module or feature (e.g., 'auth', 'podcasts-api')
 * @returns A Pino child logger instance with the context attached
 */
export function createLogger(context: string): pino.Logger {
  return logger.child({ context });
}
