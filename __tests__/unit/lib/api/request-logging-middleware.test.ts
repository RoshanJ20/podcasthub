/**
 * Unit tests for the request logging middleware wrapper.
 *
 * Verifies request entry/completion logging, error handling,
 * correlation ID propagation, and response header stamping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';
import { ApiError, ErrorCode } from '@/lib/api/errors';

/** Mock logger methods. */
const mockInfo = vi.fn();
const mockWarn = vi.fn();
const mockError = vi.fn();

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
    bindings: () => ({ request_id: 'test-req-id' }),
  }),
}));

/** Creates a NextRequest with correlation headers. */
function createRequest(
  method = 'GET',
  path = '/api/test',
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: {
      'x-request-id': 'req-test-123',
      'x-request-start': Date.now().toString(),
      ...headers,
    },
  });
}

describe('withRequestLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the inner handler and returns its response', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRequestLogging(handler);

    const response = await wrapped(createRequest());
    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it('sets x-request-id on the response headers', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRequestLogging(handler);

    const response = await wrapped(createRequest());
    expect(response.headers.get('x-request-id')).toBe('req-test-123');
  });

  it('logs request received at INFO level', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRequestLogging(handler);

    await wrapped(createRequest('POST', '/api/podcasts'));

    expect(mockInfo).toHaveBeenCalledWith('Request received');
  });

  it('logs request completed at INFO level with status and duration', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }, { status: 201 }));
    const wrapped = withRequestLogging(handler);

    await wrapped(createRequest());

    // Second info call should be the completion log
    const completionCall = mockInfo.mock.calls.find(
      (call) => typeof call[0] === 'object' && 'status' in call[0]
    );
    expect(completionCall).toBeDefined();
    expect(completionCall![0].status).toBe(201);
    expect(typeof completionCall![0].duration_ms).toBe('number');
    expect(completionCall![1]).toBe('Request completed');
  });

  it('handles thrown ApiError with WARN log and error response with request_id', async () => {
    const handler = vi
      .fn()
      .mockRejectedValue(new ApiError(404, ErrorCode.NOT_FOUND, 'Podcast not found'));
    const wrapped = withRequestLogging(handler);

    const response = await wrapped(createRequest());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error_code).toBe('NOT_FOUND');
    expect(body.request_id).toBe('req-test-123');

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404, error_code: 'NOT_FOUND' }),
      'Request failed'
    );
  });

  it('handles unknown thrown errors with ERROR log and 500 response with request_id', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('DB connection lost'));
    const wrapped = withRequestLogging(handler);

    const response = await wrapped(createRequest());

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error_code).toBe('INTERNAL_ERROR');
    expect(body.request_id).toBeDefined();

    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      'Unhandled error'
    );
  });

  it('passes additional route arguments through to the handler', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRequestLogging(handler);

    const req = createRequest();
    const extraArg = { params: { id: '123' } };
    await wrapped(req, extraArg);

    expect(handler).toHaveBeenCalledWith(req, extraArg);
  });

  it('does not crash when x-request-start header is missing', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRequestLogging(handler);

    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-request-id': 'req-no-start' },
    });

    const response = await wrapped(req);
    expect(response.status).toBe(200);
    expect(mockInfo).toHaveBeenCalled();
  });
});
