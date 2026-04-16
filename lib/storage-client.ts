/**
 * Azure Blob Storage client bootstrap and lifecycle management.
 *
 * Key responsibilities:
 * - Configures a BlobServiceClient from AZURE_BLOB_CONNECTION_STRING
 * - Manages lazy-initialized singletons for the client and SAS credential
 * - Ensures the blob container exists (createIfNotExists) once per process
 * - Provides test reset for clearing cached state between test runs
 *
 * Extracted from lib/storage.ts to separate client lifecycle from
 * storage operations, keeping each file under 300 lines.
 *
 * Environment variables:
 * - AZURE_BLOB_CONNECTION_STRING: Connection string for Azure Blob / Azurite
 * - AZURE_BLOB_CONTAINER: Container name (defaults to 'the-audit-brief-uploads')
 *
 * Dependencies:
 * - @azure/storage-blob
 */
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

/** Container name from environment, with a sensible default. */
export const CONTAINER = process.env.AZURE_BLOB_CONTAINER ?? 'the-audit-brief-uploads';

/** SAS URL expiry in milliseconds (1 hour). */
export const SAS_EXPIRY_MS = 3600 * 1000;

/**
 * Returns the Azure Blob connection string from the environment.
 * Evaluated lazily so tests can inject the env variable before first use.
 */
export function getConnectionString(): string {
  return process.env.AZURE_BLOB_CONNECTION_STRING ?? '';
}

/**
 * Extracts account name and key from a connection string to create a
 * StorageSharedKeyCredential. Required for SAS token generation.
 * Compatible with both Azurite and production Azure Storage.
 *
 * @param connStr - Azure Blob Storage connection string
 * @returns StorageSharedKeyCredential for SAS generation
 * @throws Error if AccountName or AccountKey cannot be parsed
 */
export function getSharedKeyCredential(connStr: string): StorageSharedKeyCredential {
  const accountName = connStr.match(/AccountName=([^;]+)/)?.[1];
  const accountKey = connStr.match(/AccountKey=([^;]+)/)?.[1];

  if (!accountName || !accountKey) {
    throw new Error('Cannot parse AccountName/AccountKey from AZURE_BLOB_CONNECTION_STRING');
  }

  return new StorageSharedKeyCredential(accountName, accountKey);
}

/**
 * Lazily created BlobServiceClient. Avoids module-load-time failures when
 * AZURE_BLOB_CONNECTION_STRING is not set (e.g., during unit tests that mock
 * the SDK before the module is imported).
 *
 * @internal Exported for test reset only — do not use in application code.
 */
export let _blobServiceClient:
  | ReturnType<typeof BlobServiceClient.fromConnectionString>
  | undefined;

/**
 * Lazily resolved shared key credential for SAS generation.
 * Cached after first successful creation.
 *
 * @internal Exported for test reset only — do not use in application code.
 */
export let _sharedKeyCredential: StorageSharedKeyCredential | undefined;

/**
 * Tracks whether the container has been verified/created this process.
 * Prevents redundant createIfNotExists calls on every operation.
 */
let containerEnsured = false;

/**
 * Returns the singleton BlobServiceClient, creating it on first access.
 *
 * @returns The BlobServiceClient instance
 */
export function getBlobServiceClient(): ReturnType<typeof BlobServiceClient.fromConnectionString> {
  if (!_blobServiceClient) {
    _blobServiceClient = BlobServiceClient.fromConnectionString(getConnectionString());
  }
  return _blobServiceClient;
}

/**
 * Returns the StorageSharedKeyCredential, creating it on first access.
 *
 * @returns The cached StorageSharedKeyCredential
 * @throws Error if AZURE_BLOB_CONNECTION_STRING is missing or unparseable
 */
export function getSharedKeyCredentialCached(): StorageSharedKeyCredential {
  if (!_sharedKeyCredential) {
    const connStr = getConnectionString();
    if (!connStr) {
      throw new Error('AZURE_BLOB_CONNECTION_STRING is required for SAS URL generation');
    }
    _sharedKeyCredential = getSharedKeyCredential(connStr);
  }
  return _sharedKeyCredential;
}

/**
 * Ensures the blob container exists, creating it if necessary.
 * Only runs once per process lifecycle.
 */
export async function ensureContainer(): Promise<void> {
  if (containerEnsured) return;
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  await containerClient.createIfNotExists();
  containerEnsured = true;
}

/**
 * Resets all module-level cached state.
 *
 * @internal For use in unit tests only — do not call in application code.
 */
export function _resetForTesting(): void {
  containerEnsured = false;
  _blobServiceClient = undefined;
  _sharedKeyCredential = undefined;
}
