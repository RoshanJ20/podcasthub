# Streaming Media Proxy & Orphan Blob Sweep

**Date**: 2026-04-16
**Status**: Approved
**Author**: Claude (paired with ankith.mathew@walkerchandiok.in)

## Context

The Audit Brief stores all uploaded files (audio, images, PDFs) in a single Azure Blob Storage container (`the-audit-brief-uploads`). Files are served to browsers through a media proxy at `GET /api/media?key=<storageKey>` and cleaned up when records are edited or deleted.

Two integrity gaps were identified during a storage system audit:

1. **Memory-buffering proxy**: The media proxy (`app/api/media/route.ts`) downloads the entire blob into a `Buffer` before responding. A 500 MB audio file consumes 500 MB of server RAM per concurrent request, risking OOM under load.

2. **No orphan sweep**: When the process crashes between a DB delete and blob cleanup, or when `deleteKeys()` partially fails, blobs become permanently orphaned. The comment in `lib/storage-cleanup.ts:133` references a "periodic sweep" that does not exist.

## Fix 1: Streaming Media Proxy

### Problem

`downloadObject()` in `lib/storage.ts:274-302` buffers the entire blob into memory:

```typescript
const chunks: Buffer[] = [];
for await (const chunk of stream as AsyncIterable<Buffer>) {
  chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
}
const body = Buffer.concat(chunks);
```

This means a single request for a large audio file holds the full file in RAM until the response completes.

### Solution

Add a new `streamObject()` function to `lib/storage.ts` that returns the raw `NodeJS.ReadableStream` from the Azure SDK plus metadata — without buffering. Update `app/api/media/route.ts` to convert the Node stream to a Web `ReadableStream` and pass it directly to `NextResponse`.

### Design

#### New interface and function in `lib/storage.ts`

```typescript
interface StreamResult {
  stream: NodeJS.ReadableStream;
  contentType?: string;
  contentLength?: number;
  contentRange?: string;
  acceptRanges?: string;
}

async function streamObject(key: string, range?: string | null): Promise<StreamResult>;
```

- Calls `blobClient.download(offset?, count?)` — same as `downloadObject()`
- Returns the `readableStreamBody` directly instead of buffering it
- Includes all the same metadata fields for headers
- Throws if `readableStreamBody` is undefined (same guard as `downloadObject()`)

#### Updated `app/api/media/route.ts`

- Imports `streamObject` instead of `downloadObject`
- Converts Node stream to Web stream via `Readable.toWeb()` (Node 20 LTS)
- Passes the Web `ReadableStream` to `new NextResponse(webStream, { status, headers })`
- Range request support preserved: Azure SDK handles partial reads server-side, we pass the partial stream through with `Content-Range` and status 206

#### Backward compatibility

- `downloadObject()` is kept as-is — tests reference it, and it may be useful for future cases that genuinely need a buffer (e.g., computing checksums)
- No changes to `DownloadResult` interface or existing callers

### Files changed

| File                                 | Change                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `lib/storage.ts`                     | Add `StreamResult` interface + `streamObject()` function                          |
| `app/api/media/route.ts`             | Switch from `downloadObject()` to `streamObject()`, Node-to-Web stream conversion |
| `__tests__/unit/lib/storage.test.ts` | Add tests for `streamObject()`                                                    |

## Fix 2: Orphan Blob Sweep

### Problem

Blob cleanup is best-effort and post-commit. Three failure modes create permanent orphans:

1. Process crashes after DB row deletion but before `deleteKeys()` runs
2. `deleteKeys()` partially fails (some blobs deleted, some not)
3. Any future bug that writes a blob key to storage but never persists it to the DB

No mechanism exists to discover or clean up these orphans. Storage costs grow unboundedly.

### Solution

A `POST /api/admin/blob-sweep` endpoint that performs a ground-truth comparison between Azure Blob Storage and the database, deleting any blob not referenced by any record.

### Design

#### Core logic in `lib/admin/blob-sweep.ts`

Three functions:

**`listAllBlobKeys()`**: Lists every blob name in the container via `containerClient.listBlobsFlat()`. Returns `string[]`. At <1,000 blobs this fits comfortably in memory.

