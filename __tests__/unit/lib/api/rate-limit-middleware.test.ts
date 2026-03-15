/**
 * Unit tests for the rate limiting middleware.
 *
 * Covers request allowance, 429 blocking with Retry-After header,
 * X-RateLimit-Remaining header on success, and correct limiter selection
 * per endpoint category.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rate-limit-middleware';

/** Creates a minimal NextRequest with an optional IP header. */
function createRequest(ip?: string): NextRequest {
  const headers = new Headers();
  if (ip) {
    headers.set('x-forwarded-for', ip);
  }
  return new NextRequest('http://localhost:3000/api/test', { headers });
}

/** A simple handler that returns a 200 JSON response. */
async function okHandler(): Promise<NextResponse> {
  return NextResponse.json({ ok: true });
}

describe('withRateLimit', () => {
  it('allows requests under the limit', async () => {
    const handler = withRateLimit('read', okHandler);
    const req = createRequest('10.0.0.1');
    const response = await handler(req);
    expect(response.status).toBe(200);
  });

  it('adds X-RateLimit-Remaining header to successful responses', async () => {
    const handler = withRateLimit('read', okHandler);
    const req = createRequest('10.0.0.2');
    const response = await handler(req);
    const remaining = response.headers.get('X-RateLimit-Remaining');
    expect(remaining).toBeDefined();
    expect(Number(remaining)).toBeGreaterThanOrEqual(0);
  });

  it('returns 429 with Retry-After header when limit is exceeded', async () => {
    // Auth limiter allows 5 requests per 60s
    const handler = withRateLimit('auth', okHandler);
    const ip = '10.0.0.3';

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await handler(createRequest(ip));
    }

    // 6th request should be blocked
    const response = await handler(createRequest(ip));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeDefined();
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('uses correct limiter for each category', async () => {
    // Auth: 5 req/60s — should block on 6th
    const authHandler = withRateLimit('auth', okHandler);
    const authIp = '10.0.0.10';
    for (let i = 0; i < 5; i++) {
      const res = await authHandler(createRequest(authIp));
      expect(res.status).toBe(200);
    }
    const authBlocked = await authHandler(createRequest(authIp));
    expect(authBlocked.status).toBe(429);

    // Write: 20 req/60s — should allow 20 requests
    const writeHandler = withRateLimit('write', okHandler);
    const writeIp = '10.0.0.11';
    for (let i = 0; i < 20; i++) {
      const res = await writeHandler(createRequest(writeIp));
      expect(res.status).toBe(200);
    }
    const writeBlocked = await writeHandler(createRequest(writeIp));
    expect(writeBlocked.status).toBe(429);

    // Search: 30 req/60s — should allow 30 requests
    const searchHandler = withRateLimit('search', okHandler);
    const searchIp = '10.0.0.12';
    for (let i = 0; i < 30; i++) {
      const res = await searchHandler(createRequest(searchIp));
      expect(res.status).toBe(200);
    }
    const searchBlocked = await searchHandler(createRequest(searchIp));
    expect(searchBlocked.status).toBe(429);
  });

  it('falls back to "unknown" when no IP headers are present', async () => {
    const handler = withRateLimit('read', okHandler);
    const req = createRequest(); // no IP
    const response = await handler(req);
    expect(response.status).toBe(200);
  });
});
