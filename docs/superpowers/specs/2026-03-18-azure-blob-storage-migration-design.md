# Azure Blob Storage Migration Design

**Date:** 2026-03-18
**Status:** Approved
**Approach:** Direct swap (Approach A) — replace S3 SDK with Azure Blob SDK

## Summary

Replace MinIO/S3-compatible storage with Azure Blob Storage. Swap the AWS SDK for the Azure Blob SDK in the single storage module (`lib/storage.ts`), update the two API routes that directly use the S3 client to call new helper functions, replace MinIO with Azurite in Docker Compose for local dev, and update environment variables.

## Scope

### Files to modify

| File                                 | Change                                                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `lib/storage.ts`                     | Replace S3 client with `BlobServiceClient`. Reimplement 3 existing functions + add 2 new ones. Export `CONTAINER` constant. |
| `app/api/upload/route.ts`            | Remove local `UPLOAD_BUCKET` env read, import `CONTAINER` from `lib/storage`.                                               |
| `app/api/upload/file/route.ts`       | Replace direct `s3Client` + `PutObjectCommand` with `uploadBuffer()` import. Use `CONTAINER` from `lib/storage`.            |
| `app/api/media/route.ts`             | Replace direct `s3Client` + `GetObjectCommand` with `downloadObject()` import. Use `CONTAINER` from `lib/storage`.          |
| `docker-compose.yml`                 | Remove `minio` service, add `azurite` service.                                                                              |
| `.env.example`                       | Remove S3 vars, add `AZURE_BLOB_CONNECTION_STRING` and `AZURE_BLOB_CONTAINER`.                                              |
| `.env.test`                          | Remove S3 vars, add `AZURE_BLOB_CONNECTION_STRING` (Azurite) and `AZURE_BLOB_CONTAINER`.                                    |
| `next.config.ts`                     | Update `images.remotePatterns` — replace MinIO `localhost:9000` with Azurite `localhost:10000`.                             |
| `__tests__/unit/lib/storage.test.ts` | Re-mock for `@azure/storage-blob`.                                                                                          |
| `__tests__/unit/api/upload.test.ts`  | Update mocks for new storage imports.                                                                                       |
| `lib/storage-url.ts`                 | Update comments only (MinIO references).                                                                                    |
| `README.md`, `CLAUDE.md`             | Update storage references from MinIO/S3 to Azure Blob/Azurite.                                                              |

### Files with no changes

| File                       | Reason                                                  |
| -------------------------- | ------------------------------------------------------- |
| `lib/upload.ts`            | No SDK dependency — validation and key generation only. |
| `hooks/use-file-upload.ts` | Posts to `/api/upload/file` — storage-agnostic.         |
| All UI components          | Consume `resolveStorageUrl()` — no storage dependency.  |
| `prisma/schema.prisma`     | Stores string keys — storage-agnostic.                  |

### Dependencies

| Remove                          | Add                   |
| ------------------------------- | --------------------- |
| `@aws-sdk/client-s3`            | `@azure/storage-blob` |
| `@aws-sdk/s3-request-presigner` | —                     |

## Design

### `lib/storage.ts` — Exported API

```typescript
// Initialization
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_BLOB_CONNECTION_STRING ?? ''
);

export const CONTAINER = process.env.AZURE_BLOB_CONTAINER ?? 'podcast-hub-uploads';

// Existing functions (container param removed — use module-level CONTAINER)
generatePresignedUploadUrl(key: string, contentType: string): Promise<string>
generatePresignedDownloadUrl(key: string): Promise<string>
deleteObject(key: string): Promise<void>

// New functions (move SDK usage out of routes)
uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void>
downloadObject(key: string, range?: string): Promise<DownloadResult>
```

**`DownloadResult` type:**

```typescript
interface DownloadResult {
  body: Buffer;
  contentType?: string;
  contentLength?: number;
  contentRange?: string;
  acceptRanges?: string;
}
```

**Presigned URLs:** Use `generateBlobSASQueryParameters` with `StorageSharedKeyCredential` (extracted from connection string) and `BlobSASPermissions` (read or write) with 1-hour expiry. Append SAS token to blob URL. `StorageSharedKeyCredential` is required for Azurite compatibility (no Azure AD support).

**Upload:** `BlockBlobClient.upload()` with `blobHTTPHeaders: { blobContentType }`.

**Download:** `BlockBlobClient.download()` with optional `offset` and `count` parsed from the HTTP `Range` header.

### `app/api/upload/file/route.ts`

Replace:

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/storage';
// ...
await s3Client.send(new PutObjectCommand({ ... }));
```

With:

```typescript
import { uploadBuffer } from '@/lib/storage';
// ...
await uploadBuffer(key, buffer, file.type);
```

Remove local `UPLOAD_BUCKET` constant.

### `app/api/upload/route.ts`

Remove local `UPLOAD_BUCKET` constant. Import `CONTAINER` from `@/lib/storage` if needed in the response (currently returns `bucket` in the response body). Otherwise, the `generatePresignedUploadUrl` call simplifies to `generatePresignedUploadUrl(key, content_type)`.

### `app/api/media/route.ts`

Replace:

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/storage';
// ...
const response = await s3Client.send(command);
```

With:

```typescript
import { downloadObject } from '@/lib/storage';
// ...
const result = await downloadObject(key, range);
```

Remove local `UPLOAD_BUCKET` constant. The route still handles content-type inference and response headers — only the SDK call is abstracted.

### Environment variables

| Variable                       | Dev (Azurite)                        | Prod (Azure)                         |
| ------------------------------ | ------------------------------------ | ------------------------------------ |
| `AZURE_BLOB_CONNECTION_STRING` | Azurite well-known connection string | Real Azure Storage connection string |
| `AZURE_BLOB_CONTAINER`         | `podcast-hub-uploads`                | Container name in Azure              |

Remove: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `S3_UPLOAD_BUCKET`, `S3_BUCKET_AUDIO`, `S3_BUCKET_THUMBNAILS`, `S3_BUCKET_BULLETINS`.

### Docker Compose

Remove `minio` service and `minio_data` volume. Add:

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

Only run the blob service — queue and table are not needed.

### Local dev: container auto-creation

`lib/storage.ts` will call `containerClient.createIfNotExists()` lazily on first storage operation to ensure the Azurite container exists without manual setup steps.

## Known limitations

- `downloadObject` buffers entire files into memory (matches current S3 behavior). For 500MB audio files this is a concern — streaming should be investigated separately.

## Out of scope

- No storage abstraction layer / provider interface (YAGNI)
- No multi-container support (single container with key prefixes, same as current single-bucket approach)
- No HLS transcoding changes (audio pipeline is separate from blob storage)
- No database schema changes (stores string keys, storage-agnostic)
- No streaming download optimization (matches current behavior, tracked as known limitation)