**`collectAllReferencedKeys()`**: Queries all three models that store blob references and aggregates every key into a `Set<string>`:

| Model           | Fields queried                                                  |
| --------------- | --------------------------------------------------------------- |
| `AuditBrief`    | `thumbnailUrl`, `audioShortUrl`, `audioLongUrl`, `bulletinUrls` |
| `LearningGraph` | `thumbnailUrl`                                                  |
| `Episode`       | `thumbnailUrl`, `audioUrl`                                      |

All records are included (active + archived) since archived content still references valid blobs. Uses the `toKey()` normalizer from `lib/storage-cleanup.ts` (currently unexported — must be exported as part of this change) to strip absolute URLs and normalize keys consistently.

**`findOrphanedKeys(allBlobKeys, referencedKeys)`**: Returns blob keys present in storage but absent from the referenced set.

#### API route: `app/api/admin/blob-sweep/route.ts`

```
POST /api/admin/blob-sweep           → dry-run (default, safe)
POST /api/admin/blob-sweep?dry-run=false → actually delete orphans
```

- **Authentication**: `requireAuth()` + `requireRole(user, ['superadmin'])` — destructive maintenance, superadmin only
- **Default is dry-run**: Returns orphaned keys without deleting. Must explicitly pass `?dry-run=false` to delete.
- **Deletion**: Reuses `deleteKeys()` from `lib/storage-cleanup.ts` for consistent error handling (BlobNotFound is idempotent, failures are swallowed and logged)
- **Audit logging**: Writes an `AdminAuditLog` entry with action `blob_sweep`, recording orphan count, deleted count, and failed count
- **Request logging**: Wrapped with `withRequestLogging` for structured operation tracking

#### Response schema

```json
{
  "data": {
    "dryRun": true,
    "totalBlobs": 847,
    "referencedBlobs": 842,
    "orphanedCount": 5,
    "deletedCount": 0,
    "failedCount": 0,
    "orphanedKeys": ["audio/abc-123/old-file.m4a", "image/def-456/replaced-thumb.jpg"]
  }
}
```

When `dryRun: false`, `deletedCount` and `failedCount` reflect actual deletion results.

#### What this does NOT include

- No scheduled/cron trigger — admins run it manually or wire to an external scheduler (pm2 cron, Azure Timer Trigger)
- No archive TTL — archived records' blobs are treated as referenced
- No pagination — at <1,000 blobs, everything fits in memory
- No `User.image` field — this stores NextAuth/Azure AD avatar URLs, not blob keys

### Files changed

| File                                          | Change                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `lib/storage-cleanup.ts`                      | Export `toKey()` (currently private) for reuse by sweep logic                     |
| `lib/admin/blob-sweep.ts`                     | New file: `listAllBlobKeys()`, `collectAllReferencedKeys()`, `findOrphanedKeys()` |
| `app/api/admin/blob-sweep/route.ts`           | New file: POST handler with auth, dry-run, audit log                              |
| `__tests__/unit/lib/admin/blob-sweep.test.ts` | New file: unit tests with mocked blob listing and DB queries                      |

## Verification

### Streaming media proxy

1. Start dev server with `npm run dev` + `docker compose up -d` (Azurite)
2. Upload an audio file via the admin wizard
3. Play the audio on a bulletin page — verify playback and seeking work
4. Open browser DevTools Network tab — confirm the response is streamed (no long TTFB wait for large files)
5. Verify thumbnails render correctly (Next.js image optimizer still works)
6. Verify PDF viewer loads bulletins
7. Run `npm test` — all existing storage tests pass + new `streamObject()` tests pass

### Orphan blob sweep

1. Upload a file via the wizard, note its storage key
2. Hard-delete the audit brief via the admin UI
3. Manually re-upload a file to Azurite that has no DB record (simulating a crash orphan)
4. Call `POST /api/admin/blob-sweep` (dry-run) — verify the orphaned key appears in the response
5. Call `POST /api/admin/blob-sweep?dry-run=false` — verify the orphan is deleted
6. Verify non-superadmin users get 403
7. Run `npm test` — all sweep unit tests pass
