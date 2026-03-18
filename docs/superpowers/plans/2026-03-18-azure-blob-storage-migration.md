# Azure Blob Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MinIO/S3 storage with Azure Blob Storage using the `@azure/storage-blob` SDK, with Azurite for local dev.

**Architecture:** Direct SDK swap — all Azure Blob SDK usage isolated to `lib/storage.ts`. API routes call storage functions without knowing the underlying provider. Azurite replaces MinIO in Docker Compose.

**Tech Stack:** `@azure/storage-blob`, Azurite (Docker), Next.js API routes

**Spec:** `docs/superpowers/specs/2026-03-18-azure-blob-storage-migration-design.md`

---

## File Map

| File                                 | Action  | Responsibility                                                    |
| ------------------------------------ | ------- | ----------------------------------------------------------------- |
| `lib/storage.ts`                     | Rewrite | Azure Blob client, presigned URLs (SAS), upload, download, delete |
| `app/api/upload/file/route.ts`       | Modify  | Use `uploadBuffer()` from storage module                          |
| `app/api/upload/route.ts`            | Modify  | Use updated `generatePresignedUploadUrl()`, import `CONTAINER`    |
| `app/api/media/route.ts`             | Modify  | Use `downloadObject()` from storage module                        |
| `lib/storage-url.ts`                 | Modify  | Update comments only                                              |
| `docker-compose.yml`                 | Modify  | Replace MinIO with Azurite                                        |
| `.env.example`                       | Modify  | Replace S3 vars with Azure vars                                   |
| `.env.test`                          | Modify  | Replace S3 vars with Azure vars                                   |
| `next.config.ts`                     | Modify  | Update remote patterns port                                       |
| `__tests__/unit/lib/storage.test.ts` | Rewrite | Test Azure Blob storage functions                                 |
| `__tests__/unit/api/upload.test.ts`  | Modify  | Update mock for new storage signature                             |
| `README.md`                          | Modify  | Update storage references                                         |
| `CLAUDE.md`                          | Modify  | Update storage references                                         |

---

### Task 1: Swap dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Remove AWS SDK packages and add Azure Blob SDK**

```bash
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner && npm install @azure/storage-blob
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@azure/storage-blob'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap @aws-sdk/client-s3 for @azure/storage-blob"
```

---

### Task 2: Rewrite `lib/storage.ts` with tests (TDD)

**Files:**

- Rewrite: `lib/storage.ts`
- Rewrite: `__tests__/unit/lib/storage.test.ts`

- [ ] **Step 1: Write failing tests for the Azure Blob storage module**

Replace `__tests__/unit/lib/storage.test.ts` with:

```typescript
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
} from '@/lib/storage';
import { generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';

describe('Azure Blob Storage Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      const sasParams = vi.mocked(generateBlobSASQueryParameters).mock.calls[0][0] as Record<
        string,
        unknown
      >;
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

      const sasParams = vi.mocked(generateBlobSASQueryParameters).mock.calls[0][0] as Record<
        string,
        unknown
      >;
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
  });

  describe('uploadBuffer', () => {
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
      const { Readable } = require('stream');
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/unit/lib/storage.test.ts
```

Expected: FAIL — `@/lib/storage` still exports S3 functions.

- [ ] **Step 3: Write the Azure Blob storage implementation**

Replace `lib/storage.ts` with:

```typescript
/**
 * Azure Blob Storage client for Podcast Hub v2.
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
 * - AZURE_BLOB_CONTAINER: Container name (defaults to 'podcast-hub-uploads')
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
export const CONTAINER = process.env.AZURE_BLOB_CONTAINER ?? 'podcast-hub-uploads';

/** SAS URL expiry in milliseconds (1 hour). */
const SAS_EXPIRY_MS = 3600 * 1000;

/** Connection string from environment. */
const connectionString = process.env.AZURE_BLOB_CONNECTION_STRING ?? '';

/**
 * Azure Blob Service client configured from connection string.
 */
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

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

/** Cached credential for SAS generation. */
const sharedKeyCredential = connectionString ? getSharedKeyCredential(connectionString) : undefined;

/**
 * Tracks whether the container has been verified/created this process.
 * Prevents redundant createIfNotExists calls on every operation.
 */
let containerEnsured = false;

/**
 * Ensures the blob container exists, creating it if necessary.
 * Only runs once per process lifecycle.
 */
async function ensureContainer(): Promise<void> {
  if (containerEnsured) return;
  const containerClient = blobServiceClient.getContainerClient(CONTAINER);
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
  if (!sharedKeyCredential) {
    throw new Error('AZURE_BLOB_CONNECTION_STRING is required for SAS URL generation');
  }

  const containerClient = blobServiceClient.getContainerClient(CONTAINER);
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
    sharedKeyCredential
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
  if (!sharedKeyCredential) {
    throw new Error('AZURE_BLOB_CONNECTION_STRING is required for SAS URL generation');
  }

  const containerClient = blobServiceClient.getContainerClient(CONTAINER);
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
    sharedKeyCredential
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

/**
 * Deletes a blob from Azure Blob Storage.
 *
 * @param key - The blob name (path) to delete
 */
export async function deleteObject(key: string): Promise<void> {
  const containerClient = blobServiceClient.getContainerClient(CONTAINER);
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
  const containerClient = blobServiceClient.getContainerClient(CONTAINER);
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
  const containerClient = blobServiceClient.getContainerClient(CONTAINER);
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/unit/lib/storage.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts __tests__/unit/lib/storage.test.ts
git commit -m "feat: rewrite storage module to use Azure Blob SDK"
```

