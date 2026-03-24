# Add `basePath: '/auditbrief'` for subpath deployment

## Context

The app is deployed at `uat.uno.wcgt.in/auditbrief` via nginx proxy to port 3103. But Next.js doesn't know about the `/auditbrief` prefix, so all internal redirects, fetch calls, and asset URLs point to `/` — which hits the UNO app (port 3000) instead.

## What Next.js handles automatically (NO changes needed)

- `<Link href="...">` — auto-prepends basePath
- `router.push()` / `router.replace()` — auto-prepends basePath
- `redirect()` from `next/navigation` — auto-prepends basePath
- `_next/static/*` asset URLs — auto-prepended
- `public/` folder assets — auto-prepended
- Middleware `request.nextUrl.pathname` — basePath already stripped

## What breaks (MUST fix)

- `fetch('/api/...')` — browser fetch has no Next.js awareness, goes to wrong app
- `window.location.href = '...'` — hard navigations bypass Next.js router
- Middleware `new URL('/path', request.url)` — loses basePath in redirect
- `NEXTAUTH_URL` env var — must include basePath for correct callback URLs

---

## Changes

### 1. `next.config.ts` — add basePath

Add `basePath: '/auditbrief'` to the config object.

### 2. `lib/config/base-path.ts` — new shared constant

```typescript
/** The subpath prefix under which the app is deployed (matches next.config.ts basePath). */
export const BASE_PATH = '/auditbrief';

/**
 * Prepends the deployment basePath to a URL path.
 * Browser fetch() doesn't know about Next.js basePath, so this is needed
 * for all client-side fetch calls and window.location assignments.
 *
 * @example
 * fetch(withBasePath('/api/search'))  // → fetch('/auditbrief/api/search')
 */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
```

Single source of truth — if basePath ever changes, only this file and next.config.ts need updating. No API routes are renamed; this just adds the URL prefix that nginx needs to route to the correct app.

### 3. Client-side `fetch()` calls — prepend basePath via `withBasePath()`

Files to update (13 files):

- `components/auth/register-form.tsx:32` — `fetch('/api/auth/register')`
- `components/layout/sidebar-user-profile.tsx:82` — `fetch('/api/auth/logout')`
- `components/audio-player/bookmark-panel.tsx` — `fetch('/api/bookmarks')`
- `components/audio-player/sidebar-bookmarks.tsx` — `fetch('/api/bookmarks')`
- `components/admin/audit-brief-table.tsx` — `fetch('/api/audit-briefs/batch')`
- `components/admin/learning-series-wizard.tsx` — `fetch('/api/learning-graphs')`
- `components/learning-path/episode-player.tsx` — `fetch('/api/progress')`
- `components/learning-path/path-list-client.tsx` — `fetch('/api/progress')`
- `components/learning-path/path-viewer-wrapper.tsx` — `fetch('/api/progress')`
- `components/progress/progress-dashboard.tsx` — `fetch('/api/progress')`, `fetch('/api/bookmarks')`
- `app/(public)/search/page.tsx` — `fetch('/api/search')`
- `hooks/use-favorites.ts` — `fetch('/api/favorites')` (2 calls)
- `hooks/use-listen-tracker.ts` — `fetch('/api/activity')`

Pattern: `fetch('/api/...')` → `fetch(withBasePath('/api/...'))`

### 4. `window.location.href` assignments — prepend basePath

- `components/auth/login-form.tsx:70` — `window.location.href = redirectTo`
  - Change to: `window.location.href = redirectTo.startsWith(BASE_PATH) ? redirectTo : BASE_PATH + redirectTo`
- `components/auth/register-form.tsx:53` — `window.location.href = '/login'`
  - Change to: `window.location.href = BASE_PATH + '/login'`
- `components/auth/register-form.tsx:57` — `window.location.href = redirectTo`
  - Same pattern as login-form.tsx:70

### 5. `middleware.ts:71` — fix redirect to use nextUrl

