/**
 * Tests for the health check API endpoint.
 *
 * Verifies:
 * - Returns 200 with correct JSON shape
 * - Includes status, timestamp, and version fields
 */
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  it('includes a valid ISO timestamp', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toBeDefined();
    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });

  it('includes version string', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.version).toBeDefined();
    expect(typeof body.version).toBe('string');
  });
});
