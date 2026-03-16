# Code Quality Audit Report

**Date:** 2026-03-16
**Audited by:** Claude (Sonnet agents, 8 parallel passes)
**Codebase:** Podcast Hub v2
**Scope:** 109 source files (excluding node_modules, .next, prisma/migrations, components/ui/)

---

## Table of Contents

- [Summary](#summary)
- [Findings by Severity](#findings-by-severity)
- [Top 10 Highest-Impact Issues](#top-10-highest-impact-issues)
- [Systemic Patterns](#systemic-patterns)
- [Pass 1 — Project Structure (Rule 5)](#pass-1--project-structure-rule-5)
- [Pass 2 — Naming Conventions (Rule 2)](#pass-2--naming-conventions-rule-2)
- [Pass 3 — Code Documentation (Rule 4)](#pass-3--code-documentation-rule-4)
- [Pass 4 — Error Handling (Rule 6)](#pass-4--error-handling-rule-6)
- [Pass 5 — SOLID Principles (Rule 1)](#pass-5--solid-principles-rule-1)
- [Pass 6 — Logging & Observability (Rule 7)](#pass-6--logging--observability-rule-7)
- [Pass 7 — README Documentation (Rule 3)](#pass-7--readme-documentation-rule-3)
- [Pass 8 — Test Coverage](#pass-8--test-coverage)

---

## Summary

| Severity     | Pass 1 (Structure) | Pass 2 (Naming) | Pass 3 (Docs) | Pass 4 (Errors) | Pass 5 (SOLID) | Pass 6 (Logging) | Pass 7 (README) | Pass 8 (Tests) | Total |
| ------------ | ------------------ | --------------- | ------------- | --------------- | -------------- | ---------------- | --------------- | -------------- | ----- |
| **CRITICAL** | 8                  | 0               | 4             | 4               | 5              | 11               | 6               | —              | ~38   |
| **WARNING**  | 17                 | 27              | 35            | 13              | 7              | 30               | 7               | —              | ~136  |
| **INFO**     | 3                  | 0               | 12            | 5               | 1              | 3                | 2               | —              | ~26   |

---

## Top 10 Highest-Impact Issues

| #   | Issue                                                                                      | Files Affected                             | Why It Matters                                     |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------- |
| 1   | **Logger exists but unused** — 24/25 API routes have zero structured logging               | All API routes                             | Zero production observability                      |
| 2   | **No correlation ID** — `requestId` param exists in `createErrorResponse` but never passed | System-wide                                | Cannot trace requests across logs                  |
| 3   | **8 `console.error` calls** in production API routes                                       | 6 route files + error.tsx + upload form    | Unstructured, no context, potential PII leak       |
| 4   | **`withRateLimit` middleware exists but applied to zero routes**                           | Auth routes especially                     | Brute-force login attacks unprotected              |
| 5   | **3 duplicate S3Client instances** instead of using `lib/storage.ts`                       | upload/file, media, storage                | DIP violation, config drift risk                   |
| 6   | **~120-line upload logic duplicated** in form and wizard                                   | podcast-upload-form, podcast-upload-wizard | Change must be made in two places                  |
| 7   | **Delete catch maps all DB errors to 404**                                                 | learning-graphs/[id]/route.ts              | Connectivity errors silently swallowed             |
| 8   | **Bulk mutations outside transaction**                                                     | learning-graphs/[id]/data PUT              | Partial update leaves corrupt state                |
| 9   | **No `/api/ready` endpoint**                                                               | Deployment                                 | Container gets traffic before DB is reachable      |
| 10  | **57% test coverage, 0 E2E tests**                                                         | 47 source files untested                   | Auth, middleware, learning-path entirely uncovered |

---

## Systemic Patterns

These aren't single-file issues — they're codebase-wide habits:

1. **`res`/`json`/`data`/`body` naming** — generic variable names in ~20 files
2. **Missing JSDoc** on ~25 exported functions (concentrated in components + newer API routes)
3. **No module docstrings** on ~8 files
4. **Test directory doesn't mirror source** — 24 test files flat-named instead of nested
5. **No barrel `index.ts` files** — every import reaches into module internals
6. **Pages importing Prisma directly** — presentation layer bypasses service layer

---

## Pass 1 — Project Structure (Rule 5)

**8 CRITICAL, 17 WARNING, 3 INFO**

### Critical

| File                                                    | Line(s) | Rule  | Description                                         |
| ------------------------------------------------------- | ------- | ----- | --------------------------------------------------- |
| `components/admin/podcast-upload-form.tsx`              | 1–488   | 5.4.2 | 488 lines, exceeds 300-line limit                   |
| `components/admin/podcast-upload-wizard.tsx`            | 1–445   | 5.4.2 | 445 lines, exceeds 300-line limit                   |
| `components/admin/podcast-upload-form.tsx`              | 144–271 | 5.4.3 | `onSubmit` is 127 lines                             |
| `components/admin/podcast-upload-wizard.tsx`            | 194–348 | 5.4.3 | `handleFinalSubmit` is 154 lines                    |
| `stores/graph-editor-store.ts`                          | 173–257 | 5.4.3 | `save` is 84 lines                                  |
| `app/api/learning-graphs/[id]/data/route.ts`            | 70–163  | 5.4.3 | `PUT` handler is 93 lines                           |
| `podcast-upload-form.tsx` + `podcast-upload-wizard.tsx` | —       | 5.3.4 | ~120-line upload logic duplicated across both files |
| Two pages import `prisma` directly                      | —       | 5.1.2 | Presentation layer hits DB directly                 |

### Warning

| File                                                                    | Line(s) | Rule  | Description                                                       |
| ----------------------------------------------------------------------- | ------- | ----- | ----------------------------------------------------------------- |
| `middleware.ts`                                                         | 67–146  | 5.4.3 | `middleware` function is 79 lines                                 |
| `components/learning-path/path-viewer-wrapper.tsx`                      | 34–159  | 5.4.3 | Component body is 125 lines                                       |
| `components/audio-player/bookmark-panel.tsx`                            | 43–273  | 5.4.3 | Component body is 230 lines                                       |
| `components/learning-path/episode-player.tsx`                           | 36–240  | 5.4.3 | Component body is 204 lines                                       |
| `app/api/admin/analytics/route.ts`                                      | 14–138  | 5.4.3 | `GET` handler is 124 lines                                        |
| `app/api/upload/file/route.ts`                                          | 13      | 5.1.2 | Bypasses `lib/storage.ts` and re-instantiates `S3Client` directly |
| `app/api/auth/login/route.ts`                                           | 103     | 7.1.2 | `console.error` instead of structured Pino logger                 |
| `app/api/auth/register/route.ts`                                        | 113     | 7.1.2 | `console.error` instead of structured Pino logger                 |
| `app/api/upload/route.ts`                                               | 114     | 7.1.2 | `console.error` instead of structured Pino logger                 |
| `app/api/upload/file/route.ts`                                          | 84      | 7.1.2 | `console.error` instead of structured Pino logger                 |
| `components/learning-path/linear-editor.tsx`                            | 34–213  | 5.4.1 | Two components in one file: `SortableEpisode` + `LinearEditor`    |
| `components/admin/podcast-upload-form.tsx`                              | 478–487 | 5.4.1 | Two components: `PodcastUploadForm` + `ProgressBar`               |
| `components/audio-player/audio-player.tsx:28` + `bookmark-panel.tsx:32` | —       | 5.3.4 | `formatTime` duplicated in two files                              |
| `__tests__/unit/components/` (5 files)                                  | —       | 5.4.5 | Tests not mirrored to source subdirectories                       |
| `__tests__/unit/api/` (all flat files)                                  | —       | 5.4.5 | Flat API test names don't mirror nested route structure           |
| `PRD_PODCAST_HUB_V2.md`                                                 | root    | 5.4.6 | Product doc at root; should be in `docs/`                         |
| All feature directories                                                 | —       | 5.3.3 | No barrel `index.ts` files expose public module API surfaces      |

### Info

| File                                 | Rule  | Description                                                         |
| ------------------------------------ | ----- | ------------------------------------------------------------------- |
| `components/admin/admin-sidebar.tsx` | 5.4.1 | `NavContent` is a private component in same file as `AdminSidebar`  |
| `components/admin/podcast-table.tsx` | 5.4.1 | `SortableRow` is a private component in same file as `PodcastTable` |

---

## Pass 2 — Naming Conventions (Rule 2)

**0 CRITICAL, 27 WARNING**

### Pattern 1: Generic `data`/`body`/`result` names (Rule 2.1.3)

Found in ~15 places:

| File                                       | Line     | Current                       | Suggested                          |
| ------------------------------------------ | -------- | ----------------------------- | ---------------------------------- |
| `app/api/podcasts/route.ts`                | 77       | `const [data, total]`         | `[podcasts, total]`                |
| `app/api/learning-graphs/route.ts`         | 40       | `const [data, total]`         | `[learningGraphs, total]`          |
| `app/api/users/route.ts`                   | 52       | `const data = users.map(...)` | `formattedUsers`                   |
| `app/api/auth/login/route.ts`              | 47       | `body`                        | `loginRequestBody`                 |
| `app/api/auth/register/route.ts`           | 44       | `body`                        | `registrationRequestBody`          |
| `app/api/auth/refresh/route.ts`            | 47       | `payload`                     | `refreshTokenPayload`              |
| `lib/embeddings.ts`                        | 51       | `data`                        | `embeddingApiResponse`             |
| `stores/graph-editor-store.ts`             | 212      | `data`                        | `responsePayload`                  |
| `hooks/use-hls-player.ts`                  | 56       | `result`                      | `playPromise`                      |
| `hooks/use-file-upload.ts`                 | 51, 63   | `result`, `data`              | `storageKey`, `uploadResponseBody` |
| `components/admin/analytics-charts.tsx`    | 31       | `data` state                  | `analyticsData`                    |
| `components/admin/podcast-upload-form.tsx` | 122, 229 | `value`, `body`               | `trimmedTag`, `errorResponseBody`  |
| `app/api/bookmarks/[id]/route.ts`          | 41       | `updated`                     | `updatedBookmark`                  |

### Pattern 2: Abbreviated `res`/`json`/`ts`/`q` names (Rule 2.1.2)

Found in ~10 places:

| File                                               | Line   | Current                     | Suggested                                             |
| -------------------------------------------------- | ------ | --------------------------- | ----------------------------------------------------- |
| `app/api/search/route.ts`                          | 24     | `q`                         | `searchQuery`                                         |
| `components/audio-player/audio-player.tsx`         | 195    | `ts`                        | `timestampSeconds`                                    |
| `components/audio-player/bookmark-panel.tsx`       | 57, 79 | `res`, `json`, `ts`         | `response`, `bookmarksResponse`, `timestampSeconds`   |
| `components/admin/analytics-charts.tsx`            | 34, 41 | `res`, `json`, `from`, `to` | `response`, `analyticsResponse`, `fromDate`, `toDate` |
| `components/admin/learning-graphs-table.tsx`       | 54     | `res`                       | `response`                                            |
| `components/learning-path/path-list-client.tsx`    | 33     | `json`, `res`               | `progressResponse`, `response`                        |
| `components/learning-path/path-viewer-wrapper.tsx` | 43     | `json`, `res`               | `progressResponse`, `response`                        |
| `middleware.ts`                                    | 53     | `num`                       | `numericPart`                                         |
| `app/api/users/route.ts`                           | 52     | `(u) =>`                    | `(user) =>`                                           |
| `app/api/learning-graphs/[id]/data/route.ts`       | 92     | `(e) =>`                    | `(episode) =>`                                        |

### Other

| File                                         | Line | Rule  | Current        | Suggested                                         |
| -------------------------------------------- | ---- | ----- | -------------- | ------------------------------------------------- |
| `lib/utils.ts`                               | 4    | 2.1.2 | `cn`           | `mergeClassNames` (shadcn convention — debatable) |
| `stores/player-store.ts`                     | 55   | 2.2   | `initialState` | `INITIAL_PLAYER_STATE`                            |
| `components/admin/podcast-upload-form.tsx`   | 44   | 2.1.3 | `FormValues`   | `PodcastUploadFormValues`                         |
| `components/admin/podcast-upload-wizard.tsx` | 44   | 2.1.3 | `FormValues`   | `PodcastWizardFormValues`                         |
| `lib/types.ts`                               | 9    | 2.1.3 | `PodcastData`  | `PodcastRecord`                                   |

---

## Pass 3 — Code Documentation (Rule 4)

**4 CRITICAL, ~35 WARNING, ~12 INFO**

### Critical

| File                                    | Line  | Rule  | Description                                                    |
| --------------------------------------- | ----- | ----- | -------------------------------------------------------------- |
| `app/api/learning-graphs/[id]/route.ts` | 70    | 4.6.3 | `'BAD_REQUEST' as never` — type hack with no comment or ticket |
| `app/api/bookmarks/[id]/route.ts`       | 37    | 4.6.3 | Same `as never` pattern                                        |
| `app/(public)/page.tsx`                 | 91–92 | 4.6.3 | `as any` cast on Link href with no WORKAROUND comment          |
| `components/library/podcast-card.tsx`   | 36–37 | 4.6.3 | Same `as any` on Link href                                     |

### Missing Module Docstrings (WARNING — Rule 4.1)

- `lib/utils.ts`
- `components/admin/analytics-charts.tsx`
- `components/admin/learning-graphs-table.tsx` (incomplete)
- `app/api/bookmarks/route.ts` (brief, missing key responsibilities)
- `app/api/progress/route.ts` (brief)
- `app/api/activity/route.ts` (brief)
- `app/api/users/route.ts` (brief)
- `app/api/media/route.ts` (missing dependencies)
- `app/api/upload/file/route.ts` (missing key responsibilities)

### Missing Function JSDoc (WARNING — Rule 4.3)

~25 exported functions missing JSDoc, concentrated in:

**API Routes:**

- `app/api/bookmarks/route.ts` — GET, POST handlers
- `app/api/bookmarks/[id]/route.ts` — PUT, DELETE handlers
- `app/api/progress/route.ts` — GET, POST handlers
- `app/api/progress/[id]/route.ts` — DELETE handler
- `app/api/activity/route.ts` — POST handler
- `app/api/users/route.ts` — GET handler
- `app/api/users/[id]/role/route.ts` — PUT handler
- `app/api/admin/analytics/route.ts` — GET handler
- `app/api/media/route.ts` — GET handler
- `app/api/upload/file/route.ts` — POST handler

**Components:**

- `components/admin/analytics-charts.tsx` — `AnalyticsCharts`
- `components/admin/learning-graphs-table.tsx` — `LearningGraphsTable`, `handleDelete`
- `components/learning-path/path-viewer-wrapper.tsx` — `PathViewerWrapper`
- `components/learning-path/path-list-client.tsx` — `PathListClient`
- `components/learning-path/path-card.tsx` — `PathCard`
- `components/learning-path/episode-node.tsx` — `EpisodeNode`
- `components/learning-path/episode-player.tsx` — `EpisodePlayer`
- `components/learning-path/graph-editor.tsx` — `GraphEditor`
- `components/learning-path/linear-editor.tsx` — `SortableEpisode`, `LinearEditor`
- `components/learning-path/episode-sidebar.tsx` — `EpisodeSidebar`
- `components/audio-player/audio-player.tsx` — `AudioPlayer`
- `components/audio-player/podcast-detail-layout.tsx` — `PodcastDetailLayout`

**Hooks:**

- `hooks/use-transcript-sync.ts` — `useTranscriptSync`
- `hooks/use-hls-player.ts` — `useHlsPlayer`

**Other:**

- `lib/db.ts` — `createPrismaClient`
- `middleware.ts` — `middleware`, `addUserHeaders`
- `app/(admin)/admin/learning-graphs/new/page.tsx` — `handleSubmit`

### What Was Done Well

Fully compliant files: `lib/auth/*`, `lib/api/*`, `lib/schemas/*`, `lib/storage.ts`, `lib/upload.ts`, `lib/embeddings.ts`, `lib/logger.ts`, `stores/*`, `hooks/use-file-upload.ts`, `hooks/use-unsaved-changes-warning.ts`, `hooks/use-listen-tracker.ts`, all wizard step components.

---

## Pass 4 — Error Handling (Rule 6)

**4 CRITICAL, 13 WARNING, 5 INFO**

### Critical

| File                                    | Line       | Rule                | Description                                                 |
| --------------------------------------- | ---------- | ------------------- | ----------------------------------------------------------- |
| `app/api/learning-graphs/[id]/route.ts` | 104–109    | 6.1.1, 6.2.2, 6.3.4 | Empty catch maps ALL DB errors to 404, discards stack trace |
| `app/api/media/route.ts`                | 29, 43, 77 | 6.3.1, 6.3.2        | Raw `{ error }` schema bypasses `ApiErrorResponse` standard |
| `app/api/learning-graphs/[id]/route.ts` | 70         | 6.1.3               | `ErrorCode` enum bypassed with `as never` cast              |
| `app/api/bookmarks/[id]/route.ts`       | 37         | 6.1.3               | `ErrorCode` enum bypassed with `as never` cast              |

### Warning

| File                                         | Line           | Rule         | Description                                                              |
| -------------------------------------------- | -------------- | ------------ | ------------------------------------------------------------------------ |
| `app/api/auth/login/route.ts`                | 103            | 7.1.2        | `console.error` instead of structured logger, no trace_id                |
| `app/api/auth/register/route.ts`             | 113            | 7.1.2        | `console.error` instead of structured logger, no trace_id                |
| `app/api/auth/refresh/route.ts`              | 92             | 7.1.2        | `console.error` instead of structured logger, no trace_id                |
| `app/api/upload/route.ts`                    | 114            | 7.1.2        | `console.error` instead of structured logger, no trace_id                |
| `app/api/upload/file/route.ts`               | 84             | 7.1.2        | `console.error` instead of structured logger, no trace_id                |
| `app/api/media/route.ts`                     | 76             | 7.1.2        | `console.error` instead of structured logger, no trace_id                |
| `app/api/admin/analytics/route.ts`           | 27–39          | 6.5.1, 6.5.2 | Unvalidated `from`/`to` date strings passed to `new Date()`              |
| `stores/graph-editor-store.ts`               | 100–103        | 6.1.1        | Auto-save catch swallows errors with zero observability                  |
| `hooks/use-hls-player.ts`                    | 57             | 6.1.1        | Empty `.catch(() => {})` silently discards audio play errors             |
| `hooks/use-listen-tracker.ts`                | 38–40          | 6.1.1        | Fire-and-forget catch has no log at any level                            |
| `lib/auth/api-helpers.ts`                    | 44             | 6.1.1        | JWT verification failure (incl. missing secret) swallowed as null        |
| `lib/embeddings.ts`                          | 41–48          | 6.4.1        | No `AbortController` timeout on Azure OpenAI `fetch`                     |
| `lib/embeddings.ts`                          | 56–59          | 6.4.2        | Linear retry backoff, no jitter                                          |
| `lib/auth/jwt.ts`                            | 29, 46, 63, 83 | 6.1.3        | Generic `Error` for missing config instead of typed `ConfigurationError` |
| `lib/db.ts`                                  | 22             | 6.6.3        | `pg.Pool` created with no explicit size, timeout, or idle timeout        |
| All API route files                          | —              | 6.4          | `withRateLimit` middleware exists but is applied to zero routes          |
| `app/api/learning-graphs/[id]/data/route.ts` | 97–147         | 6.4.5        | Bulk episode/edge mutation runs outside a Prisma transaction             |

### Info

| File                            | Line   | Rule  | Description                                              |
| ------------------------------- | ------ | ----- | -------------------------------------------------------- |
| `app/api/auth/me/route.ts`      | 50     | 6.1.1 | Anonymous catch discards JWT error type                  |
| `app/api/auth/refresh/route.ts` | 50     | 6.1.1 | Anonymous catch discards JWT error type                  |
| `middleware.ts`                 | 41     | 6.1.1 | Anonymous catch discards JWT error                       |
| `app/api/health/route.ts`       | —      | 7.4.1 | No `/api/ready` readiness endpoint for dependency checks |
| `hooks/use-file-upload.ts`      | 65, 72 | 6.1.1 | JSON parse failures discard original error               |

---

## Pass 5 — SOLID Principles (Rule 1)

**5 CRITICAL, 7 WARNING, 1 INFO — No LSP or ISP violations**

### DIP (Dependency Inversion) — Critical

| File                           | Line  | Rule         | Description                                                                      |
| ------------------------------ | ----- | ------------ | -------------------------------------------------------------------------------- |
| `app/api/upload/file/route.ts` | 26–34 | 1.5.3        | Duplicate `new S3Client()` — `lib/storage.ts` already has one                    |
| `app/api/media/route.ts`       | 16–24 | 1.5.3        | Third `new S3Client()` instance — same config duplicated                         |
| `lib/embeddings.ts`            | 29–38 | 1.5.1, 1.5.3 | Reads env vars inside function body, no `EmbeddingService` interface             |
| `stores/graph-editor-store.ts` | 183   | 1.5.3        | Zustand store hardcodes `fetch()` with concrete URL — no persistence abstraction |

### SRP (Single Responsibility)

| File                                           | Line    | Rule         | Severity | Description                                                           |
| ---------------------------------------------- | ------- | ------------ | -------- | --------------------------------------------------------------------- |
| `components/admin/podcast-upload-wizard.tsx`   | 194–330 | 1.1.1, 1.1.2 | CRITICAL | `handleFinalSubmit` does 5 things in 130 lines                        |
| `components/admin/podcast-upload-form.tsx`     | 144–271 | 1.1.1, 1.1.2 | CRITICAL | `onSubmit` identical pattern — 120 lines, 5 responsibilities          |
| `app/api/admin/analytics/route.ts`             | 14–138  | 1.1.2        | WARNING  | GET handler builds filters + runs 5 queries + 3 aggregation passes    |
| `app/api/learning-graphs/[id]/data/route.ts`   | 70–163  | 1.1.1        | WARNING  | PUT handler does upsert + deletion + edge recreation inline           |
| `middleware.ts`                                | 67–146  | 1.1.2        | WARNING  | Routing decisions + token refresh + path matching all in one function |
| `components/learning-path/episode-sidebar.tsx` | —       | 1.1.2        | WARNING  | 4 distinct UI concerns (list, create, edit with file uploads, delete) |

### OCP (Open/Closed)

| File                        | Line    | Rule  | Severity | Description                                                          |
| --------------------------- | ------- | ----- | -------- | -------------------------------------------------------------------- |
| `app/api/podcasts/route.ts` | 63–75   | 1.2.2 | WARNING  | `switch(sort)` should be a strategy map                              |
| `middleware.ts`             | 112–117 | 1.2.2 | WARNING  | Hardcoded public API paths instead of reusing `PUBLIC_PREFIX_ROUTES` |

### DIP (Warning-level)

| File                                       | Line    | Rule  | Description                                                |
| ------------------------------------------ | ------- | ----- | ---------------------------------------------------------- |
| `lib/auth/jwt.ts`                          | 27–86   | 1.5.1 | Every function reads env vars at call time, no abstraction |
| `hooks/use-listen-tracker.ts`              | 31–36   | 1.5.3 | `fetch` called directly in hook                            |
| `components/audio-player/audio-player.tsx` | 197–204 | 1.5.3 | Bookmark creation `fetch` inline in JSX handler            |

---

## Pass 6 — Logging & Observability (Rule 7)

**11 CRITICAL, ~30 WARNING, ~3 INFO**

The Pino logger exists in `lib/logger.ts` but is used in **only 1 of 25 API routes**.

### Critical

| Issue                                        | Details                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 8 `console.error` calls in production routes | `auth/login`, `auth/register`, `auth/refresh`, `upload`, `upload/file`, `media`, `error.tsx`, `podcast-upload-form` |
| Logger missing `service_name`                | `lib/logger.ts` base config only includes `env`                                                                     |
| Zero correlation ID propagation              | `createErrorResponse` accepts `requestId` but no caller passes it                                                   |
| No `/api/ready` readiness endpoint           | Only `/api/health` exists (liveness)                                                                                |

### Warning

| Issue                                         | Details                                                   |
| --------------------------------------------- | --------------------------------------------------------- |
| 24/25 API routes have zero structured logging | Only `learning-graphs/[id]/data` uses logger (and poorly) |
| No INFO-level logs on happy path              | Logins, uploads, CRUD — zero observability when working   |
| No scoped/child loggers per request           | `createLogger` scopes by module, not by request           |
| Potential PII in error logs                   | `console.error` may dump JWT fragments or email addresses |
| S3 `NoSuchKey` logged as ERROR                | Expected "not found" condition — should be WARN           |

### Info

| Issue                                | Details                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| No RED metrics instrumentation       | Rate, error rate, duration percentiles — none tracked         |
| No distributed tracing               | No OpenTelemetry/Jaeger — Azure OpenAI and S3 calls are blind |
| Log level only changeable on restart | Module caching prevents runtime changes                       |

---

## Pass 7 — README Documentation (Rule 3)

**6 CRITICAL, 7 WARNING, 2 INFO**

The README covers roughly **5 of 13 required sections** adequately.

### Entirely Missing Sections (CRITICAL)

| Section                                             | Rule   |
| --------------------------------------------------- | ------ |
| Architecture Overview (diagram + service inventory) | 3.1.3  |
| API Documentation (endpoint table or Swagger link)  | 3.1.9  |
| Troubleshooting / FAQ                               | 3.1.12 |
| License                                             | 3.1.13 |

### Severely Incomplete (CRITICAL)

| Section               | Rule  | What's Missing                                                                                                              |
| --------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| Deployment Guide      | 3.1.8 | Only "Build" partially covered; missing migrations, rollback, CI/CD, infra, monitoring, health checks (8 of 9 sub-sections) |
| Environment Variables | 3.2.2 | Every var missing format, example, required/optional status                                                                 |

### Warning

| Issue                     | Rule         | Details                                                             |
| ------------------------- | ------------ | ------------------------------------------------------------------- |
| Description too brief     | 3.1.1        | Doesn't mention audit professionals, bulletins, semantic search     |
| ToC incomplete            | 3.1.2        | Missing entries for absent sections                                 |
| Version numbers vague     | 3.1.4, 3.2.3 | `>= 20` instead of `>= 20.11.0`                                     |
| Prerequisites incomplete  | 3.1.5        | Missing Azure subscription, OpenAI access, Sentry account           |
| No coverage thresholds    | 3.1.7        | Rule requires minimum thresholds to be documented                   |
| Contributing inconsistent | 3.1.11       | Branch naming differs from CLAUDE.md; no linting config             |
| README/CLAUDE.md sync     | 3.2.4        | `LOG_LEVEL` default `debug` vs `info`; `MINIO_*` vs `S3_*` env vars |

### Info

| Issue                         | Rule   | Details                                                    |
| ----------------------------- | ------ | ---------------------------------------------------------- |
| Local setup verification step | 3.1.6  | No health check URL or expected output after `npm run dev` |
| Project structure minor gaps  | 3.1.10 | Missing descriptions for some root config files            |

---

## Pass 8 — Test Coverage

**57% file-based coverage — 47 source files have no test**

### Coverage by Category

| Category               | Source Files | Test Files | Coverage |
| ---------------------- | ------------ | ---------- | -------- |
| `app/api/` routes      | 25           | 14         | 56%      |
| `lib/` utilities       | 25           | 17         | 68%      |
| Components (excl. ui/) | 50           | 26         | 52%      |
| Hooks                  | 6            | 4          | 67%      |
| Stores                 | 2            | 2          | 100%     |
| Middleware             | 1            | 0          | 0%       |
| **Total**              | **109**      | **62**     | **~57%** |

### Missing Tests — API Routes (12 files)

- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/refresh/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/bookmarks/[id]/route.ts`
- `app/api/media/route.ts`
- `app/api/podcasts/[id]/route.ts`
- `app/api/podcasts/[id]/transcript/route.ts`
- `app/api/podcasts/batch/route.ts`
- `app/api/progress/[id]/route.ts`
- `app/api/upload/file/route.ts`

### Missing Tests — `lib/` (9 files)

- `lib/api/cors.ts`
- `lib/auth/api-helpers.ts`
- `lib/db.ts`
- `lib/logger.ts`
- `lib/navigation-config.ts`
- `lib/schemas/learning-graph.ts`
- `lib/storage-url.ts`
- `lib/types.ts`
- `lib/utils.ts`

### Missing Tests — Components (30 files)

**Admin:** `admin-dashboard-client`, `admin-sidebar`, `date-range-picker`, `podcast-table`, `podcast-table-actions`, `users-table`

**Audio Player:** `bookmark-panel`, `podcast-detail-layout`

**Auth:** `login-form`, `register-form`

**Layout:** `page-transition`, `public-nav`

**Learning Path:** `editor-tabs`, `episode-node`, `episode-sidebar`, `graph-editor`, `linear-editor`, `path-card`, `path-list-client`, `path-viewer-wrapper`

**Library:** `library-filters`, `pagination-controls`, `podcast-grid`

**Other:** `profile-form`, `progress-dashboard`, `theme-provider`, `search-input`, `search-results`

### Missing Tests — Other

- `hooks/use-file-upload.ts`
- `hooks/use-listen-tracker.ts`
- `middleware.ts`

### Structure Violations (24 test files in wrong location)

All API test files use flat naming instead of mirroring nested source:

| Actual                                            | Should Be                                                    |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `__tests__/unit/api/learning-graphs.test.ts`      | `__tests__/unit/api/learning-graphs/route.test.ts`           |
| `__tests__/unit/api/learning-graphs-id.test.ts`   | `__tests__/unit/api/learning-graphs/[id]/route.test.ts`      |
| `__tests__/unit/api/learning-graphs-data.test.ts` | `__tests__/unit/api/learning-graphs/[id]/data/route.test.ts` |
| (and 16 more...)                                  |                                                              |

All 5 component flat tests similarly misplaced:

| Actual                                            | Should Be                                                      |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `__tests__/unit/components/audio-player.test.tsx` | `__tests__/unit/components/audio-player/audio-player.test.tsx` |
| `__tests__/unit/components/podcast-card.test.tsx` | `__tests__/unit/components/library/podcast-card.test.tsx`      |
| (and 3 more...)                                   |                                                                |

### E2E Tests

**0 E2E tests** — `__tests__/e2e/` contains only `.gitkeep`
