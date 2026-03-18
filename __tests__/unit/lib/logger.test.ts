/**
 * Unit tests for the structured logger module.
 *
 * Verifies that createLogger and createRequestLogger produce
 * child loggers with the correct context bindings.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { createLogger, createRequestLogger } from '@/lib/logger';

describe('createLogger', () => {
  it('returns a logger with context binding', () => {
    const log = createLogger('test-module');
    // Pino child loggers store bindings internally
    const bindings = log.bindings();
    expect(bindings.context).toBe('test-module');
  });
});

describe('createRequestLogger', () => {
  it('returns a logger with request_id in bindings', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-request-id': 'req-abc-123' },
    });
    const log = createRequestLogger('api', request);
    const bindings = log.bindings();

    expect(bindings.request_id).toBe('req-abc-123');
    expect(bindings.context).toBe('api');
  });

  it('includes user_id when x-user-id header is present', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-request-id': 'req-123',
        'x-user-id': 'user-456',
        'x-user-role': 'admin',
      },
    });
    const log = createRequestLogger('api', request);
    const bindings = log.bindings();

    expect(bindings.user_id).toBe('user-456');
    expect(bindings.user_role).toBe('admin');
  });

  it('omits user_id and user_role when headers are absent', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-request-id': 'req-123' },
    });
    const log = createRequestLogger('api', request);
    const bindings = log.bindings();

    expect(bindings).not.toHaveProperty('user_id');
    expect(bindings).not.toHaveProperty('user_role');
  });

  it('includes method and path in bindings', () => {
    const request = new NextRequest('http://localhost:3000/api/podcasts', {
      method: 'POST',
      headers: { 'x-request-id': 'req-123' },
    });
    const log = createRequestLogger('api', request);
    const bindings = log.bindings();

    expect(bindings.method).toBe('POST');
    expect(bindings.path).toBe('/api/podcasts');
  });

  it('generates a fallback request_id when header is missing', () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    const log = createRequestLogger('api', request);
    const bindings = log.bindings();

    expect(bindings.request_id).toBeDefined();
    expect(bindings.request_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
