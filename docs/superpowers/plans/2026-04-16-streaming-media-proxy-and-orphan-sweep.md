# Streaming Media Proxy & Orphan Blob Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two storage integrity gaps — stream media responses instead of buffering them in memory, and add an admin endpoint to find and delete orphaned blobs.

**Architecture:** Two independent changes. (1) Add `streamObject()` to `lib/storage.ts` that returns the raw Node.js stream from the Azure SDK; update the media proxy route to pipe it through as a Web ReadableStream. (2) Add `lib/admin/blob-sweep.ts` with functions to list all blobs, collect all DB-referenced keys, and diff orphans; expose via `POST /api/admin/blob-sweep` with dry-run default.

**Tech Stack:** @azure/storage-blob (listBlobsFlat, download), Node 20 Readable.toWeb(), Prisma, NextResponse streaming, Vitest

---

## File Map

### Fix 1: Streaming Media Proxy

| File                                 | Action | Responsibility                                                |
| ------------------------------------ | ------ | ------------------------------------------------------------- |
| `lib/storage.ts`                     | Modify | Add `StreamResult` interface + `streamObject()` function      |
| `app/api/media/route.ts`             | Modify | Switch to `streamObject()`, convert Node stream to Web stream |
| `__tests__/unit/lib/storage.test.ts` | Modify | Add `streamObject()` test suite                               |

### Fix 2: Orphan Blob Sweep

| File                                          | Action | Responsibility                                                                |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `lib/storage-cleanup.ts`                      | Modify | Export `toKey()` (currently private)                                          |
| `lib/storage.ts`                              | Modify | Add `listAllBlobKeys()` function                                              |
| `lib/admin/audit-log.ts`                      | Modify | Add `'blob_sweep'` to `AuditAction` and `'blob_storage'` to `AuditEntityType` |
| `lib/admin/blob-sweep.ts`                     | Create | Core sweep logic: `collectAllReferencedKeys()`, `findOrphanedKeys()`          |
| `app/api/admin/blob-sweep/route.ts`           | Create | POST handler with superadmin auth, dry-run, audit log                         |
| `__tests__/unit/lib/admin/blob-sweep.test.ts` | Create | Unit tests for sweep logic                                                    |

---

## Task 1: Add `streamObject()` to storage library

**Files:**

- Modify: `lib/storage.ts:230-302` (add after `DownloadResult` interface area)
- Modify: `__tests__/unit/lib/storage.test.ts:196-243` (add new describe block)

- [ ] **Step 1.1: Write the failing test for `streamObject()` full download**

Add to `__tests__/unit/lib/storage.test.ts`, after the existing `downloadObject` describe block (after line 242):

```typescript
describe('streamObject', () => {
  /**
   * Helper to create a mock Node.js ReadableStream from a Uint8Array.
   * Azure Blob SDK returns NodeJS.ReadableStream, not Web ReadableStream.
   */
  function createMockNodeStream(data: Uint8Array) {
    return Readable.from([Buffer.from(data)]);
  }

  it('returns a readable stream with metadata for full download', async () => {
    const mockStream = createMockNodeStream(new Uint8Array([1, 2, 3]));
    mockDownload.mockResolvedValue({
      readableStreamBody: mockStream,
      contentType: 'audio/mpeg',
      contentLength: 3,
      acceptRanges: 'bytes',
    });

    const result = await streamObject('audio/test.mp3');

    expect(result.stream).toBe(mockStream);
    expect(result.contentType).toBe('audio/mpeg');
    expect(result.contentLength).toBe(3);
    expect(result.acceptRanges).toBe('bytes');
  });

  it('passes offset and count for range requests', async () => {
    const mockStream = createMockNodeStream(new Uint8Array([1]));
    mockDownload.mockResolvedValue({
      readableStreamBody: mockStream,
      contentType: 'audio/mpeg',
      contentLength: 1,
      contentRange: 'bytes 0-0/3',
    });

    const result = await streamObject('audio/test.mp3', 'bytes=0-0');

    expect(mockDownload).toHaveBeenCalledWith(0, 1);
    expect(result.contentRange).toBe('bytes 0-0/3');
  });

  it('throws when no readable stream is available', async () => {
    mockDownload.mockResolvedValue({
      readableStreamBody: undefined,
    });

    await expect(streamObject('missing/key')).rejects.toThrow('No readable stream');
  });
});
```

