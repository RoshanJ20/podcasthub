# Domain-Scoped Admin Permissions

## Overview

Move domains from a podcast-level attribute to a user-level permission concept. Admin users are assigned one or more domains by a superadmin. Domain-scoped admins can only create, edit, and view content within their assigned domains. Superadmins retain unrestricted ("god mode") access. Public users continue to view all content.

## Goals

- Scope admin permissions to specific domains (e.g., a LEAP admin can only manage LEAP content)
- Superadmin assigns domains to admins via the user management page
- All admin features (podcasts, learning graphs, analytics) are domain-scoped
- User management remains superadmin-only
- Public-facing pages are unaffected

## Non-Goals

- Dedicated domain management UI (domains are seeded; new ones added via migration)
- Domain-scoping for public users
- Changes to the public-facing pages or API responses
- Foreign key constraints between Domain table and Podcast/LearningGraph domain columns (future improvement)

---

## Data Model

### New: `Domain` Table

```prisma
model Domain {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name      String   @unique          // Display name, e.g., "LEAP", "Audit Methodology"
  slug      String   @unique          // Immutable identifier, e.g., "leap", "audit-methodology"
  isActive  Boolean  @default(true)   @map("is_active")
  createdAt DateTime @default(now())  @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now())  @updatedAt @map("updated_at") @db.Timestamptz

  @@map("domains")
}
```

**Seeded with:**

| name                     | slug                     |
| ------------------------ | ------------------------ |
| Audit Methodology        | audit-methodology        |
| Accounting and Reporting | accounting-and-reporting |
| Audit Technology         | audit-technology         |
| Quality and Risk         | quality-and-risk         |
| LEAP                     | leap                     |
| Auditing                 | auditing                 |

### Modified: `UserRole` Table

Add a `domains` column (PostgreSQL text array):

```prisma
model UserRole {
  // ...existing fields...
  domains   String[] @default([])    // Domain names assigned to this user
}
```

**Semantics:**

- Superadmin: `domains` is empty (unrestricted access)
- Domain admin: `domains` contains assigned domain names, e.g., `["LEAP", "Audit Technology"]`
- Public user: `domains` is empty (irrelevant — views all content)

### Existing Tables: No Changes

`Podcast.domain` and `LearningGraph.domain` remain as plain string columns. They are validated against the `Domain` table at the application level. Foreign key constraints are a future improvement — for now, domain names are the shared key between all tables.

**Trade-off: Domain renames.** If a domain name is ever changed in the `Domain` table, a data migration is required to update `UserRole.domains`, `Podcast.domain`, and `LearningGraph.domain`. Domain slugs are immutable and used only for URL-friendly identifiers, not as foreign keys.

---

## Domain Validation: Single Source of Truth

**The `Domain` table is the sole source of truth for valid domains.**

The existing `DOMAINS` constant and `domainSchema` Zod enum in `lib/schemas/common.ts` are **removed**. They are replaced by runtime validation against the `Domain` table:

- At application startup (or on first use), load all active domain names from the `Domain` table and cache them in-memory
- Expose a `getActiveDomains()` function in `lib/domains.ts` that returns the cached list
- `domainSchema` becomes `z.string().refine(name => getActiveDomains().includes(name))` — validates against the cached DB values
- Cache is invalidated when domains are modified (rare; acceptable to require server restart for new domains)

This eliminates the dual-source-of-truth problem where a TypeScript constant and a database table could drift out of sync.

**Files affected:**

- `lib/schemas/common.ts` — remove `DOMAINS`, `PODCAST_DOMAINS`, `LEARNING_SERIES_DOMAINS` constants; update `domainSchema`
- New file: `lib/domains.ts` — `getActiveDomains()`, `loadDomains()`, cache management
- `lib/schemas/podcast.ts` — uses updated `domainSchema` (no changes needed, already imports it)
- `lib/schemas/learning-graph.ts` — same

---

## Auth & JWT Changes

