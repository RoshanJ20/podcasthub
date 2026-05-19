# Application Links Reference

Every link used throughout **The Audit Brief** — page routes, API endpoints, `<Link>` hrefs, programmatic router calls, auth redirects, query parameters, and outbound external URLs. Entries cite the source `file:line` so the doc can be verified and kept honest.

The deployed app is served under a basePath of `/auditbrief`. All internal paths below are shown **without** the basePath; the client helper [lib/config/base-path.ts](lib/config/base-path.ts#L29) (`withBasePath(path)`) prepends it before `fetch` / hard-navigation.

---

## Table of Contents

1. [Page Routes](#1-page-routes)
2. [Navigation Config](#2-navigation-config)
3. [`<Link>` Component Usages](#3-link-component-usages)
4. [Programmatic Navigation](#4-programmatic-navigation)
5. [API Endpoints](#5-api-endpoints)
6. [Client-side Fetch Callsites](#6-client-side-fetch-callsites)
7. [Auth Redirects & Callback URLs](#7-auth-redirects--callback-urls)
8. [Query Parameters per Route](#8-query-parameters-per-route)
9. [External URLs (outbound)](#9-external-urls-outbound)
10. [URL-shaped Environment Variables](#10-url-shaped-environment-variables)
11. [Base Path Behaviour](#11-base-path-behaviour)
12. [Protected Route Matrix](#12-protected-route-matrix)

---

## 1. Page Routes

Every `page.tsx` in the App Router. Route groups (`(public)`, `(auth)`, `(admin)`) do not appear in the URL.

### Public routes — `(public)`

- `/` — Home / dashboard landing — [app/(public)/page.tsx](<app/(public)/page.tsx>)
- `/bulletins` — Technical Content library (filter/search/paginate audit briefs) — [app/(public)/bulletins/page.tsx](<app/(public)/bulletins/page.tsx>)
- `/audit-brief/[id]` — Audit brief detail (audio player + transcript + bulletin viewer) — [app/(public)/audit-brief/[id]/page.tsx](<app/(public)/audit-brief/[id]/page.tsx>)
- `/search` — Keyword + semantic search page — [app/(public)/search/page.tsx](<app/(public)/search/page.tsx>)
- `/learning-path` — Learning series library — [app/(public)/learning-path/page.tsx](<app/(public)/learning-path/page.tsx>)
- `/learning-path/[id]` — Learning series viewer (graph + episodes) — [app/(public)/learning-path/[id]/page.tsx](<app/(public)/learning-path/[id]/page.tsx>)
- `/progress` — User progress dashboard — [app/(public)/progress/page.tsx](<app/(public)/progress/page.tsx>)

### Auth routes — `(auth)`

- `/login` — Sign-in (Azure AD SSO + dev credentials) — [app/(auth)/login/page.tsx](<app/(auth)/login/page.tsx>)
- `/register` — New account (disabled when SSO-only) — [app/(auth)/register/page.tsx](<app/(auth)/register/page.tsx>)
- `/unauthorized` — Shown when a user lacks admin/superadmin role — [app/(auth)/unauthorized/page.tsx](<app/(auth)/unauthorized/page.tsx>)

### Admin routes — `(admin)` (require `admin` or `superadmin` role)

- `/admin` — Audit brief management dashboard — [app/(admin)/admin/page.tsx](<app/(admin)/admin/page.tsx>)
- `/admin/upload` — New audit brief upload wizard — [app/(admin)/admin/upload/page.tsx](<app/(admin)/admin/upload/page.tsx>)
- `/admin/edit/[id]` — Edit audit brief metadata — [app/(admin)/admin/edit/[id]/page.tsx](<app/(admin)/admin/edit/[id]/page.tsx>)
- `/admin/edit/[id]/transcript` — Transcript editor — [app/(admin)/admin/edit/[id]/transcript/page.tsx](<app/(admin)/admin/edit/[id]/transcript/page.tsx>)
- `/admin/learning-graphs` — Learning series management — [app/(admin)/admin/learning-graphs/page.tsx](<app/(admin)/admin/learning-graphs/page.tsx>)
- `/admin/learning-graphs/new` — New learning series wizard — [app/(admin)/admin/learning-graphs/new/page.tsx](<app/(admin)/admin/learning-graphs/new/page.tsx>)
- `/admin/learning-graphs/[id]` — Edit learning series (graph editor) — [app/(admin)/admin/learning-graphs/[id]/page.tsx](<app/(admin)/admin/learning-graphs/[id]/page.tsx>)
- `/admin/analytics` — Admin analytics dashboard — [app/(admin)/admin/analytics/page.tsx](<app/(admin)/admin/analytics/page.tsx>)
- `/admin/audit-log` — Audit log viewer — [app/(admin)/admin/audit-log/page.tsx](<app/(admin)/admin/audit-log/page.tsx>)
- `/admin/users` — User role management (**superadmin only**) — [app/(admin)/admin/users/page.tsx](<app/(admin)/admin/users/page.tsx>)

### Error pages

- `404` — Custom not-found page — [app/not-found.tsx](app/not-found.tsx)

---

## 2. Navigation Config

Source of truth for sidebar + mobile nav + command palette: [lib/navigation-config.ts](lib/navigation-config.ts).

**`mainLinks`** ([line 41](lib/navigation-config.ts#L41))

- `/` → "Home"

**`libraryLinks`** ([line 46](lib/navigation-config.ts#L46))

- `/bulletins` → "Technical Content"
- `/learning-path` → "Learning Series"

**`personalLinks`** ([line 54](lib/navigation-config.ts#L54))

- `/progress` → "Progress"

**`adminContentLinks`** ([line 61](lib/navigation-config.ts#L61))

- `/admin` → "Technical Content"
- `/admin/learning-graphs` → "Learning Series"
- `/admin/upload` → "New Technical Content"
- `/admin/learning-graphs/new` → "New Learning Series"

**`adminInsightsLinks`** ([line 71](lib/navigation-config.ts#L71))

- `/admin/analytics` → "Analytics"
- `/admin/audit-log` → "Audit Log"
- `/admin/users` → "Users" (superadmin only)

**`adminLinks`** ([line 83](lib/navigation-config.ts#L83)) — flat concat of the two admin arrays above, used by mobile nav and command palette.

---

## 3. `<Link>` Component Usages

Every `next/link` `<Link href="...">` in the codebase.

### Pages (`app/**/*.tsx`)

- [app/(public)/page.tsx:47](<app/(public)/page.tsx#L47>) — `href="/bulletins"` (Browse technical content CTA)
- [app/(public)/page.tsx:55](<app/(public)/page.tsx#L55>) — `href="/learning-path"` (Browse learning series CTA)
- [app/(public)/page.tsx:87](<app/(public)/page.tsx#L87>) — `href="/bulletins"` (View all technical content)
- [app/(public)/page.tsx:102](<app/(public)/page.tsx#L102>) — `href="/learning-path"` (View all learning series)
- [app/(auth)/login/page.tsx:89](<app/(auth)/login/page.tsx#L89>) — `href="/register"` (Create account)
- [app/(auth)/register/page.tsx:54](<app/(auth)/register/page.tsx#L54>) — `href="/login"` (Sign in)
- [app/(auth)/unauthorized/page.tsx:31](<app/(auth)/unauthorized/page.tsx#L31>) — `href="/"` (Go home)
- [app/not-found.tsx:16](app/not-found.tsx#L16) — `href="/"` (Go home)
- [app/(admin)/admin/page.tsx:54](<app/(admin)/admin/page.tsx#L54>) — `href="/admin/upload"` (New audit brief button)
- [app/(admin)/admin/upload/page.tsx:54](<app/(admin)/admin/upload/page.tsx#L54>) — `href="/admin"` (Breadcrumb → Dashboard)
- [app/(admin)/admin/learning-graphs/new/page.tsx:56](<app/(admin)/admin/learning-graphs/new/page.tsx#L56>) — `href="/admin"` (Breadcrumb → Dashboard)
- [app/(admin)/admin/edit/[id]/transcript/page.tsx:59](<app/(admin)/admin/edit/[id]/transcript/page.tsx#L59>) — `href="/admin"` (Breadcrumb → Dashboard)
- [app/(admin)/admin/edit/[id]/transcript/page.tsx:63](<app/(admin)/admin/edit/[id]/transcript/page.tsx#L63>) — `href={`/admin/edit/${id}`}` (Breadcrumb → parent edit page)

### Home (`components/home/*`)

- [components/home/category-grid.tsx:34](components/home/category-grid.tsx#L34) — `href={`/bulletins?domain=${encodeURIComponent(name)}`}` (Category tile → filtered library)
- [components/home/home-card.tsx:70](components/home/home-card.tsx#L70) — `href={href}` — resolves to `/audit-brief/{id}` or `/learning-path/{id}` depending on card type

### Library (`components/library/*`)

- [components/library/audit-brief-card.tsx:57](components/library/audit-brief-card.tsx#L57) — `href={`/audit-brief/${id}`}` (Audit brief card → detail)

### Audio Player (`components/audio-player/*`)

- [components/audio-player/audit-brief-detail-header.tsx:88](components/audio-player/audit-brief-detail-header.tsx#L88) — `href="/bulletins"` (Back to library)
- [components/audio-player/bulletin-viewer.tsx:157](components/audio-player/bulletin-viewer.tsx#L157) — `href={resolvedUrl}` (PDF open-in-new-tab anchor → streamed bulletin file)

### Learning Path (`components/learning-path/*`)

- [components/learning-path/path-card.tsx:53](components/learning-path/path-card.tsx#L53) — `href={`/learning-path/${id}`}` (Series card → detail)
- [components/learning-path/path-viewer-wrapper.tsx:149](components/learning-path/path-viewer-wrapper.tsx#L149) — `href="/learning-path"` (Back to learning paths)

### Search (`components/search/*`)

- [components/search/search-results.tsx:49](components/search/search-results.tsx#L49) — `href={`/audit-brief/${result.id}`}` (Audit brief search hit)
- [components/search/search-results.tsx:85](components/search/search-results.tsx#L85) — `href={`/audit-brief/${result.auditBriefId}?t=${Math.floor(result.startTime)}`}` (Transcript hit with timestamp)

### Admin (`components/admin/*`)

- [components/admin/audit-brief-table-actions.tsx:132](components/admin/audit-brief-table-actions.tsx#L132) — `href={`/admin/edit/${auditBrief.id}`}` (Edit metadata action)
- [components/admin/audit-brief-table-actions.tsx:139](components/admin/audit-brief-table-actions.tsx#L139) — `href={`/admin/edit/${auditBrief.id}/transcript`}` (Edit transcript action)
- [components/admin/audit-brief-table-actions.tsx:147](components/admin/audit-brief-table-actions.tsx#L147) — `href={`/audit-brief/${auditBrief.id}`}` (View public page action)
- [components/admin/learning-graphs-table.tsx:75](components/admin/learning-graphs-table.tsx#L75) — `href="/admin/learning-graphs/new"` (New series button)
- [components/admin/learning-graphs-table.tsx:126](components/admin/learning-graphs-table.tsx#L126) — `href={`/admin/learning-graphs/${graph.id}`}` (Edit graph)
- [components/admin/edit-audit-brief-client.tsx:39](components/admin/edit-audit-brief-client.tsx#L39) — `href="/admin"` (Breadcrumb → Dashboard)

### Layout / Nav (`components/layout/*`)

- [components/layout/unified-sidebar.tsx:146](components/layout/unified-sidebar.tsx#L146) — `href={link.href}` — iterates `mainLinks`
- [components/layout/unified-sidebar.tsx:161](components/layout/unified-sidebar.tsx#L161) — `href={link.href}` — iterates `libraryLinks`
- [components/layout/unified-sidebar.tsx:177](components/layout/unified-sidebar.tsx#L177) — `href={link.href}` — iterates `adminContentLinks`
- [components/layout/unified-sidebar.tsx:196](components/layout/unified-sidebar.tsx#L196) — `href={link.href}` — iterates `adminInsightsLinks`
- [components/layout/sidebar-nav-item.tsx:70](components/layout/sidebar-nav-item.tsx#L70) — `href={href}` (Re-usable nav item)
- [components/layout/mobile-top-bar.tsx:115](components/layout/mobile-top-bar.tsx#L115) — `href={link.href}` (Main nav link in mobile drawer)
- [components/layout/mobile-top-bar.tsx:132](components/layout/mobile-top-bar.tsx#L132) — `href={link.href}` (Library nav link in mobile drawer)
- [components/layout/mobile-top-bar.tsx:156](components/layout/mobile-top-bar.tsx#L156) — `href={link.href}` (Admin nav link in mobile drawer)
- [components/layout/mobile-bottom-player.tsx:84](components/layout/mobile-bottom-player.tsx#L84) — `href={`/audit-brief/${currentAuditBrief.id}`}` (Mini-player → detail)

---

## 4. Programmatic Navigation

`router.push` / `router.replace` / `router.back` / `router.refresh` calls, plus server-side `redirect(...)` from `next/navigation`.

### `router.push`

- [components/admin/audit-log-table.tsx:135](components/admin/audit-log-table.tsx#L135) — `router.push(`?${next.toString()}`)` (Pagination)
- [components/admin/audit-log-table.tsx:176](components/admin/audit-log-table.tsx#L176) — `router.push('?')` (Reset filters)
- [components/admin/edit-audit-brief-client.tsx:58](components/admin/edit-audit-brief-client.tsx#L58) — `router.push('/admin')` (On successful save)
- [components/admin/learning-series-wizard.tsx:193](components/admin/learning-series-wizard.tsx#L193) — `router.push('/learning-path')` (After series creation)
- [components/learning-path/path-list-client.tsx:59](components/learning-path/path-list-client.tsx#L59) — `router.push(qs ? `?${qs}` : '?')` (Filter update)
- [components/library/library-filters.tsx:50](components/library/library-filters.tsx#L50) — `router.push(qs ? `?${qs}` : '?')` (Filter update)
- [components/library/pagination-controls.tsx:41](components/library/pagination-controls.tsx#L41) — `router.push(qs ? `?${qs}` : '?')` (Pagination)
- [components/layout/sidebar-user-profile.tsx:84](components/layout/sidebar-user-profile.tsx#L84) — `router.push('/login')` (After logout)
- [components/layout/command-palette.tsx:85](components/layout/command-palette.tsx#L85) — `router.push(path)` (Command palette navigation)
- [hooks/use-wizard-submit.ts:289](hooks/use-wizard-submit.ts#L289) — `router.push('/bulletins')` (Post-upload)
- [app/(admin)/admin/upload/page.tsx:73](<app/(admin)/admin/upload/page.tsx#L73>) — `onSuccess={() => router.push('/admin')}`
- [app/(admin)/admin/learning-graphs/new/page.tsx:74](<app/(admin)/admin/learning-graphs/new/page.tsx#L74>) — `onSuccess={() => router.push('/admin')}`

### `router.back`

- [components/admin/transcript-editor.tsx:170](components/admin/transcript-editor.tsx#L170) — Cancel button
- [app/(admin)/admin/upload/page.tsx:45](<app/(admin)/admin/upload/page.tsx#L45>) — Wizard first-step back
- [app/(admin)/admin/learning-graphs/new/page.tsx:47](<app/(admin)/admin/learning-graphs/new/page.tsx#L47>) — Wizard first-step back

### `router.refresh`

- [components/admin/admin-dashboard-client.tsx:31](components/admin/admin-dashboard-client.tsx#L31) — Post-mutation reload
- [components/admin/learning-graphs-table.tsx:62](components/admin/learning-graphs-table.tsx#L62) — Post-delete reload
- [components/admin/transcript-editor.tsx:111](components/admin/transcript-editor.tsx#L111) — Post-save reload

### Server-side `redirect()` / middleware redirects

- [app/(auth)/register/page.tsx:38](<app/(auth)/register/page.tsx#L38>) — `redirect('/login')` (When SSO-only mode is active)
- [app/(admin)/admin/users/page.tsx:36](<app/(admin)/admin/users/page.tsx#L36>) — `redirect('/unauthorized')` (Non-superadmin viewing user mgmt)
- [middleware.ts:82-83](middleware.ts#L82) — `unauthorizedUrl.pathname = '/unauthorized'` + `NextResponse.redirect(...)` (Non-admin hitting `/admin/*`)
- [middleware.ts:134](middleware.ts#L134) — `pages: { signIn: '/login' }` (NextAuth-driven redirect for unauthenticated users)
- [lib/auth/next-auth-options.ts:153](lib/auth/next-auth-options.ts#L153) — `signIn: '/login'`
- [lib/auth/next-auth-options.ts:154](lib/auth/next-auth-options.ts#L154) — `error: '/login'` (NextAuth error page)

---

## 5. API Endpoints

Every `route.ts` under [app/api/](app/api/), with HTTP methods, auth gate, and purpose.

### Health & readiness

- `GET /api/health` — Liveness probe — [app/api/health/route.ts](app/api/health/route.ts) — **public**
- `GET /api/ready` — Readiness probe (DB connectivity) — [app/api/ready/route.ts](app/api/ready/route.ts) — **public**

### Authentication

- `GET/POST /api/auth/[...nextauth]` — NextAuth catch-all (exposes `signin`, `signout`, `session`, `csrf`, `callback/azure-ad`, `callback/credentials`, `providers`, `error`) — [app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts) — **public**
- `POST /api/auth/register` — New user registration (dev/credentials mode) — [app/api/auth/register/route.ts](app/api/auth/register/route.ts) — **public**

### Search

- `GET /api/search?q=...` — Text search across audit briefs + transcripts — [app/api/search/route.ts](app/api/search/route.ts) — **public (GET)**
- `POST /api/search` — Semantic/pgvector search — [app/api/search/route.ts](app/api/search/route.ts) — **authenticated**

### Users (superadmin)

- `GET /api/users?...` — Paginated user list — [app/api/users/route.ts](app/api/users/route.ts) — **superadmin**
- `PUT /api/users/[id]/role` — Change a user's role — [app/api/users/[id]/role/route.ts](app/api/users/[id]/role/route.ts) — **superadmin**

### Favorites

- `GET /api/favorites` — List user's favorite audit brief IDs — [app/api/favorites/route.ts](app/api/favorites/route.ts) — **authenticated**
- `POST /api/favorites` — Toggle favorite — [app/api/favorites/route.ts](app/api/favorites/route.ts) — **authenticated**
- `GET /api/learning-graph-favorites` — List user's favorite learning graph IDs — [app/api/learning-graph-favorites/route.ts](app/api/learning-graph-favorites/route.ts) — **authenticated**
- `POST /api/learning-graph-favorites` — Toggle favorite — [app/api/learning-graph-favorites/route.ts](app/api/learning-graph-favorites/route.ts) — **authenticated**

### Bookmarks

- `GET /api/bookmarks?auditBriefId=|episodeId=|limit=` — List bookmarks — [app/api/bookmarks/route.ts](app/api/bookmarks/route.ts) — **authenticated**
- `POST /api/bookmarks` — Create bookmark — [app/api/bookmarks/route.ts](app/api/bookmarks/route.ts) — **authenticated**
- `PUT /api/bookmarks/[id]` — Update bookmark note — [app/api/bookmarks/[id]/route.ts](app/api/bookmarks/[id]/route.ts) — **authenticated**
- `DELETE /api/bookmarks/[id]` — Delete bookmark — [app/api/bookmarks/[id]/route.ts](app/api/bookmarks/[id]/route.ts) — **authenticated**

### Activity & progress

- `POST /api/activity` — Fire-and-forget activity log — [app/api/activity/route.ts](app/api/activity/route.ts) — **authenticated**
- `GET /api/progress` — Fetch user progress — [app/api/progress/route.ts](app/api/progress/route.ts) — **authenticated**
- `POST /api/progress` — Mark episode complete — [app/api/progress/route.ts](app/api/progress/route.ts) — **authenticated**
- `DELETE /api/progress/[id]` — Unmark episode — [app/api/progress/[id]/route.ts](app/api/progress/[id]/route.ts) — **authenticated**

### Audit briefs

- `GET /api/audit-briefs?...` — Paginated list — [app/api/audit-briefs/route.ts](app/api/audit-briefs/route.ts) — **public (GET)**
- `POST /api/audit-briefs` — Create audit brief — [app/api/audit-briefs/route.ts](app/api/audit-briefs/route.ts) — **admin**
- `GET /api/audit-briefs/[id]` — Fetch single (with transcripts) — [app/api/audit-briefs/[id]/route.ts](app/api/audit-briefs/[id]/route.ts) — **public (GET)**
- `PUT /api/audit-briefs/[id]` — Update metadata (optimistic concurrency) — [app/api/audit-briefs/[id]/route.ts](app/api/audit-briefs/[id]/route.ts) — **admin**
- `DELETE /api/audit-briefs/[id]?hard=true` — Soft-archive (default) or hard-delete — [app/api/audit-briefs/[id]/route.ts](app/api/audit-briefs/[id]/route.ts) — **admin**
- `GET /api/audit-briefs/[id]/transcript` — Fetch transcripts — [app/api/audit-briefs/[id]/transcript/route.ts](app/api/audit-briefs/[id]/transcript/route.ts) — **public (GET)**
- `PUT /api/audit-briefs/[id]/transcript` — Upsert transcript + regenerate embedding — [app/api/audit-briefs/[id]/transcript/route.ts](app/api/audit-briefs/[id]/transcript/route.ts) — **admin**
- `PATCH /api/audit-briefs/batch` — Batch-update sort orders — [app/api/audit-briefs/batch/route.ts](app/api/audit-briefs/batch/route.ts) — **admin**

### Learning graphs

- `GET /api/learning-graphs?...` — Paginated list — [app/api/learning-graphs/route.ts](app/api/learning-graphs/route.ts) — **public (GET)**
- `POST /api/learning-graphs` — Create graph — [app/api/learning-graphs/route.ts](app/api/learning-graphs/route.ts) — **admin**
- `GET /api/learning-graphs/[id]` — Fetch graph with episodes + edges — [app/api/learning-graphs/[id]/route.ts](app/api/learning-graphs/[id]/route.ts) — **public (GET)**
- `PUT /api/learning-graphs/[id]` — Update metadata — [app/api/learning-graphs/[id]/route.ts](app/api/learning-graphs/[id]/route.ts) — **admin**
- `DELETE /api/learning-graphs/[id]` — Hard-delete + blob purge — [app/api/learning-graphs/[id]/route.ts](app/api/learning-graphs/[id]/route.ts) — **admin**
- `PUT /api/learning-graphs/[id]/data` — Bulk upsert episodes + edges — [app/api/learning-graphs/[id]/data/route.ts](app/api/learning-graphs/[id]/data/route.ts) — **admin**

### Upload & media

- `POST /api/upload` — Issue presigned Azure Blob upload URL — [app/api/upload/route.ts](app/api/upload/route.ts) — **admin**
- `POST /api/upload/file` — Direct server-side multipart upload (middleware-bypass for large files) — [app/api/upload/file/route.ts](app/api/upload/file/route.ts) — **admin**
- `GET /api/media?...` — Stream media/PDF blobs with range support — [app/api/media/route.ts](app/api/media/route.ts) — **public**

### Admin ops

- `GET /api/admin/analytics?from=&to=` — Analytics summary — [app/api/admin/analytics/route.ts](app/api/admin/analytics/route.ts) — **admin**
- `POST /api/admin/blob-sweep?dry-run=false` — Orphan blob sweep — [app/api/admin/blob-sweep/route.ts](app/api/admin/blob-sweep/route.ts) — **superadmin**

---

## 6. Client-side Fetch Callsites

Every `fetch(withBasePath('/api/...'))` in the codebase. All go through the basePath helper.

### Auth

- [components/auth/register-form.tsx:33](components/auth/register-form.tsx#L33) — `POST /api/auth/register`
- [components/layout/sidebar-user-profile.tsx:83](components/layout/sidebar-user-profile.tsx#L83) — `POST /api/auth/logout` (handled by NextAuth `[...nextauth]`)

### Search

- [app/(public)/search/page.tsx:46](<app/(public)/search/page.tsx#L46>) — `GET /api/search?q=...` (text)
- [app/(public)/search/page.tsx:50](<app/(public)/search/page.tsx#L50>) — `POST /api/search` (semantic)

### Favorites

- [hooks/use-favorites.ts:49](hooks/use-favorites.ts#L49) — `GET /api/favorites`
- [hooks/use-favorites.ts:88](hooks/use-favorites.ts#L88) — `POST /api/favorites`
- [hooks/use-learning-graph-favorites.ts:49](hooks/use-learning-graph-favorites.ts#L49) — `GET /api/learning-graph-favorites`
- [hooks/use-learning-graph-favorites.ts:86](hooks/use-learning-graph-favorites.ts#L86) — `POST /api/learning-graph-favorites`

### Bookmarks

- [components/audio-player/bookmark-panel.tsx:70](components/audio-player/bookmark-panel.tsx#L70) — `GET /api/bookmarks?auditBriefId=...`
- [components/audio-player/bookmark-panel.tsx:106](components/audio-player/bookmark-panel.tsx#L106) — `POST /api/bookmarks`
- [components/audio-player/bookmark-panel.tsx:137](components/audio-player/bookmark-panel.tsx#L137) — `DELETE /api/bookmarks/[id]`
- [components/audio-player/bookmark-panel.tsx:157](components/audio-player/bookmark-panel.tsx#L157) — `PUT /api/bookmarks/[id]`
- [components/audio-player/sidebar-bookmarks.tsx:70](components/audio-player/sidebar-bookmarks.tsx#L70) — `GET /api/bookmarks?auditBriefId=...`
- [components/audio-player/sidebar-bookmarks.tsx:99](components/audio-player/sidebar-bookmarks.tsx#L99) — `POST /api/bookmarks`
- [components/audio-player/audit-brief-detail-layout.tsx:107](components/audio-player/audit-brief-detail-layout.tsx#L107) — `POST /api/bookmarks`
- [components/learning-path/episode-bookmarks.tsx:65](components/learning-path/episode-bookmarks.tsx#L65) — `GET /api/bookmarks?episodeId=...`
- [components/learning-path/path-viewer-wrapper.tsx:109](components/learning-path/path-viewer-wrapper.tsx#L109) — `POST /api/bookmarks`
- [components/progress/progress-dashboard.tsx:79](components/progress/progress-dashboard.tsx#L79) — `GET /api/bookmarks?limit=100`

### Activity & progress

- [hooks/use-listen-tracker.ts:36](hooks/use-listen-tracker.ts#L36) — `POST /api/activity` (30s listen heartbeat)
- [components/learning-path/episode-player.tsx:112](components/learning-path/episode-player.tsx#L112) — `POST /api/progress` (mark complete)
- [components/learning-path/path-list-client.tsx:83](components/learning-path/path-list-client.tsx#L83) — `GET /api/progress`
- [components/learning-path/path-viewer-wrapper.tsx:81](components/learning-path/path-viewer-wrapper.tsx#L81) — `GET /api/progress`
- [components/progress/progress-dashboard.tsx:78](components/progress/progress-dashboard.tsx#L78) — `GET /api/progress`

### Audit briefs (admin)

- [components/admin/audit-brief-table.tsx:104](components/admin/audit-brief-table.tsx#L104) — `PATCH /api/audit-briefs/batch`
- [components/admin/audit-brief-table-actions.tsx:67](components/admin/audit-brief-table-actions.tsx#L67) — `PUT /api/audit-briefs/[id]`
- [components/admin/audit-brief-table-actions.tsx:80](components/admin/audit-brief-table-actions.tsx#L80) — `DELETE /api/audit-briefs/[id]` (soft)
- [components/admin/audit-brief-table-actions.tsx:102](components/admin/audit-brief-table-actions.tsx#L102) — `DELETE /api/audit-briefs/[id]?hard=true`
- [components/admin/transcript-editor.tsx:86](components/admin/transcript-editor.tsx#L86) — `PUT /api/audit-briefs/[id]/transcript`
- [hooks/use-audit-brief-submit.ts:214](hooks/use-audit-brief-submit.ts#L214) — `POST /api/audit-briefs` or `PUT /api/audit-briefs/[id]`
- [hooks/use-audit-brief-submit.ts:232](hooks/use-audit-brief-submit.ts#L232) — `PUT /api/audit-briefs/[id]/transcript` (short)
- [hooks/use-audit-brief-submit.ts:243](hooks/use-audit-brief-submit.ts#L243) — `PUT /api/audit-briefs/[id]/transcript` (long)
- [hooks/use-wizard-submit.ts:260](hooks/use-wizard-submit.ts#L260) — `PUT /api/audit-briefs/[id]/transcript` (short)
- [hooks/use-wizard-submit.ts:271](hooks/use-wizard-submit.ts#L271) — `PUT /api/audit-briefs/[id]/transcript` (long)

### Learning graphs (admin)

- [components/admin/learning-series-wizard.tsx:145](components/admin/learning-series-wizard.tsx#L145) — `POST /api/learning-graphs`
- [components/admin/learning-series-wizard.tsx:164](components/admin/learning-series-wizard.tsx#L164) — `PUT /api/learning-graphs/[id]`
- [components/admin/learning-graphs-table.tsx:48](components/admin/learning-graphs-table.tsx#L48) — `DELETE /api/learning-graphs/[id]`
- [stores/graph-editor-store.ts:151](stores/graph-editor-store.ts#L151) — `PUT /api/learning-graphs/[id]/data`

### Upload

- [hooks/use-wizard-submit.ts:234](hooks/use-wizard-submit.ts#L234) — `POST /api/upload` **or** `POST /api/upload/file` (branching on payload size)

### Users (superadmin)

- [components/admin/users-table.tsx:68](components/admin/users-table.tsx#L68) — `GET /api/users?...`
- [components/admin/users-table.tsx:91](components/admin/users-table.tsx#L91) — `PUT /api/users/[id]/role`

### Analytics

- [components/admin/analytics-charts.tsx:59](components/admin/analytics-charts.tsx#L59) — `GET /api/admin/analytics?${params}`

---

## 7. Auth Redirects & Callback URLs

- **NextAuth sign-in page:** `/login` — [lib/auth/next-auth-options.ts:153](lib/auth/next-auth-options.ts#L153) and [middleware.ts:134](middleware.ts#L134).
- **NextAuth error page:** `/login` — [lib/auth/next-auth-options.ts:154](lib/auth/next-auth-options.ts#L154).
- **Azure AD OAuth callback:** `/api/auth/callback/azure-ad` (full: `https://<host>/auditbrief/api/auth/callback/azure-ad`) — [components/auth/sso-button.tsx:61](components/auth/sso-button.tsx#L61) + Entra ID app registration redirect URI.
- **`redirectTo` query param** on `/login` and `/register` — after successful auth, user is bounced to `params.redirectTo ?? '/'` (basePath prepended client-side).
- **Unauthorized redirect:** Admin pages + middleware send non-admin users to `/unauthorized` — [middleware.ts:82-83](middleware.ts#L82), [app/(admin)/admin/users/page.tsx:36](<app/(admin)/admin/users/page.tsx#L36>).
- **SSO-only register lockdown:** If Azure AD env vars are configured, `/register` server-redirects to `/login` — [app/(auth)/register/page.tsx:38](<app/(auth)/register/page.tsx#L38>).

---

## 8. Query Parameters per Route

Parameters the UI reads off the URL for state restoration and filters.

- `/bulletins` — `?domain=<slug>`, `?sort=newest|oldest|relevance`, `?page=<n>`, `?q=<text>`, `?favorites=true`
- `/learning-path` — `?domain=<slug>`, `?favorites=true`
- `/audit-brief/[id]` — `?t=<seconds>` (jump to transcript timestamp, used by search hits)
- `/search` — `?q=<text>` (driven by the search form)
- `/admin/audit-log` — pagination/filter params written by [components/admin/audit-log-table.tsx](components/admin/audit-log-table.tsx)
- `/login`, `/register` — `?redirectTo=<path>` (post-auth destination)
- `/api/audit-briefs` (GET) — `domain`, `year`, `tag`, `q`, `sort`, `page`, `limit`
- `/api/audit-briefs/[id]` (DELETE) — `?hard=true` to escalate from soft-archive to hard-delete
- `/api/bookmarks` (GET) — `auditBriefId`, `episodeId`, `limit`
- `/api/admin/analytics` (GET) — `from`, `to` (ISO dates)
- `/api/admin/blob-sweep` (POST) — `?dry-run=false` to commit deletes
- `/api/media` (GET) — signed/parameterised blob streaming (see handler)

---

## 9. External URLs (outbound)

Fully-qualified URLs the app calls out to or references in config.

### Azure Blob Storage

- `https://*.blob.core.windows.net` — production blob host (CSP + `images.remotePatterns`) — [next.config.ts:20](next.config.ts#L20), [next.config.ts:63](next.config.ts#L63).
- `http://127.0.0.1:10000/devstoreaccount1` — local Azurite emulator — [.env.example:14](.env.example#L14), [docker-compose.yml](docker-compose.yml).
- Blob SDK client initialised from `AZURE_BLOB_CONNECTION_STRING` — [lib/storage-client.ts](lib/storage-client.ts).

### Azure PostgreSQL

- `*.postgres.database.azure.com:5432` — prod DB (TLS required, `sslmode=require`) — [.env.example:3](.env.example#L3), [docs/deployment-guide.md](docs/deployment-guide.md).
- `localhost:5432` — local Postgres container from docker-compose.

### Azure OpenAI (embeddings)

- `https://<resource>.openai.azure.com/openai/deployments/<deployment>/embeddings?api-version=2024-02-01` — constructed dynamically at [lib/embeddings.ts:41](lib/embeddings.ts#L41).
- API version pinned to `2024-02-01` — [lib/embeddings.ts:11](lib/embeddings.ts#L11).

### Microsoft Entra ID (Azure AD SSO)

- OAuth2/OIDC endpoints owned by Microsoft; wired via the NextAuth `azure-ad` provider at [lib/auth/next-auth-options.ts:103-132](lib/auth/next-auth-options.ts#L103).
- App's registered redirect URI: `https://<domain>/auditbrief/api/auth/callback/azure-ad` — [.env.example:24](.env.example#L24).

### unpkg CDN (PDF.js worker)

- `https://unpkg.com/pdfjs-dist@<version>/build/pdf.worker.min.mjs` — [components/audio-player/bulletin-viewer.tsx:30](components/audio-player/bulletin-viewer.tsx#L30).
- Allowed by CSP `script-src`, `connect-src`, `worker-src` — [next.config.ts:20](next.config.ts#L20).

### Sentry (optional)

- `https://<key>@sentry.io/<project>` — configured via `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — [.env.example:30-31](.env.example#L30).

### Docker base images

- `mcr.microsoft.com/azure-storage/azurite` — Azurite emulator image — [docker-compose.yml](docker-compose.yml).
- `pgvector/pgvector:pg16` — Postgres + pgvector image — [docker-compose.yml](docker-compose.yml).

### Non-network URL references

- `http://www.w3.org/2000/svg` — SVG XML namespace (not a network call) — [components/auth/sso-button.tsx:37](components/auth/sso-button.tsx#L37).

---

## 10. URL-shaped Environment Variables

All env vars that hold a URL or URL fragment. See [.env.example](.env.example) for the full schema.

| Variable                            | Required? | Purpose                                                                                                                                  | Example                                                                                             |
| ----------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                      | Yes       | Postgres connection string (pgvector)                                                                                                    | `postgresql://user:pass@host.postgres.database.azure.com:5432/db?sslmode=require`                   |
| `NEXTAUTH_URL`                      | Yes       | Canonical app URL **including basePath**                                                                                                 | `https://uat.uno.wcgt.in/auditbrief`                                                                |
| `NEXT_PUBLIC_APP_URL`               | Yes       | Origin (scheme+host+port) **without** basePath — used for CORS                                                                           | `https://uat.uno.wcgt.in`                                                                           |
| `NEXT_PUBLIC_BASE_PATH`             | Yes       | Deployment subpath (read by both `next.config.ts` and [lib/config/base-path.ts](lib/config/base-path.ts))                                | `/auditbrief`                                                                                       |
| `AZURE_BLOB_CONNECTION_STRING`      | Yes       | Azure Blob endpoint + credentials                                                                                                        | `DefaultEndpointsProtocol=https;AccountName=...;...BlobEndpoint=https://acct.blob.core.windows.net` |
| `AZURE_BLOB_CONTAINER`              | Yes       | Container name                                                                                                                           | `the-audit-brief-uploads`                                                                           |
| `AZURE_OPENAI_ENDPOINT`             | Optional  | Azure OpenAI base URL                                                                                                                    | `https://myresource.openai.azure.com`                                                               |
| `AZURE_OPENAI_API_KEY`              | Optional  | **Primary** — API key read by [lib/embeddings.ts:33](lib/embeddings.ts#L33); `.env.example` is aligned to this name.                     | `<key>`                                                                                             |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Optional  | **Primary** — deployment name read by [lib/embeddings.ts:34](lib/embeddings.ts#L34); default `text-embedding-3-large`.                   | `text-embedding-3-large`                                                                            |
| `AZURE_OPENAI_KEY`                  | Legacy    | Older name still emitted by Bicep templates under `infra/`. **Not read by application code** — kept for grep / migration awareness only. | —                                                                                                   |
| `AZURE_OPENAI_DEPLOYMENT`           | Legacy    | Older deployment-name var. **Not read by application code**.                                                                             | —                                                                                                   |
| `AZURE_AD_CLIENT_ID`                | Optional  | Entra ID app client ID (enables SSO when present)                                                                                        | `<guid>`                                                                                            |
| `AZURE_AD_CLIENT_SECRET`            | Optional  | Entra ID client secret                                                                                                                   | `<secret>`                                                                                          |
| `AZURE_AD_TENANT_ID`                | Optional  | Entra ID tenant ID                                                                                                                       | `<guid>`                                                                                            |
| `SENTRY_DSN`                        | Reserved  | Server-side Sentry DSN. **SDK not currently initialized** — variable is reserved for future use.                                         | `https://<key>@sentry.io/<proj>`                                                                    |
| `NEXT_PUBLIC_SENTRY_DSN`            | Reserved  | Client-side Sentry DSN. **SDK not currently initialized**.                                                                               | `https://<key>@sentry.io/<proj>`                                                                    |
| `NEXTAUTH_SECRET`                   | Yes       | Not a URL — JWT encryption secret (32+ chars). Included for completeness.                                                                | —                                                                                                   |
| `BCRYPT_SALT_ROUNDS`                | Optional  | Not a URL — bcrypt cost factor read by [lib/auth/password.ts](lib/auth/password.ts). Default `12`.                                       | `12`                                                                                                |
| `SLOW_QUERY_THRESHOLD_MS`           | Optional  | Not a URL — slow-query log threshold read by [lib/db-instrumentation.ts:26](lib/db-instrumentation.ts#L26). Default `500`.               | `500`                                                                                               |
| `PORT`                              | Optional  | Listen port (prod default `3103`)                                                                                                        | `3103`                                                                                              |

---

## 11. Base Path Behaviour

The app runs under basePath `/auditbrief` (from `NEXT_PUBLIC_BASE_PATH`). This shapes every link:

- **`<Link>` / `router.push` / `redirect()`** — basePath is prepended automatically by Next.js.
- **`fetch()` and hard `window.location.href`** — do **not** respect basePath. All such calls must wrap the path in [`withBasePath(...)`](lib/config/base-path.ts#L29). Every client-side fetch in section 6 does this.
- **External resources** (Azure Blob signed URLs, unpkg, OAuth endpoints) are absolute and unaffected.
- `NEXTAUTH_URL` must include the basePath; `NEXT_PUBLIC_APP_URL` must not (it's a CORS origin).
- The middleware matcher accommodates the basePath via the `(?:auditbrief/)?` prefix — [middleware.ts:147](middleware.ts#L147).

---

## 12. Protected Route Matrix

Consolidated auth requirements across pages and APIs.

### Pages

| Route                                                                                                                                    | Auth level                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `/login`, `/register`, `/unauthorized`                                                                                                   | **Public**                                                   |
| `/`, `/bulletins`, `/audit-brief/[id]`, `/search`, `/learning-path`, `/learning-path/[id]`, `/progress`                                  | **Authenticated** (enforced by `middleware.ts` default-deny) |
| `/admin`, `/admin/upload`, `/admin/edit/*`, `/admin/learning-graphs`, `/admin/learning-graphs/*`, `/admin/analytics`, `/admin/audit-log` | **admin / superadmin**                                       |
| `/admin/users`                                                                                                                           | **superadmin only**                                          |

### APIs

| Route                                                                                                   | Auth level                             | Source                                   |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `/api/health`, `/api/ready`, `/api/media`                                                               | **Public**                             | [middleware.ts:110](middleware.ts#L110)  |
| `/api/auth/*`                                                                                           | **Public** (NextAuth manages sessions) | [middleware.ts:115](middleware.ts#L115)  |
| `GET /api/audit-briefs*`, `GET /api/learning-graphs*`, `GET /api/search`                                | **Public**                             | [middleware.ts:48-55](middleware.ts#L48) |
| `POST /api/search` (semantic)                                                                           | Authenticated                          | Handler-side `requireAuth`               |
| `/api/favorites`, `/api/learning-graph-favorites`, `/api/bookmarks*`, `/api/activity`, `/api/progress*` | **Authenticated**                      | Default-deny + handler `requireAuth`     |
| `POST/PUT/DELETE/PATCH /api/audit-briefs*`, `/api/learning-graphs*`, `/api/upload`, `/api/upload/file`  | **admin**                              | Handler-side `requireRole('admin')`      |
| `/api/users*`, `/api/admin/blob-sweep`                                                                  | **superadmin**                         | Handler-side `requireRole('superadmin')` |
| `/api/admin/analytics`                                                                                  | **admin**                              | Handler-side `requireRole('admin')`      |

---

_Generated from codebase inspection on 2026-04-17. Regenerate by re-running the verification greps in the plan file at [`~/.claude/plans/create-a-detailed-md-fluttering-wilkinson.md`](.)._
