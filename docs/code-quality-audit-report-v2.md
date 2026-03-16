# Code Quality Audit Report v2

**Date:** 2026-03-16
**Audited by:** Claude (Opus 4.6, 3 parallel audit passes)
**Codebase:** Podcast Hub v2
**Scope:** All source files (excluding node_modules, .next, prisma/migrations, components/ui/)

---

## Table of Contents

- [Summary](#summary)
- [Top 10 Highest-Impact Issues](#top-10-highest-impact-issues)
- [Findings: Logging & Observability (Rule 7)](#findings-logging--observability-rule-7)
- [Findings: Error Handling (Rule 6)](#findings-error-handling-rule-6)
- [Findings: Code Documentation (Rule 4)](#findings-code-documentation-rule-4)
- [Findings: Naming Conventions (Rule 2)](#findings-naming-conventions-rule-2)
- [Findings: SOLID Principles (Rule 1)](#findings-solid-principles-rule-1)
- [Findings: Project Structure (Rule 5)](#findings-project-structure-rule-5)
- [Positive Findings](#positive-findings)

---

## Summary

| Severity     | Logging (R7) | Errors (R6) | Docs (R4) | Naming (R2) | SOLID (R1) | Structure (R5) | Total |
| ------------ | ------------ | ----------- | --------- | ----------- | ---------- | -------------- | ----- |
| **CRITICAL** | 4            | 4           | 4         | 0           | 5          | 6              | ~23   |
| **WARNING**  | 6            | 8           | 22        | 12          | 7          | 10             | ~65   |
| **INFO**     | 3            | 5           | 0         | 5           | 1          | 3              | ~17   |

---

## Top 10 Highest-Impact Issues

| #   | Issue                                                                         | Files Affected              | Why It Matters                                           |
| --- | ----------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------- |
| 1   | **Logger exists but unused** — 23/25 API routes have zero structured logging  | All API routes              | Zero production observability                            |
| 2   | **No correlation ID propagation** — `requestId` param exists but never passed | System-wide                 | Cannot trace requests across logs                        |
| 3   | **6 `console.error` calls** in production API routes                          | 6 route files               | Unstructured, no context, potential PII leak             |
| 4   | **Logger missing `service_name`** in base config                              | lib/logger.ts               | Every log entry missing required field per Rule 7.1.3    |
| 5   | **`formatTime` duplicated in 6 files**                                        | 6 component files           | Change must be made in six places                        |
| 6   | **2 duplicate S3Client instances** instead of using `lib/storage.ts`          | upload/file, media          | DIP violation, config drift risk                         |
| 7   | **~20+ inline fetch calls** in components with no service abstraction         | 15+ component files         | DIP violation, untestable, no error handling consistency |
| 8   | **Bulk mutations outside transaction** in learning-graphs PUT                 | learning-graphs/[id]/data   | Partial update leaves corrupt state                      |
| 9   | **Missing timeouts on external calls**                                        | 3 files (hooks, stores)     | Hangs indefinitely if server unresponsive                |
| 10  | **506-line and 425-line files** with 128/146-line functions                   | podcast-upload-form, wizard | Exceeds 300/50 line limits, SRP violations               |

---

## Findings: Logging & Observability (Rule 7)

### CRITICAL

| Issue                                        | Details                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 6 `console.error` calls in production routes | `auth/login:103`, `auth/register:113`, `auth/refresh:92`, `upload:114`, `upload/file:84`, `media:76` |
| Logger missing `service_name` in base config | `lib/logger.ts` base object only includes `env`, missing required `service_name`                     |
| Zero correlation ID propagation              | `createErrorResponse` accepts `requestId` but no caller passes it                                    |
| 23/25 API routes have no structured logging  | Only `learning-graphs/[id]/data` imports and uses logger                                             |

### WARNING

| Issue                                              | Details                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| No INFO-level logs on happy path                   | Logins, uploads, CRUD operations — zero observability when working |
| No scoped/child loggers per request                | `createLogger` scopes by module, not by request context            |
| Potential PII in error logs                        | `console.error` may dump JWT fragments or email addresses          |
| S3 `NoSuchKey` logged as ERROR in media route      | Expected "not found" condition — should be WARN                    |
| `podcast-upload-form.tsx:229` uses `console.error` | Client component using console instead of logger                   |
| `error.tsx` uses `console.error`                   | Root error boundary using unstructured logging                     |

### INFO

| Issue                                | Details                                                |
| ------------------------------------ | ------------------------------------------------------ |
| No RED metrics instrumentation       | Rate, error rate, duration percentiles — none tracked  |
| No distributed tracing               | No OpenTelemetry — Azure OpenAI and S3 calls are blind |
| Log level only changeable on restart | Module caching prevents runtime level changes          |

---

## Findings: Error Handling (Rule 6)

### CRITICAL

| File                                    | Line(s)    | Rule         | Description                                                  |
| --------------------------------------- | ---------- | ------------ | ------------------------------------------------------------ |
| `app/api/learning-graphs/[id]/route.ts` | 104-109    | 6.1.1, 6.3.4 | DELETE catch maps ALL DB errors to 404, discards stack trace |
| `app/api/media/route.ts`                | 29, 43, 77 | 6.3.1        | Raw `{ error }` schema bypasses `ApiErrorResponse` standard  |
| `app/api/learning-graphs/[id]/route.ts` | 70         | 6.1.3        | `ErrorCode` bypassed with `'BAD_REQUEST' as never` cast      |
| `app/api/bookmarks/[id]/route.ts`       | 37         | 6.1.3        | `ErrorCode` bypassed with `'BAD_REQUEST' as never` cast      |

### WARNING

| File                                         | Line(s) | Rule  | Description                                                 |
| -------------------------------------------- | ------- | ----- | ----------------------------------------------------------- |
| `app/api/admin/analytics/route.ts`           | 27-39   | 6.5.1 | Unvalidated `from`/`to` date strings passed to `new Date()` |
| `stores/graph-editor-store.ts`               | 100-103 | 6.1.1 | Auto-save catch swallows errors silently                    |
| `hooks/use-hls-player.ts`                    | 57      | 6.1.1 | `.catch(() => {})` silently discards audio play errors      |
| `hooks/use-listen-tracker.ts`                | 38-40   | 6.1.1 | Fire-and-forget catch with zero logging                     |
| `lib/embeddings.ts`                          | 41-48   | 6.4.1 | No `AbortController` timeout on Azure OpenAI `fetch`        |
| `lib/embeddings.ts`                          | 56-59   | 6.4.2 | Linear retry backoff, no jitter                             |
| `lib/db.ts`                                  | 22      | 6.6.3 | `pg.Pool` created with no explicit size, timeout config     |
| `app/api/learning-graphs/[id]/data/route.ts` | 97-147  | 6.4.5 | Bulk episode/edge mutation outside Prisma transaction       |

### INFO

| File                           | Line(s) | Rule  | Description                                |
| ------------------------------ | ------- | ----- | ------------------------------------------ |
| `hooks/use-file-upload.ts`     | 81      | 6.4.1 | XHR upload has no timeout configured       |
| `stores/graph-editor-store.ts` | 183     | 6.4.1 | Save `fetch` has no timeout                |
| `hooks/use-listen-tracker.ts`  | 30      | 6.4.1 | Activity `fetch` has no timeout            |
| `app/api/health/route.ts`      | —       | 7.4.1 | No `/api/ready` readiness endpoint         |
| `hooks/use-file-upload.ts`     | 65, 72  | 6.1.1 | JSON parse failures discard original error |

---

## Findings: Code Documentation (Rule 4)

### CRITICAL — Type Casts Without Comments (Rule 4.6.3)

| File                                    | Line | Cast                     | Issue                           |
| --------------------------------------- | ---- | ------------------------ | ------------------------------- |
| `app/api/learning-graphs/[id]/route.ts` | 70   | `'BAD_REQUEST' as never` | No WORKAROUND comment or ticket |
| `app/api/bookmarks/[id]/route.ts`       | 37   | `'BAD_REQUEST' as never` | No WORKAROUND comment or ticket |
| `app/api/podcasts/route.ts`             | 119  | `result.data as any`     | No WORKAROUND comment           |
| `app/api/podcasts/[id]/route.ts`        | 79   | `result.data as any`     | No WORKAROUND comment           |

### WARNING — Missing JSDoc on Exported Handlers (Rule 4.3)

**API Routes (15 files, ~30 handlers missing JSDoc):**

- `bookmarks/route.ts` — GET, POST
- `bookmarks/[id]/route.ts` — PUT, DELETE
- `progress/route.ts` — GET, POST
- `progress/[id]/route.ts` — DELETE
- `activity/route.ts` — POST
- `users/route.ts` — GET
- `users/[id]/role/route.ts` — PUT
- `admin/analytics/route.ts` — GET
- `media/route.ts` — GET
- `upload/file/route.ts` — POST
- `podcasts/route.ts` — GET, POST
- `podcasts/[id]/route.ts` — GET, PUT, DELETE
- `podcasts/batch/route.ts` — PATCH
- `learning-graphs/route.ts` — GET, POST
- `learning-graphs/[id]/route.ts` — GET, PUT, DELETE

**Components (7 files):**

- `analytics-charts.tsx` — `AnalyticsCharts`
- `users-table.tsx` — `UsersTable`
- `date-range-picker.tsx` — `DateRangePicker`
- `search-results.tsx` — `BasicResults`, `SemanticResults`
- `search-input.tsx` — `SearchInput`
- `pagination-controls.tsx` — `PaginationControls`
- `category-grid.tsx` — `CategoryGrid`

### WARNING — Missing/Incomplete Module Docstrings (Rule 4.1)

- `lib/utils.ts` — no docstring
- `components/admin/analytics-charts.tsx` — missing
- `components/admin/date-range-picker.tsx` — missing
- `components/admin/users-table.tsx` — missing
- `components/search/search-results.tsx` — missing
- `components/search/search-input.tsx` — missing

---

## Findings: Naming Conventions (Rule 2)

### WARNING — Generic Variable Names (Rule 2.1.3)

| File                                            | Line   | Current     | Suggested     |
| ----------------------------------------------- | ------ | ----------- | ------------- |
| `app/api/search/route.ts`                       | 24     | `q`         | `searchQuery` |
| `app/api/users/route.ts`                        | 52     | `(u) =>`    | `(user) =>`   |
| `app/api/learning-graphs/[id]/data/route.ts`    | 92     | `(e) =>`    | `(episode)`   |
| `components/admin/users-table.tsx`              | 77     | `u` in map  | `user`        |
| `components/admin/podcast-table.tsx`            | 78     | `p` in map  | `podcast`     |
| `components/learning-path/path-list-client.tsx` | 36     | `p` in loop | `progress`    |
| `components/search/search-results.tsx`          | 38, 65 | `r` in map  | `result`      |

### INFO — Abbreviated Names (Rule 2.1.2)

| File                                               | Line   | Current             | Suggested                                           |
| -------------------------------------------------- | ------ | ------------------- | --------------------------------------------------- |
| `components/audio-player/audio-player.tsx`         | 195    | `ts`                | `timestampSeconds`                                  |
| `components/audio-player/bookmark-panel.tsx`       | 57, 79 | `res`, `json`, `ts` | `response`, `bookmarksResponse`, `timestampSeconds` |
| `components/admin/analytics-charts.tsx`            | 34, 41 | `res`, `json`       | `response`, `analyticsResponse`                     |
| `components/learning-path/path-list-client.tsx`    | 33     | `json`, `res`       | `progressResponse`, `response`                      |
| `components/learning-path/path-viewer-wrapper.tsx` | 43     | `json`, `res`       | `progressResponse`, `response`                      |

---

## Findings: SOLID Principles (Rule 1)

### CRITICAL — DIP Violations (Rule 1.5)

| File                           | Line(s) | Description                                                        |
| ------------------------------ | ------- | ------------------------------------------------------------------ |
| `app/api/upload/file/route.ts` | 26-34   | Duplicate `new S3Client()` — `lib/storage.ts` already exports one  |
| `app/api/media/route.ts`       | 16-24   | Third `new S3Client()` instance — same config duplicated           |
| `lib/embeddings.ts`            | 29-38   | Reads env vars inside function body, no EmbeddingService interface |
| `stores/graph-editor-store.ts` | 183     | Hardcoded `fetch()` with concrete URL — no persistence abstraction |

### CRITICAL — SRP Violations (Rule 1.1)

| File                                         | Line(s) | Description                                         |
| -------------------------------------------- | ------- | --------------------------------------------------- |
| `components/admin/podcast-upload-wizard.tsx` | 194-330 | `handleFinalSubmit` — 146 lines, 5 responsibilities |
| `components/admin/podcast-upload-form.tsx`   | 144-271 | `onSubmit` — 128 lines, 5 responsibilities          |

### WARNING

| File                                         | Rule  | Description                                             |
| -------------------------------------------- | ----- | ------------------------------------------------------- |
| `app/api/admin/analytics/route.ts`           | 1.1.2 | GET handler builds filters + 5 queries + 3 aggregations |
| `app/api/learning-graphs/[id]/data/route.ts` | 1.1.1 | PUT does upsert + deletion + edge recreation inline     |
| `middleware.ts`                              | 1.1.2 | Routing + token refresh + path matching in one function |
| `app/api/podcasts/route.ts`                  | 1.2.2 | `switch(sort)` should be a strategy map                 |
| `middleware.ts`                              | 1.2.2 | Hardcoded public API paths                              |
| Components (15+ files)                       | 1.5.3 | Inline `fetch()` calls — no service abstraction         |
| `lib/auth/jwt.ts`                            | 1.5.1 | All functions read env vars at call time                |

---

## Findings: Project Structure (Rule 5)

### CRITICAL — File/Function Length (Rules 5.4.2, 5.4.3)

| File                                          | Lines | Limit | Excess |
| --------------------------------------------- | ----- | ----- | ------ |
| `components/admin/podcast-upload-form.tsx`    | 506   | 300   | +206   |
| `components/admin/podcast-upload-wizard.tsx`  | 425   | 300   | +125   |
| `components/learning-path/linear-editor.tsx`  | 315   | 300   | +15    |
| `podcast-upload-wizard.tsx:handleFinalSubmit` | 146   | 50    | +96    |
| `podcast-upload-form.tsx:onSubmit`            | 128   | 50    | +78    |
| `stores/graph-editor-store.ts:save`           | 81    | 50    | +31    |

### WARNING — Duplication (Rule 5.3.4)

| Duplicated Code               | Files                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `formatTime` utility function | `audio-player.tsx`, `bookmark-panel.tsx`, `episode-player.tsx`, `search-results.tsx`, `sidebar-now-playing.tsx`, `progress-dashboard.tsx` |
| ~120-line upload logic        | `podcast-upload-form.tsx`, `podcast-upload-wizard.tsx`                                                                                    |

### WARNING — Other

| Issue                              | Rule  | Details                                                                                               |
| ---------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| Multiple components per file       | 5.4.1 | `linear-editor.tsx` (2), `podcast-upload-form.tsx` (2)                                                |
| No barrel `index.ts` files         | 5.3.3 | All feature directories lack public API surfaces                                                      |
| Empty catch blocks in 6 components | 6.1.1 | analytics-charts, progress-dashboard, path-list-client, profile-form, bookmark-panel, bulletin-viewer |

---

## Positive Findings

- All Zod schemas in `lib/schemas/` are well-documented and properly structured
- `lib/auth/*` files have complete JSDoc and proper error handling
- `lib/api/*` error response utilities follow consistent patterns
- Stores (`player-store.ts`, `graph-editor-store.ts`) have good type safety
- All hooks have proper TypeScript annotations
- `lib/storage.ts` and `lib/upload.ts` are well-structured with proper abstractions
- Pagination utilities used consistently across list endpoints
- No circular dependencies detected between modules
- Good accessibility patterns (aria-labels) in most components