---

### Task 3: Update API routes to use storage module functions

**Files:**

- Modify: `app/api/upload/file/route.ts`
- Modify: `app/api/upload/route.ts`
- Modify: `app/api/media/route.ts`
- Modify: `__tests__/unit/api/upload.test.ts`

- [ ] **Step 1: Update `app/api/upload/file/route.ts`**

Replace the S3 imports and usage. Remove `PutObjectCommand` import, `s3Client` import, and `UPLOAD_BUCKET` constant. Import `uploadBuffer` and `CONTAINER` from storage.

Change the imports from:

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/storage';
```

To:

```typescript
import { uploadBuffer } from '@/lib/storage';
```

Remove:

```typescript
const UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET ?? 'podcast-hub-uploads';
```

Replace the S3 upload call:

```typescript
await s3Client.send(
  new PutObjectCommand({
    Bucket: UPLOAD_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  })
);
```

With:

```typescript
await uploadBuffer(key, buffer, file.type);
```

- [ ] **Step 2: Update `app/api/upload/route.ts`**

Change import from:

```typescript
import { generatePresignedUploadUrl } from '@/lib/storage';
```

To:

```typescript
import { generatePresignedUploadUrl, CONTAINER } from '@/lib/storage';
```

Remove:

```typescript
const UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET ?? 'podcast-hub-uploads';
```

Update the presigned URL call from:

```typescript
const uploadUrl = await generatePresignedUploadUrl(UPLOAD_BUCKET, key, content_type);
```

To:

```typescript
const uploadUrl = await generatePresignedUploadUrl(key, content_type);
```

Update the response from `bucket: UPLOAD_BUCKET` to `container: CONTAINER`.

- [ ] **Step 3: Update `app/api/media/route.ts`**

Replace all S3 imports and usage. Change imports from:

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/storage';
```

To:

```typescript
import { downloadObject } from '@/lib/storage';
```

Remove:

```typescript
const UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET ?? 'podcast-hub-uploads';
```

**Important:** Keep the existing `try/catch` error handler, the `createLogger` import, and the `notFound`/`internalError` imports. Only replace the code inside the `try` block.

Replace the `try` block body (lines 41-82) — remove the `GetObjectCommand` construction and `s3Client.send()` call — with:

```typescript
const range = request.headers.get('range');
const result = await downloadObject(key, range);

const contentType =
  result.contentType && result.contentType !== 'application/octet-stream'
    ? result.contentType
    : inferContentType(key);

const headers: Record<string, string> = {
  'Content-Type': contentType,
  'Cache-Control': 'public, max-age=3600',
};

if (result.contentLength) {
  headers['Content-Length'] = String(result.contentLength);
}
if (result.contentRange) {
  headers['Content-Range'] = result.contentRange;
}
if (result.acceptRanges) {
  headers['Accept-Ranges'] = result.acceptRanges;
}

return new NextResponse(result.body, {
  status: range && result.contentRange ? 206 : 200,
  headers,
});
```

The existing `catch` block (lines 83-86) with `log.error` and `createErrorResponse(internalError(...))` remains unchanged.

- [ ] **Step 4: Update `__tests__/unit/api/upload.test.ts`**

Update the mock for `@/lib/storage` to include `CONTAINER`:

```typescript
vi.mock('@/lib/storage', () => ({
  generatePresignedUploadUrl: vi.fn(),
  CONTAINER: 'test-container',
}));
```

Update the import:

```typescript
import { generatePresignedUploadUrl, CONTAINER } from '@/lib/storage';
```

Update **both** `body.data.bucket` assertions in the "returns presigned URL, key, and bucket on success for audio" test (lines 183-184):

```typescript
// Line 183: change from expect(body.data.bucket).toBeDefined()
expect(body.data.container).toBe('test-container');
// Line 184: change from expect(typeof body.data.bucket).toBe('string')
expect(typeof body.data.container).toBe('string');
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run __tests__/unit/api/upload.test.ts __tests__/unit/lib/storage.test.ts
```

