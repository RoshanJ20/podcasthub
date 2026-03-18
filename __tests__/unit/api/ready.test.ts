/**
 * Tests for the readiness check API endpoint.
 *
 * Verifies:
 * - Returns 200 with database check passing
 * - Returns 503 when database is unreachable
 * - Response includes structured check results
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Hoisted mocks — available before vi.mock factories run. */
const { mockQueryRaw, mockError } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: mockError,
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { GET } from '@/app/api/ready/route';

describe('GET /api/ready', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with status ready when database is reachable', async () => {
    mockQueryRaw.mockResolvedValue([{ result: 1 }]);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ready');
    expect(body.checks.database).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('returns 503 when database query fails', async () => {
    mockQueryRaw.mockRejectedValue(new Error('Connection refused'));

    const response = await GET();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.status).toBe('not_ready');
    expect(body.checks.database).toBe('failed');
  });

  it('logs an error when database check fails', async () => {
    mockQueryRaw.mockRejectedValue(new Error('Connection refused'));

    await GET();

    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      'Readiness check failed'
    );
  });

  it('includes a valid ISO timestamp in success response', async () => {
    mockQueryRaw.mockResolvedValue([{ result: 1 }]);

    const response = await GET();
    const body = await response.json();

    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });
});