```typescript
// Before:
NextResponse.redirect(new URL('/unauthorized', request.url));

// After:
const unauthorizedUrl = request.nextUrl.clone();
unauthorizedUrl.pathname = '/unauthorized';
NextResponse.redirect(unauthorizedUrl);
```

This preserves basePath in the redirect URL.

### 6. Environment variables — deployment team must update

On the VM `.env`:

```
NEXTAUTH_URL=https://uat.uno.wcgt.in/auditbrief
NEXT_PUBLIC_APP_URL=https://uat.uno.wcgt.in
```

- `NEXTAUTH_URL` MUST include `/auditbrief` so NextAuth builds correct callback URLs
- `NEXT_PUBLIC_APP_URL` must NOT include basePath (used for CORS origin matching)

Update `.env.example` comments to document this distinction.

### 7. Azure AD Redirect URI (deployment team action)

The Entra ID app registration redirect URI must be updated:

- From: `https://uat.uno.wcgt.in/api/auth/callback/azure-ad`
- To: `https://uat.uno.wcgt.in/auditbrief/api/auth/callback/azure-ad`

### 8. Infrastructure files — update paths

- `infra/parameters/production.bicepparam` — update appUrl and entraRedirectUri
- `infra/parameters/staging.bicepparam` — same
- `infra/modules/container-app.bicep` — health probe paths need `/auditbrief` prefix

---

## Files to modify (code changes)

| File                                               | Change                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `next.config.ts`                                   | Add `basePath: '/auditbrief'`                                    |
| `lib/config/base-path.ts`                          | **NEW** — `BASE_PATH` constant + `withBasePath()` utility        |
| `middleware.ts`                                    | Fix redirect to use `nextUrl.clone()`                            |
| `components/auth/login-form.tsx`                   | Prepend basePath on `window.location.href`                       |
| `components/auth/register-form.tsx`                | `withBasePath()` for fetch + basePath for `window.location.href` |
| `components/layout/sidebar-user-profile.tsx`       | `withBasePath()` for fetch                                       |
| `components/audio-player/bookmark-panel.tsx`       | `withBasePath()` for fetch                                       |
| `components/audio-player/sidebar-bookmarks.tsx`    | `withBasePath()` for fetch                                       |
| `components/admin/audit-brief-table.tsx`           | `withBasePath()` for fetch                                       |
| `components/admin/learning-series-wizard.tsx`      | `withBasePath()` for fetch                                       |
| `components/learning-path/episode-player.tsx`      | `withBasePath()` for fetch                                       |
| `components/learning-path/path-list-client.tsx`    | `withBasePath()` for fetch                                       |
| `components/learning-path/path-viewer-wrapper.tsx` | `withBasePath()` for fetch                                       |
| `components/progress/progress-dashboard.tsx`       | `withBasePath()` for fetch                                       |
| `app/(public)/search/page.tsx`                     | `withBasePath()` for fetch                                       |
| `hooks/use-favorites.ts`                           | `withBasePath()` for fetch                                       |
| `hooks/use-listen-tracker.ts`                      | `withBasePath()` for fetch                                       |
| `.env.example`                                     | Update NEXTAUTH_URL comment, document basePath distinction       |
| `infra/parameters/production.bicepparam`           | Add basePath to URLs                                             |
| `infra/parameters/staging.bicepparam`              | Add basePath to URLs                                             |
| `infra/modules/container-app.bicep`                | Health probe paths                                               |

## Verification

1. `npm run build` succeeds
2. `npm run dev` — app accessible at `http://localhost:3000/auditbrief`
3. Login flow works (redirects stay within `/auditbrief/`)
4. All API calls work (check Network tab — requests go to `/auditbrief/api/...`)
5. Admin pages accessible at `/auditbrief/admin`
6. `npm run test` — update any broken test paths
7. Grep for remaining bare `/api/` fetch calls without `withBasePath()`
