/**
 * API error handling utilities for The Audit Brief.
 *
 * Key responsibilities:
 * - Defines a structured ApiError class for consistent error representation
 * - Provides an ErrorCode enum for machine-readable error classification
 * - Offers factory functions for common HTTP error responses
 * - Converts ApiError instances into NextResponse objects with correct status and JSON body
 *
 * Dependencies:
 * - next/server (NextResponse)
 *
 * @example
 * import { notFound, createErrorResponse } from '@/lib/api/errors';
 *
 * export async function GET() {
 *   const auditBrief = await findAuditBrief(id);
 *   if (!auditBrief) {
 *     return createErrorResponse(notFound('AuditBrief'));
 *   }
 * }
 */
import { NextResponse } from 'next/server';

/**
 * Machine-readable error codes for API responses.
 *
 * Each code maps to a specific category of error, enabling clients
 * to handle errors programmatically without parsing messages.
 */
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Structured API error response shape returned to clients.
 *
 * All error responses from the API conform to this interface,
 * ensuring consistent error handling on the client side.
 */
export interface ApiErrorResponse {
  /** HTTP status code */
  status: number;
  /** Machine-readable error code from ErrorCode enum */
  error_code: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional details (e.g., validation errors) */
  details?: unknown;
  /** Optional request ID for tracing and debugging */
  request_id?: string;
}

/**
 * Custom error class for API errors with HTTP status and structured metadata.
 *
 * Extends the native Error class to carry HTTP status codes and
 * machine-readable error codes alongside the human-readable message.
 *
 * @example
 * throw new ApiError(404, ErrorCode.NOT_FOUND, 'Audit brief not found');
 */
export class ApiError extends Error {
  /** HTTP status code (e.g., 400, 401, 404, 500) */
  public readonly status: number;

  /** Machine-readable error code from the ErrorCode enum */
  public readonly errorCode: ErrorCode;

  /** Optional structured details (e.g., field-level validation errors) */
  public readonly details?: unknown;

  /**
   * Creates a new ApiError instance.
   *
   * @param status - HTTP status code
   * @param errorCode - Machine-readable error code from ErrorCode enum
   * @param message - Human-readable error description
   * @param details - Optional additional details for the error response
   */
  constructor(status: number, errorCode: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

/**
 * Converts an ApiError into a NextResponse with the correct JSON body and HTTP status.
 *
 * The response body conforms to the ApiErrorResponse interface. Fields with
 * undefined values (details, request_id) are omitted from the response.
 *
 * @param error - The ApiError to convert into a response
 * @param requestId - Optional request ID for tracing; included in response when provided
 * @returns A NextResponse with JSON body and appropriate HTTP status code
 */
export function createErrorResponse(
  error: ApiError,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    status: error.status,
    error_code: error.errorCode,
    message: error.message,
  };

  if (error.details !== undefined) {
    body.details = error.details;
  }

  if (requestId !== undefined) {
    body.request_id = requestId;
  }

  return NextResponse.json(body, { status: error.status });
}

/**
 * Creates a 400 Bad Request error.
 *
 * @param message - Description of what was wrong with the request
 * @param details - Optional structured details about the bad request
 * @returns An ApiError with status 400 and BAD_REQUEST error code
 */
export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, ErrorCode.BAD_REQUEST, message, details);
}

/**
 * Creates a 401 Unauthorized error.
 *
 * @param message - Optional custom message; defaults to "Unauthorized"
 * @returns An ApiError with status 401 and UNAUTHORIZED error code
 */
export function unauthorized(message: string = 'Unauthorized'): ApiError {
  return new ApiError(401, ErrorCode.UNAUTHORIZED, message);
}

/**
 * Creates a 403 Forbidden error.
 *
 * @param message - Optional custom message; defaults to "Forbidden"
 * @returns An ApiError with status 403 and FORBIDDEN error code
 */
export function forbidden(message: string = 'Forbidden'): ApiError {
  return new ApiError(403, ErrorCode.FORBIDDEN, message);
}

/**
 * Creates a 404 Not Found error for a specific resource type.
 *
 * @param resource - The type of resource that was not found (e.g., "AuditBrief", "User")
 * @returns An ApiError with status 404 and NOT_FOUND error code
 */
export function notFound(resource: string): ApiError {
  return new ApiError(404, ErrorCode.NOT_FOUND, `${resource} not found`);
}

/**
 * Creates a 409 Conflict error.
 *
 * Used when a resource's state prevents the requested operation — for example,
 * optimistic-concurrency failures where another actor has updated the resource
 * since the client last loaded it.
 *
 * @param message - Human-readable description of the conflict
 * @param details - Optional structured details (e.g., expected vs actual version)
 * @returns An ApiError with status 409 and CONFLICT error code
 */
export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError(409, ErrorCode.CONFLICT, message, details);
}

/**
 * Creates a 422 Validation Failed error with structured details.
 *
 * @param details - Structured validation error details (e.g., array of field errors)
 * @returns An ApiError with status 422 and VALIDATION_FAILED error code
 */
export function validationFailed(details: unknown): ApiError {
  return new ApiError(422, ErrorCode.VALIDATION_FAILED, 'Validation failed', details);
}

/**
 * Creates a 429 Rate Limited error.
 *
 * @param message - Optional custom message; defaults to "Too many requests"
 * @returns An ApiError with status 429 and RATE_LIMITED error code
 */
export function rateLimited(message: string = 'Too many requests'): ApiError {
  return new ApiError(429, ErrorCode.RATE_LIMITED, message);
}

/**
 * Creates a 500 Internal Server Error.
 *
 * @param message - Optional custom message; defaults to "Internal server error"
 * @returns An ApiError with status 500 and INTERNAL_ERROR error code
 */
export function internalError(message: string = 'Internal server error'): ApiError {
  return new ApiError(500, ErrorCode.INTERNAL_ERROR, message);
}
