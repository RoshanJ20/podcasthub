/**
 * Unit tests for the Azure Blob Storage logging wrapper.
 *
 * Verifies:
 * - withStorageLogging logs info on success with operation, blob_key, duration_ms
 * - withStorageLogging logs error on failure with classified error info
 * - withStorageLogging logs warn (not error) for blob_not_found and throttled
 * - withStorageLogging re-throws the original error
 * - withStorageLogging returns the original value on success
 * - logStorageInit logs info when connection string is present
 * - logStorageInit logs warn when connection string is missing
 *
 * @see lib/storage-logger.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestError } from '@azure/storage-blob';

const { mockDebug, mockInfo, mockWarn, mockError } = vi.hoisted(() => ({
  mockDebug: vi.fn(),
  mockInfo: vi.fn(),
  mockWarn: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn().mockReturnValue({
    debug: mockDebug,
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
  }),
}));

import { withStorageLogging, logStorageInit } from '@/lib/storage-logger';

describe('withStorageLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the value from the wrapped function on success', async () => {
    const result = await withStorageLogging('upload', 'audio/test.mp3', async () => 'ok');

    expect(result).toBe('ok');
  });

  it('logs debug on entry with operation and blob_key', async () => {
    await withStorageLogging('upload', 'audio/test.mp3', async () => undefined);

    expect(mockDebug).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'upload',
        blob_key: 'audio/test.mp3',
      }),
      'Storage operation started'
    );
  });

  it('logs info on success with operation, blob_key, and duration_ms', async () => {
    await withStorageLogging('upload', 'audio/test.mp3', async () => undefined);

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'upload',
        blob_key: 'audio/test.mp3',
        duration_ms: expect.any(Number),
      }),
      'Storage operation completed'
    );
  });

  it('includes extra fields in success log', async () => {
    await withStorageLogging('upload', 'key', async () => undefined, {
      content_length: 1024,
      content_type: 'audio/mpeg',
    });

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        content_length: 1024,
        content_type: 'audio/mpeg',
      }),
      'Storage operation completed'
    );
  });

  it('logs error on failure with classified error info', async () => {
    const azureError = new RestError('AuthorizationFailure', {
      statusCode: 403,
      code: 'AuthorizationFailure',
    });

    await expect(
      withStorageLogging('download', 'audio/test.mp3', async () => {
        throw azureError;
      })
    ).rejects.toThrow(azureError);

    expect(mockError).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'download',
        blob_key: 'audio/test.mp3',
        category: 'permission_denied',
        azure_status_code: 403,
        duration_ms: expect.any(Number),
      }),
      'Storage operation failed'
    );
  });

  it('logs warn (not error) for blob_not_found', async () => {
    const notFoundError = new RestError('BlobNotFound', {
      statusCode: 404,
      code: 'BlobNotFound',
    });

    await expect(
      withStorageLogging('stream', 'audio/missing.mp3', async () => {
        throw notFoundError;
      })
    ).rejects.toThrow(notFoundError);

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'stream',
        blob_key: 'audio/missing.mp3',
        category: 'blob_not_found',
      }),
      'Storage operation failed'
    );
    expect(mockError).not.toHaveBeenCalled();
  });

  it('logs warn (not error) for throttled', async () => {
    const throttledError = new RestError('ServerBusy', {
      statusCode: 429,
      code: 'ServerBusy',
    });

    await expect(
      withStorageLogging('upload', 'audio/test.mp3', async () => {
        throw throttledError;
      })
    ).rejects.toThrow(throttledError);

    expect(mockWarn).toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });

  it('re-throws the original error unchanged', async () => {
    const originalError = new Error('original');

    await expect(
      withStorageLogging('delete', 'key', async () => {
        throw originalError;
      })
    ).rejects.toBe(originalError);
  });

  it('handles null blob_key for container-level operations', async () => {
    await withStorageLogging('ensure_container', null, async () => undefined);

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'ensure_container',
        blob_key: null,
      }),
      'Storage operation completed'
    );
  });
});

describe('logStorageInit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs info when connection string is configured', () => {
    process.env.AZURE_BLOB_CONNECTION_STRING =
      'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=abc==;EndpointSuffix=core.windows.net';

    logStorageInit();

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        has_connection_string: true,
        account_name: 'myaccount',
      }),
      'Azure Blob Storage client initialized'
    );
  });

  it('logs warn when connection string is missing', () => {
    delete process.env.AZURE_BLOB_CONNECTION_STRING;

    logStorageInit();

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        has_connection_string: false,
      }),
      'Azure Blob Storage connection string not configured'
    );
  });

  it('includes container name in init log', () => {
    process.env.AZURE_BLOB_CONNECTION_STRING =
      'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key==;EndpointSuffix=core.windows.net';

    logStorageInit();

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        container: expect.any(String),
      }),
      expect.any(String)
    );
  });
});