### JWT Payload

All four locations where the payload type is defined must be updated:

**1. `lib/auth/jwt.ts` — `JwtPayload` interface:**

```typescript
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  domains: string[]; // Empty for superadmin and public users
}
```

**2. `middleware.ts` — `UserPayload` interface:**

```typescript
interface UserPayload {
  userId: string;
  email: string;
  role: string;
  domains: string[]; // Empty for superadmin and public users
}
```

**3. `middleware.ts` — `verifyToken()` function:**

Must extract `domains` from the JWT claims.

**4. `lib/auth/api-helpers.ts` — `getAuthUser()` function:**

Must parse `x-user-domains` header (JSON string) and return `domains` array.

### Middleware

- Extract `domains` from the JWT and set `x-user-domains` header (JSON-stringified array) on the request
- `addUserHeaders()` adds `x-user-domains` alongside existing headers
- No additional DB lookups required (Edge runtime constraint)

### Token Refresh Strategy

**Constraint:** The middleware runs in the Edge runtime, which cannot use Prisma or make database calls. The current refresh logic in middleware (`signNewAccessToken(refreshPayload, accessSecret)`) uses only the refresh token's payload — no DB lookup.

**Solution:** Move token refresh with domain re-fetch to a dedicated API route:

- New route: `POST /api/auth/refresh` (Node.js runtime)
- When the middleware detects an expired access token but valid refresh token, instead of signing a new access token inline, it redirects the request to `/api/auth/refresh`
- The refresh endpoint queries `UserRole` (including `domains`) from the database, builds a fresh JWT payload, signs a new access token, and sets the cookie
- This ensures domain assignment changes by a superadmin propagate on the next access token expiry (within 15 minutes)

**Backward compatibility during deployment:** JWTs issued before this change will not contain a `domains` field. All code parsing the JWT must treat a missing `domains` field as `[]` (empty array). This means existing admins will have no domain access until they re-login or their token refreshes — which is the intended behaviour (forces explicit domain assignment by superadmin).

### Auth Helpers

New helper in `lib/auth/api-helpers.ts`:

```typescript
/**
 * Asserts the authenticated user has access to the specified domain.
 *
 * Superadmins bypass this check. Domain admins must have the domain
 * in their assigned domains array. Comparison is case-sensitive —
 * domain names are normalized at write time.
 *
 * @param user - The authenticated user's JWT payload
 * @param domain - The domain to check access for
 * @throws ApiError with status 403 if the user lacks domain access
 */
function assertDomainAccess(user: JwtPayload, domain: string): void {
  if (user.role === 'superadmin') return;
  if (!user.domains.includes(domain)) {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'You do not have access to this domain');
  }
}
```

**Helper to build domain filter for queries:**

```typescript
/**
 * Returns a Prisma where clause that filters by the user's assigned domains.
 * Superadmins get no filter (access to all domains).
 *
 * @param user - The authenticated user's JWT payload
 * @returns Prisma where clause for domain filtering
 */
function buildDomainFilter(user: JwtPayload): Record<string, unknown> {
  if (user.role === 'superadmin') return {};
  return { domain: { in: user.domains } };
}
```

Updated `getAuthUser()` to parse and return `domains` from `x-user-domains` header.

---

## API Scoping

### General Pattern

Every admin write operation calls `assertDomainAccess(user, domain)`. Every admin list operation uses `buildDomainFilter(user)` to scope queries. Superadmins bypass all domain filters.

### Admin vs Public GET Routes

The current `GET /api/podcasts` serves both public and admin consumers with no distinction. To add domain scoping for admin list views without affecting public access:

- **Public GET** (`GET /api/podcasts`, `GET /api/learning-graphs`): Unchanged. No domain filtering. Available to all users.
- **Admin GET**: The existing routes detect whether the caller is an admin (via `x-user-role` header). When the caller is an admin and an `admin=true` query parameter is present, apply `buildDomainFilter(user)` to scope results. This avoids creating separate `/api/admin/podcasts` routes and keeps the API surface small.

