/**
 * Azure Blob Storage operations for The Audit Brief.
 *
 * Key responsibilities:
 * - Generates SAS upload URLs (write permission) with 1-hour expiry
 * - Generates SAS download URLs (read permission) with 1-hour expiry
 * - Uploads buffers to blob storage
 * - Downloads blobs with optional range support (buffered)
 * - Streams blobs without buffering (for large audio files)
 * - Deletes blobs from storage
 * - Lists all blob keys in the container
 *
 * Client bootstrap and lifecycle are in lib/storage-client.ts.
 * Result types and range parsing are in lib/storage-types.ts.
 *
 * Environment variables:
 * - AZURE_BLOB_CONNECTION_STRING: Connection string for Azure Blob / Azurite
 * - AZURE_BLOB_CONTAINER: Container name (defaults to 'the-audit-brief-uploads')
 *
 * Dependencies:
 * - @azure/storage-blob
 * - lib/storage-client.ts (client bootstrap)
 * - lib/storage-types.ts (type definitions)
 * - lib/storage-logger.ts (structured logging)
 */
import { BlobSASPermissions, generateBlobSASQueryParameters } from '@azure/storage-blob';

import {
  CONTAINER,
  SAS_EXPIRY_MS,
  getBlobServiceClient,
  getSharedKeyCredentialCached,
  ensureContainer,
} from '@/lib/storage-client';

import { parseRange } from '@/lib/storage-types';
import type { DownloadResult, StreamResult } from '@/lib/storage-types';
import { withStorageLogging } from '@/lib/storage-logger';

/* Re-export everything consumers depend on from @/lib/storage */
export {
  CONTAINER,
  _resetForTesting,
  _blobServiceClient,
  _sharedKeyCredential,
} from '@/lib/storage-client';
export type { DownloadResult, StreamResult } from '@/lib/storage-types';

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
  return withStorageLogging(
    'generate_upload_sas',
    key,
    async () => {
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
    },
    { content_type: contentType }
  );
}

/**
 * Generates a SAS URL for downloading a blob via HTTP GET.
 *
 * @param key - The blob name (path) within the container
 * @returns A SAS URL valid for 1 hour with read permission
 * @throws Error if shared key credential is not available
 */
export async function generatePresignedDownloadUrl(key: string): Promise<string> {
  return withStorageLogging('generate_download_sas', key, async () => {
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
  });
}

/**
 * Deletes a blob from Azure Blob Storage.
 *
 * @param key - The blob name (path) to delete
 */
export async function deleteObject(key: string): Promise<void> {
  return withStorageLogging('delete', key, async () => {
    const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
    const blobClient = containerClient.getBlockBlobClient(key);
    await blobClient.delete();
  });
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
  return withStorageLogging(
    'upload',
    key,
    async () => {
      await ensureContainer();
      const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
      const blobClient = containerClient.getBlockBlobClient(key);
      await blobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      });
    },
    { content_length: buffer.length, content_type: contentType }
  );
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
  return withStorageLogging('download', key, async () => {
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
  });
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
  return withStorageLogging('stream', key, async () => {
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
  });
}

/**
 * Lists all blob names in the configured container.
 *
 * Used by the orphan sweep to enumerate every object in storage for
 * cross-referencing against database records. At <1,000 blobs the full
 * list fits comfortably in memory.
 *
 * @returns Array of blob names (storage keys) in the container
 */
export async function listAllBlobKeys(): Promise<string[]> {
  return withStorageLogging('list_all_blobs', null, async () => {
    const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
    const keys: string[] = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      keys.push(blob.name);
    }

    return keys;
  });
}