Expected: All PASS.

- [ ] **Step 6: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: No errors. If there are type errors in other files that imported from `@aws-sdk/client-s3`, those files need updating too — but per the spec, only the 3 route files and storage module import the SDK.

- [ ] **Step 7: Commit**

```bash
git add app/api/upload/file/route.ts app/api/upload/route.ts app/api/media/route.ts __tests__/unit/api/upload.test.ts
git commit -m "feat: update API routes to use Azure Blob storage functions"
```

---

### Task 4: Update environment and infrastructure config

**Files:**

- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `.env.test`
- Modify: `next.config.ts`
- Modify: `lib/storage-url.ts`

- [ ] **Step 1: Update `docker-compose.yml`**

Replace the `minio` service with `azurite`:

Remove:

```yaml
minio:
  image: minio/minio:latest
  container_name: podcasthub-minio
  restart: unless-stopped
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  ports:
    - '9000:9000'
    - '9001:9001'
  volumes:
    - minio_data:/data
```

Add:

```yaml
azurite:
  image: mcr.microsoft.com/azure-storage/azurite
  container_name: podcasthub-azurite
  restart: unless-stopped
  command: azurite-blob --blobHost 0.0.0.0 --blobPort 10000
  ports:
    - '10000:10000'
  volumes:
    - azurite_data:/data
```

In the `volumes:` section, replace `minio_data:` with `azurite_data:`.

- [ ] **Step 2: Update `.env.example`**

Replace the MinIO/S3 section:

Remove:

```
# MinIO / S3
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_AUDIO="audio"
S3_BUCKET_THUMBNAILS="thumbnails"
S3_BUCKET_BULLETINS="bulletins"
```

Add:

```
# Azure Blob Storage (Azurite for local dev)
AZURE_BLOB_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
AZURE_BLOB_CONTAINER="podcast-hub-uploads"
```

- [ ] **Step 3: Update `.env.test`**

Replace S3 vars:

Remove:

```
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
```

Add:

```
AZURE_BLOB_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
AZURE_BLOB_CONTAINER="podcast-hub-uploads"
```

- [ ] **Step 4: Update `next.config.ts`**

Change the remote pattern from MinIO port 9000 to Azurite port 10000:

```typescript
remotePatterns: [
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '10000',
    pathname: '/**',
  },
],
```

Update the module-level docstring to reference Azure Blob/Azurite instead of MinIO.

- [ ] **Step 5: Update `lib/storage-url.ts` comments**

Update the module-level docstring from:

```
 * In development, files are proxied through /api/media to avoid browser
 * security restrictions on loading media from localhost:9000 (MinIO).
```

To:

```
 * In development, files are proxied through /api/media to avoid browser
 * security restrictions on loading media from localhost:10000 (Azurite).
```

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example .env.test next.config.ts lib/storage-url.ts
git commit -m "chore: replace MinIO with Azurite, update env vars for Azure Blob"
```

---

### Task 5: Update documentation

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `README.md`**

Search for all references to MinIO, S3, `minio`, `s3`, `9000`, `9001` and update:

- Storage technology: "MinIO" → "Azurite (local dev) / Azure Blob Storage (prod)"
- Environment variables: Replace S3 vars with `AZURE_BLOB_CONNECTION_STRING` and `AZURE_BLOB_CONTAINER`
- Docker Compose references: MinIO → Azurite
- Port references: 9000/9001 → 10000
- Setup instructions: Update `docker compose up` notes to mention Azurite instead of MinIO

- [ ] **Step 2: Update `CLAUDE.md`**

Update the tech stack table:

- Change `File Storage` row from `MinIO (dev) → Azure Blob Storage (prod)` to `Azurite (dev) → Azure Blob Storage (prod)`

Update the environment variables table:

- Remove `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- Add `AZURE_BLOB_CONNECTION_STRING` and `AZURE_BLOB_CONTAINER`

Update any references to MinIO in architecture sections or setup instructions.

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update storage references from MinIO/S3 to Azure Blob/Azurite"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run linter**

```bash
npx eslint .
```

Expected: No errors.

- [ ] **Step 4: Verify no remaining S3/MinIO references in source code**

```bash
grep -r "aws-sdk\|s3Client\|S3Client\|S3_ENDPOINT\|S3_ACCESS_KEY\|S3_SECRET_KEY\|S3_UPLOAD_BUCKET\|minio" --include="*.ts" --include="*.tsx" lib/ app/ hooks/ stores/ __tests__/
```

Expected: No matches (docs may still reference MinIO historically, that's fine).

- [ ] **Step 5: Verify Docker Compose is valid**

```bash
docker compose config --quiet
```

Expected: No errors.