### Podcasts (`/api/podcasts`)

| Method         | Scoping                                                            |
| -------------- | ------------------------------------------------------------------ |
| `POST`         | `assertDomainAccess(user, body.domain)`                            |
| `PUT`          | `assertDomainAccess(user, podcast.domain)` (fetch podcast first)   |
| `GET` (admin)  | `buildDomainFilter(user)` when `admin=true` query param is present |
| `GET` (public) | No domain filtering (unchanged)                                    |
| `DELETE`       | Superadmin-only (unchanged)                                        |

### Learning Graphs (`/api/learning-graphs`)

| Method         | Scoping                                                            |
| -------------- | ------------------------------------------------------------------ |
| `POST`         | `assertDomainAccess(user, body.domain)`                            |
| `PUT`          | `assertDomainAccess(user, graph.domain)`                           |
| `GET` (admin)  | `buildDomainFilter(user)` when `admin=true` query param is present |
| `GET` (public) | No domain filtering (unchanged)                                    |
| `DELETE`       | Superadmin-only                                                    |

### Analytics (`/api/admin/analytics`)

- All aggregations (listens by domain, monthly trends, top topics) filtered to the admin's assigned domains using `buildDomainFilter(user)`
- Superadmin sees all domains as before

### Sort Order (`/api/podcasts/sort-order`)

- Batch update validates every podcast ID in the batch belongs to a domain the admin has access to

### User Info (`GET /api/auth/me`)

- New endpoint (or extend existing if present)
- Returns authenticated user's info: `id`, `email`, `displayName`, `role`, `domains`
- Used by the admin UI to know which domains to show in selectors and filters
- Available to any authenticated user

### Domain Assignment (`PUT /api/admin/users/[id]/domains`)

- Superadmin-only
- Request body: `{ domains: ["LEAP", "Audit Technology"] }`
- Validates all domain names exist in the `Domain` table (active domains only)
- Updates `UserRole.domains` array
- Returns updated user with domains

---

## Admin UI Scoping

### Dashboard (`/admin`)