Also update the import at the top of the file (line 70-78) to include `streamObject`:

```typescript
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteObject,
  uploadBuffer,
  downloadObject,
  streamObject,
  CONTAINER,
  _resetForTesting,
} from '@/lib/storage';
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/storage.test.ts`
Expected: FAIL — `streamObject` is not exported from `@/lib/storage`

- [ ] **Step 1.3: Implement `streamObject()` in `lib/storage.ts`**

Add the `StreamResult` interface and `streamObject()` function after the `DownloadResult` interface (after line 244). Insert before the `parseRange` function:

```typescript
/**
 * Result of a blob stream operation.
 *
 * Unlike DownloadResult, the body is a raw Node.js ReadableStream that has not
 * been buffered into memory. Callers must consume or pipe the stream.
 */
export interface StreamResult {
  /** The raw Node.js readable stream from the Azure SDK. */
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
 * Streams a blob from Azure Blob Storage without buffering.
 *
 * Returns the raw Node.js ReadableStream from the Azure SDK along with
 * metadata headers. Callers are responsible for converting to a Web
 * ReadableStream if needed (e.g., via Readable.toWeb()).
 *
 * Supports optional HTTP Range header for partial content (audio seeking).
 *
 * @param key - The blob name (path) to download
 * @param range - Optional HTTP Range header value (e.g., "bytes=0-1023")
 * @returns StreamResult with raw stream and metadata
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
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/storage.test.ts`
Expected: ALL PASS (existing tests unchanged, 3 new tests pass)

- [ ] **Step 1.5: Commit**

```bash
git add lib/storage.ts __tests__/unit/lib/storage.test.ts
git commit -m "feat: add streamObject() to storage library for zero-buffer blob streaming"
```

---

## Task 2: Update media proxy route to stream responses

**Files:**

- Modify: `app/api/media/route.ts` (full rewrite of GET handler)

- [ ] **Step 2.1: Update `app/api/media/route.ts` to use streaming**

Replace the full content of `app/api/media/route.ts` with:

```typescript
/**
 * Media proxy endpoint for The Audit Brief.
 *
 * Streams file responses from Azure Blob Storage to avoid buffering large files
 * (up to 500 MB audio) into server memory. Supports range requests for
 * audio seeking.
 *
 * @route GET /api/media?key=audio/uuid/file.m4a
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Readable } from 'stream';
import { streamObject } from '@/lib/storage';
import { createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('media-api');

/**
 * Handles GET requests to stream media files from Azure Blob Storage.
 *
 * Retrieves the file identified by the 'key' query parameter from the Azure Blob container
 * and streams it to the client without buffering. Supports HTTP range requests for audio
 * seeking.
 *
 * @param request - The incoming Next.js request object with a 'key' query parameter
 * @returns Streaming response with appropriate Content-Type, Content-Length, and range headers
 * @throws {ApiError} 400 if the 'key' query parameter is missing
 * @throws {ApiError} 500 if the retrieval fails
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) {
    return createErrorResponse(badRequest('key parameter required'));
  }

  try {
    const range = request.headers.get('range');
    const result = await streamObject(key, range);

    const contentType =
      result.contentType && result.contentType !== 'application/octet-stream'
        ? result.contentType
        : inferContentType(key);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };

    if (result.contentLength !== undefined) {
      headers['Content-Length'] = String(result.contentLength);
    }
    if (result.contentRange) {
      headers['Content-Range'] = result.contentRange;
    }
    if (result.acceptRanges) {
      headers['Accept-Ranges'] = result.acceptRanges;
    }

    // Convert Node.js ReadableStream to Web ReadableStream for NextResponse.
    // Readable.toWeb() is available in Node 20 LTS.
    const webStream = Readable.toWeb(
      result.stream instanceof Readable ? result.stream : Readable.from(result.stream)
    );

    return new NextResponse(webStream as ReadableStream, {
      status: range && result.contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    log.error({ error }, 'Media proxy failed');
    return createErrorResponse(internalError('Failed to retrieve file'));
  }
}

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/**
 * Infers the MIME content type from a blob key's file extension.
 *
 * @param key - The blob key (e.g., "audio/uuid/file.m4a")
 * @returns The inferred MIME type, or 'application/octet-stream' as fallback
 */
function inferContentType(key: string): string {
  const ext = key.substring(key.lastIndexOf('.')).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}
```

