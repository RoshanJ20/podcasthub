/**
 * Unit tests for the API error handling module.
 *
 * Key responsibilities:
 * - Verifies ApiError construction with and without optional details
 * - Verifies createErrorResponse returns correct HTTP status and JSON body
 * - Verifies request_id inclusion when provided
 * - Verifies all factory functions produce correct status codes and error codes
 */
import { describe, it, expect } from 'vitest';
import {
  ApiError,
  ErrorCode,
  createErrorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  validationFailed,
  rateLimited,
  internalError,
} from '@/lib/api/errors';

describe('ApiError', () => {
  it('constructs with status, errorCode, and message', () => {
    const error = new ApiError(404, ErrorCode.NOT_FOUND, 'Resource not found');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.errorCode).toBe(ErrorCode.NOT_FOUND);
    expect(error.message).toBe('Resource not found');
    expect(error.details).toBeUndefined();
  });

  it('constructs with optional details', () => {
    const details = { field: 'email', issue: 'invalid format' };
    const error = new ApiError(400, ErrorCode.VALIDATION_FAILED, 'Validation error', details);

    expect(error.status).toBe(400);
    expect(error.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
    expect(error.message).toBe('Validation error');
    expect(error.details).toEqual(details);
  });

  it('has the correct name property', () => {
    const error = new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Server error');
    expect(error.name).toBe('ApiError');
  });
});

describe('ErrorCode', () => {
  it('contains all expected error codes', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });
});

describe('createErrorResponse', () => {
  it('returns a NextResponse with correct status and JSON body', async () => {
    const error = new ApiError(404, ErrorCode.NOT_FOUND, 'Podcast not found');
    const response = createErrorResponse(error);

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toEqual({
      status: 404,
      error_code: 'NOT_FOUND',
      message: 'Podcast not found',
    });
  });

  it('includes details in response body when present on the error', async () => {
    const details = [{ field: 'title', message: 'is required' }];
    const error = new ApiError(400, ErrorCode.VALIDATION_FAILED, 'Validation failed', details);
    const response = createErrorResponse(error);

    const body = await response.json();
    expect(body.details).toEqual(details);
  });

  it('includes request_id when provided', async () => {
    const error = new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Server error');
    const response = createErrorResponse(error, 'req-abc-123');

    const body = await response.json();
    expect(body.request_id).toBe('req-abc-123');
  });

  it('omits request_id when not provided', async () => {
    const error = new ApiError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
    const response = createErrorResponse(error);

    const body = await response.json();
    expect(body).not.toHaveProperty('request_id');
  });

  it('omits details when not present on the error', async () => {
    const error = new ApiError(403, ErrorCode.FORBIDDEN, 'Access denied');
    const response = createErrorResponse(error);

    const body = await response.json();
    expect(body).not.toHaveProperty('details');
  });
});

describe('factory functions', () => {
  it('badRequest returns status 400 with BAD_REQUEST error code', () => {
    const error = badRequest('Invalid input');
    expect(error.status).toBe(400);
    expect(error.errorCode).toBe(ErrorCode.BAD_REQUEST);
    expect(error.message).toBe('Invalid input');
  });

  it('badRequest accepts optional details', () => {
    const details = { field: 'name' };
    const error = badRequest('Invalid input', details);
    expect(error.details).toEqual(details);
  });

  it('unauthorized returns status 401 with UNAUTHORIZED error code', () => {
    const error = unauthorized();
    expect(error.status).toBe(401);
    expect(error.errorCode).toBe(ErrorCode.UNAUTHORIZED);
    expect(error.message).toBe('Unauthorized');
  });

  it('unauthorized accepts custom message', () => {
    const error = unauthorized('Token expired');
    expect(error.message).toBe('Token expired');
  });

  it('forbidden returns status 403 with FORBIDDEN error code', () => {
    const error = forbidden();
    expect(error.status).toBe(403);
    expect(error.errorCode).toBe(ErrorCode.FORBIDDEN);
    expect(error.message).toBe('Forbidden');
  });

  it('forbidden accepts custom message', () => {
    const error = forbidden('Admin access required');
    expect(error.message).toBe('Admin access required');
  });

  it('notFound returns status 404 with NOT_FOUND error code', () => {
    const error = notFound('Podcast');
    expect(error.status).toBe(404);
    expect(error.errorCode).toBe(ErrorCode.NOT_FOUND);
    expect(error.message).toBe('Podcast not found');
  });

  it('validationFailed returns status 422 with VALIDATION_FAILED error code', () => {
    const details = [{ field: 'email', message: 'is required' }];
    const error = validationFailed(details);
    expect(error.status).toBe(422);
    expect(error.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual(details);
  });

  it('rateLimited returns status 429 with RATE_LIMITED error code', () => {
    const error = rateLimited();
    expect(error.status).toBe(429);
    expect(error.errorCode).toBe(ErrorCode.RATE_LIMITED);
    expect(error.message).toBe('Too many requests');
  });

  it('rateLimited accepts custom message', () => {
    const error = rateLimited('Slow down');
    expect(error.message).toBe('Slow down');
  });

  it('internalError returns status 500 with INTERNAL_ERROR error code', () => {
    const error = internalError();
    expect(error.status).toBe(500);
    expect(error.errorCode).toBe(ErrorCode.INTERNAL_ERROR);
    expect(error.message).toBe('Internal server error');
  });

  it('internalError accepts custom message', () => {
    const error = internalError('Database connection failed');
    expect(error.message).toBe('Database connection failed');
  });
});
