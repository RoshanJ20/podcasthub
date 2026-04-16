/**
 * Structured logging wrapper for Azure Blob Storage operations.
 *
 * Key responsibilities:
 * - Provides a withStorageLogging higher-order function that instruments
 *   any async storage operation with entry/exit/error structured logging
 * - Classifies errors using lib/storage-errors.ts for operator-friendly output
 * - Logs at appropriate levels: DEBUG for entry, INFO for success, WARN for
 *   expected failures (404, 429), ERROR for unexpected failures
 * - Provides a one-time init log for startup configuration validation
 *
 * Dependencies:
 * - lib/logger.ts (Pino createLogger)
 * - lib/storage-errors.ts (classifyStorageError)
 * - lib/storage-client.ts (CONTAINER, getConnectionString)
 *
 * @example
 * import { withStorageLogging } from '@/lib/storage-logger';
 *
 * export async function uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
 *   return withStorageLogging('upload', key, async () => {
 *     // ... actual upload logic
 *   }, { content_length: buffer.length });
 * }
 */
import { createLogger } from '@/lib/logger';
import { classifyStorageError } from '@/lib/storage-errors';
import { CONTAINER } from '@/lib/storage-client';

/** Module-level child logger with 'azure-storage' context label. */
const storageLog = createLogger('azure-storage');

/** Error categories that represent expected/transient conditions (WARN, not ERROR). */
const WARN_CATEGORIES = new Set(['blob_not_found', 'throttled']);

/** Tracks whether logStorageInit has been called this process. */
let initLogged = false;

/**
 * Wraps an async storage operation with structured entry/exit/error logging.
 *
 * On success, logs at INFO with operation name, blob key, container, and duration.
 * On failure, classifies the error and logs at WARN (for expected conditions like
 * 404 or 429) or ERROR (for everything else), then re-throws the original error
 * so callers' existing error handling continues to work unchanged.
 *
 * @param operation - Name of the storage operation (e.g., 'upload', 'stream', 'delete')
 * @param blobKey - The blob key being operated on, or null for container-level operations
 * @param fn - The async function to execute and instrument
 * @param extraFields - Optional additional fields to include in the success log
 * @returns The return value of fn
 * @throws Re-throws any error from fn after logging it
 */
export async function withStorageLogging<T>(
  operation: string,
  blobKey: string | null,
  fn: () => Promise<T>,
  extraFields?: Record<string, unknown>
): Promise<T> {
  if (!initLogged) {
    initLogged = true;
    logStorageInit();
  }

  storageLog.debug(
    { operation, blob_key: blobKey, container: CONTAINER },
    'Storage operation started'
  );
  const startTime = Date.now();

  try {
    const result = await fn();
    const durationMs = Date.now() - startTime;

    storageLog.info(
      {
        operation,
        blob_key: blobKey,
        container: CONTAINER,
        duration_ms: durationMs,
        ...extraFields,
      },
      'Storage operation completed'
    );

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorInfo = classifyStorageError(error);

    const logPayload = {
      operation,
      blob_key: blobKey,
      container: CONTAINER,
      duration_ms: durationMs,
      ...errorInfo,
    };

    if (WARN_CATEGORIES.has(errorInfo.category)) {
      storageLog.warn(logPayload, 'Storage operation failed');
    } else {
      storageLog.error(logPayload, 'Storage operation failed');
    }

    throw error;
  }
}

/**
 * Logs Azure Blob Storage configuration state once at process startup.
 *
 * Called when the BlobServiceClient is first created. Logs whether the
 * connection string is set (boolean, NOT the value), the container name,
 * and the parsed account name (safe to log — it appears in every blob URL).
 *
 * @side-effect Writes one INFO or WARN log entry
 */
export function logStorageInit(): void {
  const connStr = process.env.AZURE_BLOB_CONNECTION_STRING ?? '';
  const hasConnectionString = connStr.length > 0;

  if (!hasConnectionString) {
    storageLog.warn(
      { has_connection_string: false, container: CONTAINER },
      'Azure Blob Storage connection string not configured'
    );
    return;
  }

  const accountName = connStr.match(/AccountName=([^;]+)/)?.[1] ?? 'unknown';

  storageLog.info(
    { has_connection_string: true, account_name: accountName, container: CONTAINER },
    'Azure Blob Storage client initialized'
  );
}