- [ ] **Step 2.2: Run all tests to verify nothing is broken**

Run: `npx vitest run`
Expected: ALL PASS — the media route has no dedicated unit tests (it's an API route tested via integration), so the existing storage tests validate the underlying function.

- [ ] **Step 2.3: Commit**

```bash
git add app/api/media/route.ts
git commit -m "feat: stream media proxy responses instead of buffering into memory"
```

---

## Task 3: Export `toKey()` from storage-cleanup and add `listAllBlobKeys()` to storage

**Files:**

- Modify: `lib/storage-cleanup.ts:53` (change `function` to `export function`)
- Modify: `lib/storage.ts` (add `listAllBlobKeys()`)
- Modify: `__tests__/unit/lib/storage.test.ts` (add test for `listAllBlobKeys()`)

- [ ] **Step 3.1: Write the failing test for `listAllBlobKeys()`**

Add to `__tests__/unit/lib/storage.test.ts`, after the `streamObject` describe block:

```typescript
describe('listAllBlobKeys', () => {
  it('returns all blob names in the container', async () => {
    const mockIter = {
      async *[Symbol.asyncIterator]() {
        yield { name: 'audio/uuid1/file.mp3' };
        yield { name: 'image/uuid2/thumb.jpg' };
        yield { name: 'pdf/uuid3/doc.pdf' };
      },
    };
    mockGetContainerClient.mockReturnValue({
      getBlockBlobClient: mockGetBlockBlobClient,
      createIfNotExists: mockCreateIfNotExists,
      listBlobsFlat: vi.fn().mockReturnValue(mockIter),
    });

    const keys = await listAllBlobKeys();

    expect(keys).toEqual(['audio/uuid1/file.mp3', 'image/uuid2/thumb.jpg', 'pdf/uuid3/doc.pdf']);
  });

  it('returns empty array when container has no blobs', async () => {
    const mockIter = {
      async *[Symbol.asyncIterator]() {
        // empty
      },
    };
    mockGetContainerClient.mockReturnValue({
      getBlockBlobClient: mockGetBlockBlobClient,
      createIfNotExists: mockCreateIfNotExists,
      listBlobsFlat: vi.fn().mockReturnValue(mockIter),
    });

    const keys = await listAllBlobKeys();

    expect(keys).toEqual([]);
  });
});
```

Update the import at the top to include `listAllBlobKeys`:

```typescript
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteObject,
  uploadBuffer,
  downloadObject,
  streamObject,
  listAllBlobKeys,
  CONTAINER,
  _resetForTesting,
} from '@/lib/storage';
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/storage.test.ts`
Expected: FAIL — `listAllBlobKeys` is not exported from `@/lib/storage`

- [ ] **Step 3.3: Export `toKey()` from `lib/storage-cleanup.ts`**

In `lib/storage-cleanup.ts`, change line 53 from:

```typescript
function toKey(input: string | null | undefined): string | null {
```

to:

```typescript
export function toKey(input: string | null | undefined): string | null {
```

- [ ] **Step 3.4: Implement `listAllBlobKeys()` in `lib/storage.ts`**

Add the following function at the end of `lib/storage.ts` (after `streamObject`):

```typescript
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
  const containerClient = getBlobServiceClient().getContainerClient(CONTAINER);
  const keys: string[] = [];

  for await (const blob of containerClient.listBlobsFlat()) {
    keys.push(blob.name);
  }

  return keys;
}
```

- [ ] **Step 3.5: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/storage.test.ts`
Expected: ALL PASS

- [ ] **Step 3.6: Commit**

```bash
git add lib/storage.ts lib/storage-cleanup.ts __tests__/unit/lib/storage.test.ts
git commit -m "feat: export toKey() and add listAllBlobKeys() for orphan sweep"
```

---

## Task 4: Add `blob_sweep` to audit log types

**Files:**

- Modify: `lib/admin/audit-log.ts:36-47`

- [ ] **Step 4.1: Extend `AuditAction` and `AuditEntityType` in `lib/admin/audit-log.ts`**

Change the `AuditAction` type (line 36-41) from:

```typescript
export type AuditAction = 'create' | 'update' | 'archive' | 'unarchive' | 'hard_delete';
```

to:

```typescript
export type AuditAction =
  | 'create'
  | 'update'
  | 'archive'
  | 'unarchive'
  | 'hard_delete'
  | 'blob_sweep';
```

Change `AuditEntityType` (line 47) from:

```typescript
export type AuditEntityType = 'audit_brief' | 'learning_graph' | 'transcript' | 'episode';
```

to:

```typescript
export type AuditEntityType =
  | 'audit_brief'
  | 'learning_graph'
  | 'transcript'
  | 'episode'
  | 'blob_storage';
```

- [ ] **Step 4.2: Run type check to verify no breakage**

Run: `npx tsc --noEmit`
Expected: No errors (the union is widened, not narrowed — no existing code breaks)

- [ ] **Step 4.3: Commit**

```bash
git add lib/admin/audit-log.ts
git commit -m "feat: add blob_sweep action and blob_storage entity type to audit log"
```

---

## Task 5: Implement blob sweep core logic

**Files:**

- Create: `lib/admin/blob-sweep.ts`
- Create: `__tests__/unit/lib/admin/blob-sweep.test.ts`

- [ ] **Step 5.1: Write the failing tests for blob sweep logic**

Create `__tests__/unit/lib/admin/blob-sweep.test.ts`:

```typescript
/**
 * Unit tests for the orphan blob sweep logic.
 *
 * Verifies:
 * - collectAllReferencedKeys aggregates keys from all 3 models
 * - collectAllReferencedKeys normalizes keys via toKey()
 * - findOrphanedKeys identifies blobs not referenced by any DB record
 * - findOrphanedKeys returns empty array when all blobs are referenced
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    auditBrief: { findMany: vi.fn() },
    learningGraph: { findMany: vi.fn() },
    episode: { findMany: vi.fn() },
  },
}));

import { prisma } from '@/lib/db';
import { collectAllReferencedKeys, findOrphanedKeys } from '@/lib/admin/blob-sweep';

describe('Blob Sweep Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('collectAllReferencedKeys', () => {
    it('aggregates keys from all three models', async () => {
      vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([
        {
          thumbnailUrl: 'image/uuid1/thumb.jpg',
          audioShortUrl: 'audio/uuid1/short.m4a',
          audioLongUrl: 'audio/uuid1/long.m4a',
          bulletinUrls: ['pdf/uuid1/doc1.pdf', 'pdf/uuid1/doc2.pdf'],
        },
      ] as never);

      vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([
        { thumbnailUrl: 'image/uuid2/graph-thumb.jpg' },
      ] as never);

      vi.mocked(prisma.episode.findMany).mockResolvedValue([
        { thumbnailUrl: 'image/uuid3/ep-thumb.jpg', audioUrl: 'audio/uuid3/ep.m4a' },
      ] as never);

      const keys = await collectAllReferencedKeys();

      expect(keys).toContain('image/uuid1/thumb.jpg');
      expect(keys).toContain('audio/uuid1/short.m4a');
      expect(keys).toContain('audio/uuid1/long.m4a');
      expect(keys).toContain('pdf/uuid1/doc1.pdf');
      expect(keys).toContain('pdf/uuid1/doc2.pdf');
      expect(keys).toContain('image/uuid2/graph-thumb.jpg');
      expect(keys).toContain('image/uuid3/ep-thumb.jpg');
      expect(keys).toContain('audio/uuid3/ep.m4a');
      expect(keys.size).toBe(8);
    });

    it('skips null and absolute URL fields', async () => {
      vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([
        {
          thumbnailUrl: 'https://external.com/img.jpg',
          audioShortUrl: 'audio/uuid/short.m4a',
          audioLongUrl: null,
          bulletinUrls: [],
        },
      ] as never);

      vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([{ thumbnailUrl: null }] as never);

      vi.mocked(prisma.episode.findMany).mockResolvedValue([] as never);

      const keys = await collectAllReferencedKeys();

      expect(keys.size).toBe(1);
      expect(keys).toContain('audio/uuid/short.m4a');
    });

    it('deduplicates keys referenced by multiple records', async () => {
      const sharedKey = 'image/uuid/shared-thumb.jpg';

      vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([
        {
          thumbnailUrl: sharedKey,
          audioShortUrl: 'audio/uuid/a.m4a',
          audioLongUrl: null,
          bulletinUrls: [],
        },
      ] as never);

      vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([
        { thumbnailUrl: sharedKey },
      ] as never);

      vi.mocked(prisma.episode.findMany).mockResolvedValue([] as never);

      const keys = await collectAllReferencedKeys();

      expect(keys.size).toBe(2);
    });
  });

  describe('findOrphanedKeys', () => {
    it('returns blob keys not in the referenced set', () => {
      const allBlobKeys = [
        'audio/uuid1/file.m4a',
        'image/uuid2/thumb.jpg',
        'audio/orphan/old-file.m4a',
      ];
      const referencedKeys = new Set(['audio/uuid1/file.m4a', 'image/uuid2/thumb.jpg']);

      const orphans = findOrphanedKeys(allBlobKeys, referencedKeys);

      expect(orphans).toEqual(['audio/orphan/old-file.m4a']);
    });

    it('returns empty array when all blobs are referenced', () => {
      const allBlobKeys = ['audio/uuid1/file.m4a'];
      const referencedKeys = new Set(['audio/uuid1/file.m4a']);

      const orphans = findOrphanedKeys(allBlobKeys, referencedKeys);

      expect(orphans).toEqual([]);
    });

    it('returns all blobs when none are referenced', () => {
      const allBlobKeys = ['audio/orphan1.m4a', 'image/orphan2.jpg'];
      const referencedKeys = new Set<string>();

      const orphans = findOrphanedKeys(allBlobKeys, referencedKeys);

      expect(orphans).toEqual(['audio/orphan1.m4a', 'image/orphan2.jpg']);
    });
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/admin/blob-sweep.test.ts`
Expected: FAIL — module `@/lib/admin/blob-sweep` does not exist

- [ ] **Step 5.3: Implement `lib/admin/blob-sweep.ts`**

Create `lib/admin/blob-sweep.ts`:

```typescript
/**
 * Orphan blob sweep logic for Azure Blob Storage.
 *
 * Key responsibilities:
 * - Collect all storage keys referenced by database records across AuditBrief,
 *   LearningGraph, and Episode models.
 * - Compare blob storage contents against referenced keys to find orphans.
 * - Used by the POST /api/admin/blob-sweep endpoint.
 *
 * Dependencies:
 * - lib/db (Prisma client)
 * - lib/storage-cleanup (toKey normalizer)
 */
import { prisma } from '@/lib/db';
import { toKey } from '@/lib/storage-cleanup';

/**
 * Queries all three models that store blob references and returns every
 * referenced storage key as a deduplicated Set.
 *
 * All records are included (active + archived) because archived content
 * still owns its blobs. Absolute URLs and nulls are filtered out via toKey().
 *
 * @returns Set of bare storage keys referenced by at least one DB record
 */
export async function collectAllReferencedKeys(): Promise<Set<string>> {
  const keys = new Set<string>();

  const addKey = (value: string | null | undefined): void => {
    const key = toKey(value);
    if (key) keys.add(key);
  };

  // AuditBrief: thumbnailUrl, audioShortUrl, audioLongUrl, bulletinUrls
  const auditBriefs = await prisma.auditBrief.findMany({
    select: {
      thumbnailUrl: true,
      audioShortUrl: true,
      audioLongUrl: true,
      bulletinUrls: true,
    },
  });

  for (const brief of auditBriefs) {
    addKey(brief.thumbnailUrl);
    addKey(brief.audioShortUrl);
    addKey(brief.audioLongUrl);
    for (const url of brief.bulletinUrls) {
      addKey(url);
    }
  }

  // LearningGraph: thumbnailUrl
  const learningGraphs = await prisma.learningGraph.findMany({
    select: { thumbnailUrl: true },
  });

  for (const graph of learningGraphs) {
    addKey(graph.thumbnailUrl);
  }

  // Episode: thumbnailUrl, audioUrl
  const episodes = await prisma.episode.findMany({
    select: { thumbnailUrl: true, audioUrl: true },
  });

  for (const episode of episodes) {
    addKey(episode.thumbnailUrl);
    addKey(episode.audioUrl);
  }

  return keys;
}

/**
 * Finds blob keys that exist in storage but are not referenced by any DB record.
 *
 * @param allBlobKeys - Every blob name in the container (from listAllBlobKeys)
 * @param referencedKeys - Set of keys referenced by DB records (from collectAllReferencedKeys)
 * @returns Array of orphaned blob keys to delete
 */
export function findOrphanedKeys(allBlobKeys: string[], referencedKeys: Set<string>): string[] {
  return allBlobKeys.filter((key) => !referencedKeys.has(key));
}
```

- [ ] **Step 5.4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/admin/blob-sweep.test.ts`
Expected: ALL PASS (6 tests)

- [ ] **Step 5.5: Commit**

```bash
git add lib/admin/blob-sweep.ts __tests__/unit/lib/admin/blob-sweep.test.ts
git commit -m "feat: add blob sweep core logic for orphan detection"
```

---

## Task 6: Create the blob sweep API route

**Files:**

- Create: `app/api/admin/blob-sweep/route.ts`

- [ ] **Step 6.1: Create `app/api/admin/blob-sweep/route.ts`**

```typescript
/**
 * Orphan blob sweep API endpoint for The Audit Brief.
 *
 * Performs a ground-truth comparison between Azure Blob Storage and the database
 * to find and optionally delete blobs not referenced by any record.
 *
 * Default is dry-run mode (safe). Pass ?dry-run=false to actually delete orphans.
 * Requires superadmin role.
 *
 * @route POST /api/admin/blob-sweep           — dry-run (default)
 * @route POST /api/admin/blob-sweep?dry-run=false — delete orphans
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { ApiError, createErrorResponse, internalError } from '@/lib/api/errors';
import { listAllBlobKeys } from '@/lib/storage';
import { deleteKeys } from '@/lib/storage-cleanup';
import { collectAllReferencedKeys, findOrphanedKeys } from '@/lib/admin/blob-sweep';
import { writeAuditLog } from '@/lib/admin/audit-log';
import { createRequestLogger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';

/**
 * Handles POST requests to sweep orphaned blobs from Azure Blob Storage.
 *
 * Lists all blobs in the container, queries all storage key columns from
 * AuditBrief, LearningGraph, and Episode, and identifies blobs not referenced
 * by any record. In dry-run mode (default) returns the orphan list without
 * deleting. With ?dry-run=false, deletes orphans and returns results.
 *
 * @param request - The incoming Next.js request
 * @returns JSON response with sweep results
 * @throws {ApiError} 401 if not authenticated
 * @throws {ApiError} 403 if not superadmin
 * @throws {ApiError} 500 if the sweep fails
 */
export const POST = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  const log = createRequestLogger('blob-sweep-api', request);
  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const user = await requireAuth();
    requireRole(user, ['superadmin']);

    const dryRun = request.nextUrl.searchParams.get('dry-run') !== 'false';

    log.info({ dryRun }, 'Blob sweep started');

    const [allBlobKeys, referencedKeys] = await Promise.all([
      listAllBlobKeys(),
      collectAllReferencedKeys(),
    ]);

    const orphanedKeys = findOrphanedKeys(allBlobKeys, referencedKeys);

    log.info(
      {
        totalBlobs: allBlobKeys.length,
        referencedBlobs: referencedKeys.size,
        orphanedCount: orphanedKeys.length,
        dryRun,
      },
      'Blob sweep analysis complete'
    );

    let deletedCount = 0;
    let failedCount = 0;

    if (!dryRun && orphanedKeys.length > 0) {
      const result = await deleteKeys(orphanedKeys, log);
      deletedCount = result.deleted.length;
      failedCount = result.failed.length;
    }

    await writeAuditLog({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'blob_sweep',
      entityType: 'blob_storage',
      entityId: 'container',
      before: { orphanedKeys },
      after: { deletedCount, failedCount, dryRun },
      requestId,
      log,
    });

    return NextResponse.json({
      data: {
        dryRun,
        totalBlobs: allBlobKeys.length,
        referencedBlobs: referencedKeys.size,
        orphanedCount: orphanedKeys.length,
        deletedCount,
        failedCount,
        orphanedKeys,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    log.error({ err: error }, 'Blob sweep failed');
    return createErrorResponse(internalError(), requestId);
  }
});
```

- [ ] **Step 6.2: Run type check to verify no errors**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 6.3: Commit**

```bash
git add app/api/admin/blob-sweep/route.ts
git commit -m "feat: add POST /api/admin/blob-sweep endpoint for orphan cleanup"
```

---

## Task 7: Run full test suite and verify

- [ ] **Step 7.1: Run all unit tests**

Run: `npx vitest run`
Expected: ALL PASS — no regressions in existing tests, all new tests pass

- [ ] **Step 7.2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7.3: Run linter**

Run: `npx eslint . --max-warnings 0`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 7.4: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "chore: lint fixes for streaming proxy and blob sweep"
```
