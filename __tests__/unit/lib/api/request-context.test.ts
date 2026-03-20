/**
 * Unit tests for the request context extraction utility.
 *
 * Verifies extraction of correlation ID, user identity, timing,
 * and request metadata from Next.js request headers.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { extractRequestContext } from '@/lib/api/request-context';

/** Creates a NextRequest with the given headers. */
function createRequest(
  headers: Record<string, string> = {},
  method = 'GET',
  path = '/api/test'
): NextRequest {
  const h = new Headers(headers);
  return new NextRequest(`http://localhost:3000${path}`, { method, headers: h });
}

describe('extractRequestContext', () => {
  it('extracts all fields when all headers are present', () => {
    const ctx = extractRequestContext(
      createRequest(
        {
          'x-request-id': 'req-123',
          'x-user-id': 'user-456',
          'x-user-role': 'admin',
          'x-request-start': '1710000000000',
          'x-forwarded-for': '192.168.1.1',
        },
        'POST',
        '/api/audit-briefs'
      )
    );

    expect(ctx.requestId).toBe('req-123');
    expect(ctx.userId).toBe('user-456');
    expect(ctx.userRole).toBe('admin');
    expect(ctx.method).toBe('POST');
    expect(ctx.path).toBe('/api/audit-briefs');
    expect(ctx.ip).toBe('192.168.1.1');
    expect(ctx.requestStart).toBe(1710000000000);
  });

  it('returns null for missing optional headers', () => {
    const ctx = extractRequestContext(createRequest({ 'x-request-id': 'req-123' }));

    expect(ctx.requestId).toBe('req-123');
    expect(ctx.userId).toBeNull();
    expect(ctx.userRole).toBeNull();
    expect(ctx.requestStart).toBeNull();
  });

  it('generates a fallback requestId when header is missing', () => {
    const ctx = extractRequestContext(createRequest());

    expect(ctx.requestId).toBeDefined();
    expect(ctx.requestId.length).toBeGreaterThan(0);
    // Should be a valid UUID format
    expect(ctx.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generates unique fallback requestIds for different requests', () => {
    const ctx1 = extractRequestContext(createRequest());
    const ctx2 = extractRequestContext(createRequest());

    expect(ctx1.requestId).not.toBe(ctx2.requestId);
  });

  it('extracts IP from x-forwarded-for header', () => {
    const ctx = extractRequestContext(createRequest({ 'x-forwarded-for': '10.0.0.1' }));
    expect(ctx.ip).toBe('10.0.0.1');
  });

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const ctx = extractRequestContext(createRequest({ 'x-real-ip': '10.0.0.2' }));
    expect(ctx.ip).toBe('10.0.0.2');
  });

  it('returns "unknown" when no IP headers are present', () => {
    const ctx = extractRequestContext(createRequest());
    expect(ctx.ip).toBe('unknown');
  });

  it('parses x-request-start as a number', () => {
    const ctx = extractRequestContext(createRequest({ 'x-request-start': '1710000000000' }));
    expect(ctx.requestStart).toBe(1710000000000);
    expect(typeof ctx.requestStart).toBe('number');
  });

  it('returns null for invalid x-request-start', () => {
    const ctx = extractRequestContext(createRequest({ 'x-request-start': 'not-a-number' }));
    expect(ctx.requestStart).toBeNull();
  });

  it('extracts method and path correctly', () => {
    const ctx = extractRequestContext(createRequest({}, 'DELETE', '/api/bookmarks/123'));
    expect(ctx.method).toBe('DELETE');
    expect(ctx.path).toBe('/api/bookmarks/123');
  });
});
