/**
 * Unit tests for the Prisma slow query instrumentation.
 *
 * Verifies that queries exceeding the configured duration threshold
 * are logged at WARN level with model, operation, and timing details.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logSlowQuery, SLOW_QUERY_THRESHOLD_MS } from '@/lib/db-instrumentation';
import type pino from 'pino';

/** Creates a mock Pino logger with spy methods. */
function createMockLogger() {
  return {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as pino.Logger;
}

describe('logSlowQuery', () => {
  let mockLogger: pino.Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('does not log when duration is below threshold', () => {
    logSlowQuery('AuditBrief', 'findMany', SLOW_QUERY_THRESHOLD_MS - 1, mockLogger);

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('does not log when duration equals threshold', () => {
    logSlowQuery('AuditBrief', 'findMany', SLOW_QUERY_THRESHOLD_MS, mockLogger);

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('logs a warning when duration exceeds threshold', () => {
    logSlowQuery('AuditBrief', 'findMany', SLOW_QUERY_THRESHOLD_MS + 1, mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('includes model, operation, duration_ms, and threshold_ms in the log', () => {
    logSlowQuery('User', 'create', 1200, mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      {
        model: 'User',
        operation: 'create',
        duration_ms: 1200,
        threshold_ms: SLOW_QUERY_THRESHOLD_MS,
      },
      'Slow query detected'
    );
  });

  it('accepts a custom threshold via parameter', () => {
    // With custom threshold of 100ms, a 150ms query should trigger
    logSlowQuery('Bookmark', 'findMany', 150, mockLogger, 100);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'Bookmark',
        duration_ms: 150,
        threshold_ms: 100,
      }),
      'Slow query detected'
    );
  });

  it('does not log when duration is below custom threshold', () => {
    logSlowQuery('Bookmark', 'findMany', 50, mockLogger, 100);

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});

describe('SLOW_QUERY_THRESHOLD_MS', () => {
  it('has a sensible default value', () => {
    expect(SLOW_QUERY_THRESHOLD_MS).toBeGreaterThan(0);
    expect(typeof SLOW_QUERY_THRESHOLD_MS).toBe('number');
  });
});
