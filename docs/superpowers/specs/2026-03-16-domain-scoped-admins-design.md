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

---

## Data Model

### New: `Domain` Table

```prisma
model Domain {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name      String   @unique          // e.g., "LEAP", "Audit Methodology"
  slug      String   @unique          // e.g., "leap", "audit-methodology"
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

`Podcast.domain` and `LearningGraph.domain` remain as plain string columns. They are validated against the `Domain` table at the application level via Zod schemas.

---

## Auth & JWT Changes

### JWT Payload

```typescript
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  domains: string[]; // Empty for superadmin and public users
}
```

### Middleware

- Extract `domains` from the JWT and set `x-user-domains` header (JSON-stringified array) on the request
- No additional DB lookups required

### Token Refresh

- When the access token is refreshed via the refresh token cycle (every 15 minutes), re-fetch `UserRole.domains` from the database
- This ensures domain assignment changes by a superadmin propagate without requiring the admin to re-login
- The refresh token endpoint queries `UserRole` to build the new JWT payload

### Auth Helpers

New helper in `lib/auth/api-helpers.ts`:

```typescript
/**
 * Asserts the authenticated user has access to the specified domain.
 *
 * Superadmins bypass this check. Domain admins must have the domain
 * in their assigned domains array.
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

Updated `getAuthUser()` to parse and return `domains` from `x-user-domains` header.

---

## API Scoping

### General Pattern

Every admin write operation calls `assertDomainAccess(user, domain)`. Every admin list operation filters by `domain IN user.domains` (superadmins skip the filter).

### Podcasts (`/api/podcasts`)

| Method        | Scoping                                            |
| ------------- | -------------------------------------------------- |
| `POST`        | Validate podcast's domain is in `user.domains`     |
| `PUT`         | Validate the podcast's domain is in `user.domains` |
| `GET` (admin) | Filter `WHERE domain IN user.domains`              |
| `DELETE`      | Superadmin-only (unchanged)                        |

### Learning Graphs (`/api/learning-graphs`)

| Method        | Scoping                               |
| ------------- | ------------------------------------- |
| `POST`        | Validate domain is in `user.domains`  |
| `PUT`         | Validate domain is in `user.domains`  |
| `GET` (admin) | Filter `WHERE domain IN user.domains` |
| `DELETE`      | Superadmin-only                       |

### Analytics (`/api/admin/analytics`)

- All aggregations (listens by domain, monthly trends, top topics) filtered to the admin's assigned domains
- Superadmin sees all domains as before

### Sort Order (`/api/podcasts/sort-order`)

- Batch update validates every podcast ID in the batch belongs to a domain the admin has access to

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

### How the UI Gets Domain Info

- Client-side: decode the JWT or call `GET /api/auth/me` which returns user info including `domains`
- Used to conditionally render domain selectors, filter options, and sidebar items

---

## Validation Changes

### Zod Schemas

- `domainSchema` continues to validate against the known domain enum for backwards compatibility
- New `userDomainsSchema` validates an array of domain strings against active domains in the `Domain` table (async validation at the API level)
- `createPodcastSchema` and `updatePodcastSchema` unchanged — domain validation is still at the Zod level, access control is at the API level

### Domain Table as Source of Truth

- The `DOMAINS` constant in `lib/schemas/common.ts` is retained for Zod enum validation (static, compile-time)
- The `Domain` table is the runtime source of truth for domain management and assignment
- When new domains are added via migration, both the constant and the table must be updated

---

## Migration Strategy

1. Create `Domain` table with seed data (6 existing domains)
2. Add `domains` column (text array, default empty) to `user_roles` table
3. Update JWT signing/verification to include `domains`
4. Update middleware to pass `x-user-domains` header
5. Update all admin API routes with domain scoping
6. Update admin UI components to respect domain scoping
7. Add domain assignment UI to user management page

**Backwards compatibility:** Existing admins with empty `domains` arrays are treated as having no domain access (they need a superadmin to assign domains). Superadmins are unaffected. This is intentional — forces explicit domain assignment.

---

## Edge Cases

| Scenario                                          | Behaviour                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Admin with empty `domains` array                  | Cannot create/edit/view any content. Must be assigned domains by superadmin.                                                           |
| Admin tries to edit podcast outside their domains | API returns 403. UI shows error toast.                                                                                                 |
| Superadmin changes an admin's domains             | Takes effect within 15 minutes (next token refresh).                                                                                   |
| Domain is deactivated in `Domain` table           | Existing content remains. Admins can no longer be assigned to it. Existing assignments persist but validation rejects new assignments. |
| Podcast's domain doesn't match any active domain  | Read-only; no admin can edit unless they have that domain assigned or are superadmin.                                                  |
| Admin has domains but role is changed to public   | Domains become irrelevant — public users have no admin access regardless.                                                              |
