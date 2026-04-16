/**
 * Azure Blob Storage client for The Audit Brief.
 *
 * Key responsibilities:
 * - Configures a BlobServiceClient from AZURE_BLOB_CONNECTION_STRING
 * - Generates SAS upload URLs (write permission) with 1-hour expiry
 * - Generates SAS download URLs (read permission) with 1-hour expiry
 * - Uploads buffers to blob storage
 * - Downloads blobs with optional range support
 * - Deletes blobs from storage
 * - Lazily creates the container if it does not exist (for Azurite dev)
 *
 * Environment variables:
 * - AZURE_BLOB_CONNECTION_STRING: Connection string for Azure Blob / Azurite
 * - AZURE_BLOB_CONTAINER: Container name (defaults to 'the-audit-brief-uploads')
 *
 * Dependencies:
 * - @azure/storage-blob
 */
import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

/** Container name from environment, with a sensible default. */
export const CONTAINER = process.env.AZURE_BLOB_CONTAINER ?? 'the-audit-brief-uploads';

/** SAS URL expiry in milliseconds (1 hour). */
const SAS_EXPIRY_MS = 3600 * 1000;

/**
 * Extracts account name and key from a connection string to create a
 * StorageSharedKeyCredential. Required for SAS token generation.
 * Compatible with both Azurite and production Azure Storage.
 *
 * @param connStr - Azure Blob Storage connection string
 * @returns StorageSharedKeyCredential for SAS generation
 * @throws Error if AccountName or AccountKey cannot be parsed
 */
function getSharedKeyCredential(connStr: string): StorageSharedKeyCredential {
  const accountName = connStr.match(/AccountName=([^;]+)/)?.[1];
  const accountKey = connStr.match(/AccountKey=([^;]+)/)?.[1];

  if (!accountName || !accountKey) {
    throw new Error('Cannot parse AccountName/AccountKey from AZURE_BLOB_CONNECTION_STRING');
  }

  return new StorageSharedKeyCredential(accountName, accountKey);
}

/**
 * Returns the Azure Blob connection string from the environment.
 * Evaluated lazily so tests can inject the env variable before first use.
 */