- Podcast list is filtered server-side by the API (only returns the admin's domains)
- Domain filter dropdown only shows the admin's assigned domains
- Superadmin sees all domains in the dropdown

### Upload (`/admin/upload`)

- Domain selector in the form only shows the admin's assigned domains
- Superadmin sees all domains

### Edit (`/admin/edit/[id]`)

- If the podcast's domain is outside the admin's domains, the API returns 403
- UI handles 403 by redirecting to dashboard with an error toast

### Learning Graphs (`/admin/learning-graphs`)

- List filtered to admin's domains
- Create/edit forms show only assigned domains in the domain selector

### Analytics (`/admin/analytics`)

- Charts and stats reflect only the admin's domains
- Single-domain admins see no domain filter dropdown (nothing to filter)
- Multi-domain admins see a dropdown with only their domains

### Users (`/admin/users`)

- Hidden from sidebar for non-superadmin users
- API returns 403 if a domain admin attempts access
- Superadmin sees a domains multi-select field per user row to assign/remove domains
- Multi-select options are loaded from the `Domain` table (active domains only)

### How the UI Gets Domain Info

- Call `GET /api/auth/me` on the client side, which returns user info including `domains` and `role`
- Used to conditionally render domain selectors, filter options, and sidebar items
- Superadmins (`role === 'superadmin'`) load all active domains from the `Domain` table for selectors

---

## Migration Strategy

### Ordering

1. **Database migration:** Create `Domain` table; add `domains` column (text array, default `[]`) to `user_roles` table
2. **Seed data:** Populate `Domain` table with the 6 existing domains
3. **Domain validation layer:** Add `lib/domains.ts` with `getActiveDomains()`; update `domainSchema` in `lib/schemas/common.ts`
4. **Auth layer:** Update `JwtPayload` and `UserPayload` interfaces in all 4 locations; update JWT signing to include `domains`; update middleware to pass `x-user-domains` header; create `POST /api/auth/refresh` endpoint
5. **Auth helpers:** Add `assertDomainAccess()` and `buildDomainFilter()` to `lib/auth/api-helpers.ts`; update `getAuthUser()` to parse domains
6. **API routes:** Add domain scoping to all admin API routes (podcasts, learning graphs, analytics, sort order)
7. **New API endpoints:** `GET /api/auth/me`, `PUT /api/admin/users/[id]/domains`
8. **Admin UI:** Update dashboard, upload, edit, learning graphs, analytics pages to respect domain scoping; add domain assignment field to user management page; hide users page from non-superadmin sidebar

### Backward Compatibility

- Existing JWTs without a `domains` field: treated as `domains: []`. All JWT parsing code defaults missing `domains` to empty array.
- Existing admins with empty `domains` arrays: cannot create/edit/view any content until a superadmin assigns domains. This is intentional — forces explicit domain assignment.
- Superadmins are unaffected — empty `domains` + `role === 'superadmin'` bypasses all domain checks.
- Public-facing routes and APIs are completely unaffected.

---

## Edge Cases

| Scenario                                           | Behaviour                                                                                                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin with empty `domains` array                   | Cannot create/edit/view any content. Must be assigned domains by superadmin.                                                                                                     |
| Admin tries to edit podcast outside their domains  | API returns 403. UI shows error toast.                                                                                                                                           |
| Superadmin changes an admin's domains              | Takes effect on next access token expiry (~15 minutes) when the refresh endpoint re-fetches from DB.                                                                             |
| Domain is deactivated in `Domain` table            | Existing content remains. Admins can no longer be assigned to it. Existing assignments persist but content access continues until domains are explicitly removed from the admin. |
| Podcast's domain doesn't match any active domain   | Read-only; no admin can edit unless they have that domain assigned or are superadmin.                                                                                            |
| Admin has domains but role is changed to public    | Domains become irrelevant — public users have no admin access regardless.                                                                                                        |
| JWT missing `domains` field (pre-migration tokens) | Treated as `domains: []`. Admin must re-login or wait for token refresh to get domains in JWT.                                                                                   |
| Domain name is renamed                             | Requires data migration of `UserRole.domains`, `Podcast.domain`, and `LearningGraph.domain`. Domain slugs are immutable.                                                         |

---

## Test Plan

### Unit Tests

- `assertDomainAccess()`: superadmin bypasses; admin with matching domain passes; admin without domain gets 403
- `buildDomainFilter()`: superadmin returns empty filter; admin returns `{ domain: { in: [...] } }`
- `getActiveDomains()`: returns cached domain names; handles empty table
- Updated `domainSchema`: validates against active domains from DB cache
- JWT payload serialization/deserialization with `domains` field
- `getAuthUser()` parsing of `x-user-domains` header

### Integration Tests

- `POST /api/podcasts`: domain admin can create podcast in their domain; rejected for other domains
- `PUT /api/podcasts/[id]`: domain admin can edit podcast in their domain; rejected for other domains
- `GET /api/podcasts?admin=true`: domain admin only sees podcasts in their domains
- `GET /api/podcasts` (public): all podcasts returned regardless of caller
- `PUT /api/admin/users/[id]/domains`: superadmin can assign; non-superadmin rejected; invalid domain names rejected
- `GET /api/auth/me`: returns correct domains for the authenticated user
- `POST /api/auth/refresh`: re-fetches domains from DB and issues new token
- Analytics API: domain admin sees only their domain's stats
- Learning graphs API: same pattern as podcasts

### E2E Tests

- Domain admin logs in, sees only their domain's content on dashboard
- Domain admin uploads a podcast — domain selector only shows assigned domains
- Domain admin cannot navigate to a podcast outside their domains
- Superadmin assigns domains to an admin via user management page
- Superadmin sees all content across all domains
