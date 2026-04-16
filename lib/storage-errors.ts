/**
 * Azure Blob Storage error classification for structured terminal logging.
 *
 * Key responsibilities:
 * - Classifies Azure SDK RestError instances into operator-friendly categories
 * - Maps HTTP status codes and Azure error codes to actionable diagnoses
 * - Redacts sensitive data (AccountKey, SAS signatures) from error messages
 * - Provides a pure, side-effect-free interface for error analysis
 *
 * Dependencies:
 * - @azure/storage-blob (RestError type)
 *
 * @example
 * import { classifyStorageError } from '@/lib/storage-errors';
 *
 * try {
 *   await uploadBuffer(key, buffer, contentType);
 * } catch (error) {
 *   const info = classifyStorageError(error);
 *   logger.error({ ...info, blob_key: key }, 'Storage operation failed');
 * }
 */
import { RestError } from '@azure/storage-blob';

/** Operator-friendly error category for quick pm2 triage. */
export type StorageErrorCategory =
  | 'config_missing'
  | 'config_malformed'
  | 'network_unreachable'
  | 'blob_not_found'
  | 'permission_denied'
  | 'request_timeout'
  | 'throttled'
  | 'container_error'
  | 'content_too_large'
  | 'unknown';

/**
 * Classified storage error with all fields needed for structured logging.
 *
 * Every field is safe to log — no secrets, connection strings, or SAS tokens.
 */
export interface StorageErrorInfo {
  /** Operator-friendly error category for quick pm2 triage. */
  category: StorageErrorCategory;
  /** HTTP status code from Azure, if the error originated from a REST call. */
  azure_status_code?: number;
  /** Azure error code (e.g., 'BlobNotFound', 'AuthorizationFailure'). */
  azure_error_code?: string;
  /** Azure x-ms-request-id for filing support tickets. */
  azure_request_id?: string;
  /** Original error message, sanitized of secrets. */
  message: string;
  /** Whether this error is typically transient and worth retrying. */
  is_retryable: boolean;
}

/** Azure error codes that indicate permission/auth failures. */
const PERMISSION_CODES = new Set([
  'AuthorizationFailure',
  'AuthorizationPermissionMismatch',
  'AuthenticationFailed',
]);

/** Network-related patterns in error messages. */
const NETWORK_ERROR_PATTERNS = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ENETUNREACH|ECONNRESET/;

/**
 * Classifies an Azure SDK error into an operator-friendly category.
 *
 * Inspects RestError properties (statusCode, code, message) to determine
 * the root cause. Falls back to message-pattern matching for plain Errors
 * (e.g., missing AZURE_BLOB_CONNECTION_STRING).
 *
 * @param error - The caught error from any Azure Blob Storage operation
 * @returns Classified error info safe for structured logging
 */
export function classifyStorageError(error: unknown): StorageErrorInfo {
  if (error instanceof RestError) {
    return classifyRestError(error);
  }

  if (error instanceof Error) {
    return classifyPlainError(error);
  }

  return {
    category: 'unknown',
    message: typeof error === 'string' ? error : 'unknown error',
    is_retryable: false,
  };
}

/**
 * Classifies an Azure SDK RestError by status code and error code.
 *
 * @param error - The Azure SDK RestError instance
 * @returns Classified error info with Azure-specific metadata
 */
function classifyRestError(error: RestError): StorageErrorInfo {
  const base: Pick<
    StorageErrorInfo,
    'azure_status_code' | 'azure_error_code' | 'azure_request_id' | 'message'
  > = {
    azure_status_code: error.statusCode,
    azure_error_code: error.code,
    azure_request_id: extractRequestId(error),
    message: redactConnectionString(error.message),
  };

  if (error.statusCode === 404) {
    return { ...base, category: 'blob_not_found', is_retryable: false };
  }

  if (error.statusCode === 403 || PERMISSION_CODES.has(error.code ?? '')) {
    return { ...base, category: 'permission_denied', is_retryable: false };
  }

  if (error.statusCode === 429 || error.statusCode === 503 || error.code === 'ServerBusy') {
    return { ...base, category: 'throttled', is_retryable: true };
  }

  if (error.statusCode === 408) {
    return { ...base, category: 'request_timeout', is_retryable: true };
  }

  if (error.statusCode === 413) {
    return { ...base, category: 'content_too_large', is_retryable: false };
  }

  if (error.code === 'REQUEST_SEND_ERROR' || error.code === 'PARSE_ERROR') {
    return { ...base, category: 'network_unreachable', is_retryable: true };
  }

  if (NETWORK_ERROR_PATTERNS.test(error.message)) {
    return { ...base, category: 'network_unreachable', is_retryable: true };
  }

  return { ...base, category: 'unknown', is_retryable: false };
}

/**
 * Classifies a plain Error by message pattern matching.
 *
 * Detects configuration errors thrown by the storage client bootstrap
 * (missing or malformed AZURE_BLOB_CONNECTION_STRING).
 *
 * @param error - A plain Error (not a RestError)
 * @returns Classified error info without Azure-specific metadata
 */
function classifyPlainError(error: Error): StorageErrorInfo {
  const message = redactConnectionString(error.message);

  if (message.includes('AZURE_BLOB_CONNECTION_STRING') && !message.includes('AccountName')) {
    return { category: 'config_missing', message, is_retryable: false };
  }

  if (message.includes('AccountName') || message.includes('AccountKey')) {
    return { category: 'config_malformed', message, is_retryable: false };
  }

  if (NETWORK_ERROR_PATTERNS.test(message)) {
    return { category: 'network_unreachable', message, is_retryable: true };
  }

  return { category: 'unknown', message, is_retryable: false };
}

/**
 * Extracts the Azure x-ms-request-id from a RestError's response headers.
 *
 * @param error - The Azure SDK RestError instance
 * @returns The request ID string, or undefined if not available
 */
function extractRequestId(error: RestError): string | undefined {
  return error.response?.headers?.get?.('x-ms-request-id') ?? undefined;
}

/**
 * Redacts sensitive values from a string before logging.
 *
 * Replaces Azure AccountKey values and SAS signature parameters with '***'
 * to prevent secrets from appearing in terminal logs.
 *
 * @param value - The string that may contain sensitive data
 * @returns The string with AccountKey and sig values replaced
 */
export function redactConnectionString(value: string): string {
  return value.replace(/AccountKey=[^;]*/g, 'AccountKey=***').replace(/sig=[^&]*/g, 'sig=***');
}
