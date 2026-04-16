/**
 * Unit tests for Azure Blob Storage error classification.
 *
 * Verifies that classifyStorageError correctly maps Azure SDK RestError
 * instances and plain Error objects into operator-friendly categories
 * for structured terminal logging.
 *
 * @see lib/storage-errors.ts
 */
import { describe, it, expect } from 'vitest';
import { RestError } from '@azure/storage-blob';
import { classifyStorageError, redactConnectionString } from '@/lib/storage-errors';
import type { StorageErrorInfo } from '@/lib/storage-errors';

describe('classifyStorageError', () => {
  describe('Azure RestError classification', () => {
    it('classifies 404 BlobNotFound as blob_not_found', () => {
      const error = new RestError('BlobNotFound', {
        statusCode: 404,
        code: 'BlobNotFound',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('blob_not_found');
      expect(result.azure_status_code).toBe(404);
      expect(result.azure_error_code).toBe('BlobNotFound');
      expect(result.is_retryable).toBe(false);
    });

    it('classifies 404 ContainerNotFound as blob_not_found', () => {
      const error = new RestError('ContainerNotFound', {
        statusCode: 404,
        code: 'ContainerNotFound',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('blob_not_found');
      expect(result.azure_status_code).toBe(404);
      expect(result.is_retryable).toBe(false);
    });

    it('classifies 403 AuthorizationFailure as permission_denied', () => {
      const error = new RestError('AuthorizationFailure', {
        statusCode: 403,
        code: 'AuthorizationFailure',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('permission_denied');
      expect(result.azure_status_code).toBe(403);
      expect(result.azure_error_code).toBe('AuthorizationFailure');
      expect(result.is_retryable).toBe(false);
    });

    it('classifies 403 AuthorizationPermissionMismatch as permission_denied', () => {
      const error = new RestError('AuthorizationPermissionMismatch', {
        statusCode: 403,
        code: 'AuthorizationPermissionMismatch',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('permission_denied');
    });

    it('classifies 403 AuthenticationFailed as permission_denied', () => {
      const error = new RestError('AuthenticationFailed', {
        statusCode: 403,
        code: 'AuthenticationFailed',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('permission_denied');
    });

    it('classifies 429 ServerBusy as throttled', () => {
      const error = new RestError('ServerBusy', {
        statusCode: 429,
        code: 'ServerBusy',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('throttled');
      expect(result.azure_status_code).toBe(429);
      expect(result.is_retryable).toBe(true);
    });

    it('classifies 503 ServerBusy as throttled', () => {
      const error = new RestError('ServerBusy', {
        statusCode: 503,
        code: 'ServerBusy',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('throttled');
      expect(result.is_retryable).toBe(true);
    });

    it('classifies 408 request timeout as request_timeout', () => {
      const error = new RestError('Request timed out', {
        statusCode: 408,
        code: 'REQUEST_SEND_ERROR',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('request_timeout');
      expect(result.is_retryable).toBe(true);
    });

    it('classifies REQUEST_SEND_ERROR without 408 as network_unreachable', () => {
      const error = new RestError('connect ECONNREFUSED 127.0.0.1:10000', {
        code: 'REQUEST_SEND_ERROR',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('network_unreachable');
      expect(result.azure_error_code).toBe('REQUEST_SEND_ERROR');
      expect(result.is_retryable).toBe(true);
    });

    it('classifies PARSE_ERROR as network_unreachable', () => {
      const error = new RestError('Unable to parse response', {
        code: 'PARSE_ERROR',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('network_unreachable');
      expect(result.is_retryable).toBe(true);
    });

    it('classifies 413 as content_too_large', () => {
      const error = new RestError('Request body too large', {
        statusCode: 413,
        code: 'RequestBodyTooLarge',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('content_too_large');
      expect(result.is_retryable).toBe(false);
    });

    it('classifies ECONNREFUSED in message as network_unreachable', () => {
      const error = new RestError('connect ECONNREFUSED 127.0.0.1:10000', {
        statusCode: undefined,
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('network_unreachable');
      expect(result.is_retryable).toBe(true);
    });

    it('classifies ETIMEDOUT in message as network_unreachable', () => {
      const error = new RestError('connect ETIMEDOUT 20.150.34.12:443', {
        statusCode: undefined,
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('network_unreachable');
      expect(result.is_retryable).toBe(true);
    });

    it('classifies unrecognized RestError as unknown', () => {
      const error = new RestError('Something unexpected', {
        statusCode: 500,
        code: 'InternalError',
      });

      const result = classifyStorageError(error);

      expect(result.category).toBe('unknown');
      expect(result.azure_status_code).toBe(500);
      expect(result.azure_error_code).toBe('InternalError');
      expect(result.is_retryable).toBe(false);
    });
  });

  describe('plain Error classification', () => {
    it('classifies missing connection string error as config_missing', () => {
      const error = new Error('AZURE_BLOB_CONNECTION_STRING is required for SAS URL generation');

      const result = classifyStorageError(error);

      expect(result.category).toBe('config_missing');
      expect(result.is_retryable).toBe(false);
    });

    it('classifies AccountName parse error as config_malformed', () => {
      const error = new Error(
        'Cannot parse AccountName/AccountKey from AZURE_BLOB_CONNECTION_STRING'
      );

      const result = classifyStorageError(error);

      expect(result.category).toBe('config_malformed');
      expect(result.is_retryable).toBe(false);
    });

    it('classifies unknown plain Error as unknown', () => {
      const error = new Error('Something completely unexpected');

      const result = classifyStorageError(error);

      expect(result.category).toBe('unknown');
      expect(result.message).toBe('Something completely unexpected');
      expect(result.is_retryable).toBe(false);
    });
  });

  describe('non-Error classification', () => {
    it('classifies string errors as unknown', () => {
      const result = classifyStorageError('string error');

      expect(result.category).toBe('unknown');
      expect(result.message).toBe('string error');
      expect(result.is_retryable).toBe(false);
    });

    it('classifies null/undefined as unknown', () => {
      const result = classifyStorageError(null);

      expect(result.category).toBe('unknown');
      expect(result.message).toBe('unknown error');
      expect(result.is_retryable).toBe(false);
    });

    it('classifies objects as unknown', () => {
      const result = classifyStorageError({ code: 123 });

      expect(result.category).toBe('unknown');
      expect(result.is_retryable).toBe(false);
    });
  });

  describe('result shape', () => {
    it('includes all required fields for RestError', () => {
      const error = new RestError('BlobNotFound', {
        statusCode: 404,
        code: 'BlobNotFound',
      });

      const result = classifyStorageError(error);

      expect(result).toEqual<StorageErrorInfo>({
        category: 'blob_not_found',
        azure_status_code: 404,
        azure_error_code: 'BlobNotFound',
        azure_request_id: undefined,
        message: 'BlobNotFound',
        is_retryable: false,
      });
    });

    it('omits azure fields for plain Errors', () => {
      const error = new Error('Something broke');

      const result = classifyStorageError(error);

      expect(result.azure_status_code).toBeUndefined();
      expect(result.azure_error_code).toBeUndefined();
      expect(result.azure_request_id).toBeUndefined();
    });
  });
});

describe('redactConnectionString', () => {
  it('redacts AccountKey from connection string', () => {
    const input =
      'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=abc123secret==;EndpointSuffix=core.windows.net';

    const result = redactConnectionString(input);

    expect(result).toBe(
      'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=***;EndpointSuffix=core.windows.net'
    );
    expect(result).not.toContain('abc123secret');
  });

  it('redacts SAS sig parameter', () => {
    const input =
      'https://myaccount.blob.core.windows.net/container/blob?sv=2021-06-08&sig=abcSecretSignature123&sp=r';

    const result = redactConnectionString(input);

    expect(result).toContain('sig=***');
    expect(result).not.toContain('abcSecretSignature123');
  });

  it('redacts both AccountKey and sig when present', () => {
    const input = 'AccountKey=secret123==;sig=signatureABC';

    const result = redactConnectionString(input);

    expect(result).toContain('AccountKey=***');
    expect(result).toContain('sig=***');
    expect(result).not.toContain('secret123');
    expect(result).not.toContain('signatureABC');
  });

  it('returns input unchanged when no secrets present', () => {
    const input = 'just a normal error message';

    const result = redactConnectionString(input);

    expect(result).toBe('just a normal error message');
  });

  it('handles empty string', () => {
    expect(redactConnectionString('')).toBe('');
  });
});