function getConnectionString(): string {
  return process.env.AZURE_BLOB_CONNECTION_STRING ?? '';
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
 * Returns the singleton BlobServiceClient, creating it on first access.
 */
function getBlobServiceClient(): ReturnType<typeof BlobServiceClient.fromConnectionString> {
  if (!_blobServiceClient) {
    _blobServiceClient = BlobServiceClient.fromConnectionString(getConnectionString());
  }
  return _blobServiceClient;
}

/**
 * Lazily resolved shared key credential for SAS generation.
 * Cached after first successful creation.
 *
 * @internal Exported for test reset only — do not use in application code.
 */
export let _sharedKeyCredential: StorageSharedKeyCredential | undefined;

/**
 * Returns the StorageSharedKeyCredential, creating it on first access.
 *
 * @throws Error if AZURE_BLOB_CONNECTION_STRING is missing or unparseable
 */
function getSharedKeyCredentialCached(): StorageSharedKeyCredential {
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
 * Tracks whether the container has been verified/created this process.
 * Prevents redundant createIfNotExists calls on every operation.
 */
let containerEnsured = false;

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

/**
 * Ensures the blob container exists, creating it if necessary.
 * Only runs once per process lifecycle.
 */
async function ensureContainer(): Promise<void> {
  if (containerEnsured) return;
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  await containerClient.createIfNotExists();
  containerEnsured = true;
}

/**
 * Generates a SAS URL for uploading a blob via HTTP PUT.
 *
 * @param key - The blob name (path) within the container
 * @param contentType - The MIME type of the file to upload
 * @returns A SAS URL valid for 1 hour with write permission
 * @throws Error if shared key credential is not available
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const credential = getSharedKeyCredentialCached();
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  const blobClient = containerClient.getBlockBlobClient(key);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + SAS_EXPIRY_MS);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER,
      blobName: key,
      permissions: BlobSASPermissions.parse('w'),
      startsOn,
      expiresOn,
      contentType,
    },
    credential
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

/**
 * Generates a SAS URL for downloading a blob via HTTP GET.
 *
 * @param key - The blob name (path) within the container
 * @returns A SAS URL valid for 1 hour with read permission
 * @throws Error if shared key credential is not available
 */
export async function generatePresignedDownloadUrl(key: string): Promise<string> {
  const credential = getSharedKeyCredentialCached();
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  const blobClient = containerClient.getBlockBlobClient(key);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + SAS_EXPIRY_MS);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER,
      blobName: key,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    },
    credential
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

/**
 * Deletes a blob from Azure Blob Storage.
 *
 * @param key - The blob name (path) to delete
 */
export async function deleteObject(key: string): Promise<void> {
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  const blobClient = containerClient.getBlockBlobClient(key);
  await blobClient.delete();
}

/**
 * Uploads a buffer to Azure Blob Storage.
 *
 * Ensures the container exists before uploading.
 *
 * @param key - The blob name (path) within the container
 * @param buffer - The file content as a Buffer
 * @param contentType - The MIME type of the file
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await ensureContainer();
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  const blobClient = containerClient.getBlockBlobClient(key);
  await blobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
}

/**
 * Result of a blob download operation.
 */
export interface DownloadResult {
  /** The file content as a Buffer. */
  body: Buffer;
  /** The MIME type of the blob, if available. */
  contentType?: string;
  /** The size of the returned content in bytes. */
  contentLength?: number;
  /** The content range header for partial responses. */
  contentRange?: string;
  /** Whether the blob accepts range requests. */
  acceptRanges?: string;
}

/**
 * Result of a blob stream operation.
 *
 * Returns the raw Node.js ReadableStream from the Azure SDK without buffering
 * any content into memory. Suitable for piping large files directly to an
 * HTTP response.
 */
export interface StreamResult {
  /** The raw Node.js readable stream from Azure Blob Storage. */
  stream: NodeJS.ReadableStream;
  /** The MIME type of the blob, if available. */
  contentType?: string;
  /** The size of the returned content in bytes. */
  contentLength?: number;
  /** The content range header for partial responses. */
  contentRange?: string;
  /** Whether the blob accepts range requests. */
  acceptRanges?: string;
}

/**
 * Parses an HTTP Range header into offset and count for Azure Blob download.
 *
 * @param range - HTTP Range header value (e.g., "bytes=0-1023")
 * @returns Object with offset and optional count, or undefined if parsing fails
 */
function parseRange(range: string): { offset: number; count?: number } | undefined {
  const match = range.match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return undefined;

  const offset = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : undefined;
  const count = end !== undefined ? end - offset + 1 : undefined;

  return { offset, count };
}

/**
 * Downloads a blob from Azure Blob Storage.
 *
 * Supports optional HTTP Range header for partial content (audio seeking).
 * Buffers the entire response into memory (matches prior S3 behavior).
 *
 * @param key - The blob name (path) to download
 * @param range - Optional HTTP Range header value (e.g., "bytes=0-1023")
 * @returns DownloadResult with body buffer and metadata
 * @throws Error if the blob cannot be downloaded or the stream is unavailable
 */
export async function downloadObject(key: string, range?: string | null): Promise<DownloadResult> {
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  const blobClient = containerClient.getBlockBlobClient(key);

  const parsed = range ? parseRange(range) : undefined;
  const response = parsed
    ? await blobClient.download(parsed.offset, parsed.count)
    : await blobClient.download();

  const stream = response.readableStreamBody;
  if (!stream) {
    throw new Error(`No readable stream for blob: ${key}`);
  }

  // Buffer the Node.js stream into memory
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);

  return {
    body,
    contentType: response.contentType,
    contentLength: response.contentLength,
    contentRange: response.contentRange,
    acceptRanges: response.acceptRanges,
  };
}

/**
 * Streams a blob from Azure Blob Storage without buffering it into memory.
 *
 * Returns the raw Node.js ReadableStream from the Azure SDK, suitable for
 * piping directly to an HTTP response. Unlike downloadObject(), this avoids
 * loading the entire blob into a Buffer — critical for large audio files.
 *
 * Supports optional HTTP Range header for partial content (audio seeking).
 *
 * @param key - The blob name (path) to stream
 * @param range - Optional HTTP Range header value (e.g., "bytes=0-1023")
 * @returns StreamResult with the raw stream and metadata
 * @throws Error if the blob cannot be downloaded or the stream is unavailable
 */
export async function streamObject(key: string, range?: string | null): Promise<StreamResult> {
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  const blobClient = containerClient.getBlockBlobClient(key);

  const parsed = range ? parseRange(range) : undefined;
  const response = parsed
    ? await blobClient.download(parsed.offset, parsed.count)
    : await blobClient.download();

  const stream = response.readableStreamBody;
  if (!stream) {
    throw new Error(`No readable stream for blob: ${key}`);
  }

  return {
    stream,
    contentType: response.contentType,
    contentLength: response.contentLength,
    contentRange: response.contentRange,
    acceptRanges: response.acceptRanges,
  };
}
