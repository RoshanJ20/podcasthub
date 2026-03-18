/**
 * Unit tests for the Azure Blob storage client.
 *
 * Verifies:
 * - generatePresignedUploadUrl generates a SAS URL with write permission
 * - generatePresignedDownloadUrl generates a SAS URL with read permission
 * - deleteObject calls delete on the block blob client
 * - uploadBuffer uploads a buffer with correct content type
 * - downloadObject returns buffer with metadata
 * - downloadObject supports range requests
 * - CONTAINER is exported and reads from env
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';

const {
  mockUpload,
  mockDeleteBlob,
  mockDownload,
  mockCreateIfNotExists,
  mockGetBlockBlobClient,
  mockGetContainerClient,
} = vi.hoisted(() => {
  const mockUpload = vi.fn().mockResolvedValue({});
  const mockDeleteBlob = vi.fn().mockResolvedValue({});
  const mockDownload = vi.fn();
  const mockCreateIfNotExists = vi.fn().mockResolvedValue({});
  const mockGetBlockBlobClient = vi.fn().mockReturnValue({
    upload: mockUpload,
    delete: mockDeleteBlob,
    url: 'https://devstoreaccount1.blob.core.windows.net/podcast-hub-uploads/audio/test.mp3',
    download: mockDownload,
  });
  const mockGetContainerClient = vi.fn().mockReturnValue({
    getBlockBlobClient: mockGetBlockBlobClient,
    createIfNotExists: mockCreateIfNotExists,
  });
  return {
    mockUpload,
    mockDeleteBlob,
    mockDownload,
    mockCreateIfNotExists,
    mockGetBlockBlobClient,
    mockGetContainerClient,
  };
});

vi.mock('@azure/storage-blob', () => {
  const BlobServiceClient = {
    fromConnectionString: vi.fn().mockReturnValue({
      getContainerClient: mockGetContainerClient,
    }),
  };
  const BlobSASPermissions = {
    parse: vi.fn().mockReturnValue({}),
  };
  const generateBlobSASQueryParameters = vi.fn().mockReturnValue({
    toString: () => 'sv=2024-01-01&sig=fakesig',
  });
  const StorageSharedKeyCredential = vi.fn();

  return {
    BlobServiceClient,
    BlobSASPermissions,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential,
  };
});

import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteObject,
  uploadBuffer,
  downloadObject,
  CONTAINER,
  _resetForTesting,
} from '@/lib/storage';
import { generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';

describe('Azure Blob Storage Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-level cached state so each test starts fresh
    _resetForTesting();
    // Provide a fake connection string so SAS credential guard passes.
    // The StorageSharedKeyCredential constructor is mocked so actual key parsing is irrelevant.
    process.env.AZURE_BLOB_CONNECTION_STRING =
      'DefaultEndpointsProtocol=https;AccountName=devstoreaccount1;AccountKey=dGVzdGtleQ==;EndpointSuffix=core.windows.net';
  });

  describe('CONTAINER', () => {
    it('exports the container name from env or default', () => {
      expect(typeof CONTAINER).toBe('string');
      expect(CONTAINER.length).toBeGreaterThan(0);
    });
  });

  describe('generatePresignedUploadUrl', () => {
    it('returns a SAS URL with write permission', async () => {
      const url = await generatePresignedUploadUrl('audio/test.mp3', 'audio/mpeg');

      expect(url).toContain('sv=2024-01-01');
      expect(url).toContain('sig=fakesig');
      expect(BlobSASPermissions.parse).toHaveBeenCalledWith('w');
      expect(generateBlobSASQueryParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          containerName: CONTAINER,
          blobName: 'audio/test.mp3',
        }),
        expect.anything()
      );
    });

    it('generates a URL with 1-hour expiry', async () => {
      await generatePresignedUploadUrl('key', 'text/plain');

      const sasParams = vi.mocked(generateBlobSASQueryParameters).mock
        .calls[0][0] as unknown as Record<string, unknown>;
      const expiresOn = sasParams.expiresOn as Date;
      const startsOn = sasParams.startsOn as Date;
      const diffMs = expiresOn.getTime() - startsOn.getTime();
      // Allow 1 second tolerance
      expect(diffMs).toBeGreaterThanOrEqual(3600 * 1000 - 1000);
      expect(diffMs).toBeLessThanOrEqual(3600 * 1000 + 1000);
    });
  });

  describe('generatePresignedDownloadUrl', () => {
    it('returns a SAS URL with read permission', async () => {
      const url = await generatePresignedDownloadUrl('audio/test.mp3');

      expect(url).toContain('sv=2024-01-01');
      expect(BlobSASPermissions.parse).toHaveBeenCalledWith('r');
    });

    it('generates a URL with 1-hour expiry', async () => {
      await generatePresignedDownloadUrl('key');

      const sasParams = vi.mocked(generateBlobSASQueryParameters).mock
        .calls[0][0] as unknown as Record<string, unknown>;
      const expiresOn = sasParams.expiresOn as Date;
      const startsOn = sasParams.startsOn as Date;
      const diffMs = expiresOn.getTime() - startsOn.getTime();
      expect(diffMs).toBeGreaterThanOrEqual(3600 * 1000 - 1000);
      expect(diffMs).toBeLessThanOrEqual(3600 * 1000 + 1000);
    });
  });

  describe('deleteObject', () => {
    it('calls delete on the block blob client', async () => {
      await deleteObject('audio/test.mp3');

      expect(mockGetContainerClient).toHaveBeenCalledWith(CONTAINER);
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith('audio/test.mp3');
      expect(mockDeleteBlob).toHaveBeenCalled();
    });

    it('returns void on success', async () => {
      const result = await deleteObject('key');
      expect(result).toBeUndefined();
    });

    it('propagates errors from Azure', async () => {
      mockDeleteBlob.mockRejectedValueOnce(new Error('Azure error'));
      await expect(deleteObject('key')).rejects.toThrow('Azure error');
    });
  });

  describe('uploadBuffer', () => {
    it('uploads a buffer with correct content type', async () => {
      const buffer = Buffer.from('test data');
      await uploadBuffer('audio/test.mp3', buffer, 'audio/mpeg');

      expect(mockGetContainerClient).toHaveBeenCalledWith(CONTAINER);
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith('audio/test.mp3');
      expect(mockUpload).toHaveBeenCalledWith(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: 'audio/mpeg' },
      });
    });

    it('ensures container exists before uploading', async () => {
      const buffer = Buffer.from('data');
      await uploadBuffer('key', buffer, 'text/plain');

      expect(mockCreateIfNotExists).toHaveBeenCalled();
    });

    it('calls createIfNotExists only once across multiple uploads', async () => {
      await uploadBuffer('key1', Buffer.from('a'), 'text/plain');
      await uploadBuffer('key2', Buffer.from('b'), 'text/plain');
      expect(mockCreateIfNotExists).toHaveBeenCalledTimes(1);
    });
  });

  describe('downloadObject', () => {
    /**
     * Helper to create a mock Node.js ReadableStream from a Uint8Array.
     * Azure Blob SDK returns NodeJS.ReadableStream, not Web ReadableStream.
     */
    function createMockNodeStream(data: Uint8Array) {
      return Readable.from([Buffer.from(data)]);
    }

    it('returns buffer with metadata for full download', async () => {
      mockDownload.mockResolvedValue({
        readableStreamBody: createMockNodeStream(new Uint8Array([1, 2, 3])),
        contentType: 'audio/mpeg',
        contentLength: 3,
        acceptRanges: 'bytes',
      });

      const result = await downloadObject('audio/test.mp3');

      expect(result.body).toBeInstanceOf(Buffer);
      expect(result.body.length).toBe(3);
      expect(result.contentType).toBe('audio/mpeg');
      expect(result.contentLength).toBe(3);
      expect(result.acceptRanges).toBe('bytes');
    });

    it('passes offset and count for range requests', async () => {
      mockDownload.mockResolvedValue({
        readableStreamBody: createMockNodeStream(new Uint8Array([1])),
        contentType: 'audio/mpeg',
        contentLength: 1,
        contentRange: 'bytes 0-0/3',
      });

      await downloadObject('audio/test.mp3', 'bytes=0-0');

      expect(mockDownload).toHaveBeenCalledWith(0, 1);
    });

    it('throws when no readable stream is available', async () => {
      mockDownload.mockResolvedValue({
        readableStreamBody: undefined,
      });

      await expect(downloadObject('missing/key')).rejects.toThrow('No readable stream');
    });
  });
});
