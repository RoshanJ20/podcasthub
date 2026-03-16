# Domain-Scoped Admin Permissions — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope admin permissions to specific domains so each admin can only manage content within their assigned domains, while superadmins retain full access.

**Architecture:** Add a `Domain` table as the source of truth for valid domains, a `domains` string array on `UserRole`, and domain info in JWTs. All admin API routes enforce domain access via `assertDomainAccess()` and `buildDomainFilter()` helpers. The admin UI filters content and selectors to the user's assigned domains.

**Tech Stack:** Next.js 16 (App Router), Prisma ORM, PostgreSQL, Zod, custom JWT (jsonwebtoken + jose), Vitest + RTL

**Spec:** `docs/superpowers/specs/2026-03-16-domain-scoped-admins-design.md`

---

## File Map

**New files:**

- `lib/domains.ts` — Domain cache (getActiveDomains, loadDomains, clearDomainCache)
- `prisma/seed.ts` — Seed script for Domain table
- `instrumentation.ts` — Next.js startup hook to load domain cache
- `app/api/domains/route.ts` — GET /api/domains (active domain list for UI)
- `app/api/admin/users/[id]/domains/route.ts` — PUT domain assignment (superadmin)
- `__tests__/unit/lib/domains.test.ts` — Domain cache tests
- `__tests__/unit/lib/auth/api-helpers.test.ts` — assertDomainAccess/buildDomainFilter tests
- `__tests__/integration/api/podcasts-domain-scoping.test.ts` — Podcast API scoping tests
- `__tests__/integration/api/learning-graphs-domain-scoping.test.ts` — Learning graph scoping tests
- `__tests__/integration/api/admin-domain-assignment.test.ts` — Domain assignment tests

**Modified files:**

- `prisma/schema.prisma` — Add Domain model, add domains[] to UserRole
- `lib/schemas/common.ts` — Remove static constants, use runtime domain validation
- `lib/auth/jwt.ts` — Add domains to JwtPayload
- `lib/auth/api-helpers.ts` — Add domains to getAuthUser, add assertDomainAccess/buildDomainFilter
- `middleware.ts` — Add domains to UserPayload, pass x-user-domains header
- `app/api/auth/login/route.ts` — Include domains in JWT
- `app/api/auth/register/route.ts` — Include domains in JWT
- `app/api/auth/refresh/route.ts` — Re-fetch domains from DB
- `app/api/auth/me/route.ts` — Return domains in response
- `app/api/podcasts/route.ts` — Admin domain filtering on GET, domain access check on POST
- `app/api/podcasts/[id]/route.ts` — Domain access check on PUT
- `app/api/podcasts/batch/route.ts` — Domain access check on PATCH
- `app/api/learning-graphs/route.ts` — Admin domain filtering on GET, domain access check on POST
- `app/api/learning-graphs/[id]/route.ts` — Domain access check on PUT, superadmin-only DELETE
- `app/api/admin/analytics/route.ts` — Domain-scoped aggregations
- `lib/navigation-config.ts` — Split Users link into superadminLinks
- `components/layout/unified-sidebar.tsx` — Conditionally show superadmin links
- `app/(admin)/layout.tsx` — Read real user data from JWT
- `app/(admin)/admin/page.tsx` — Domain-scoped podcast list
- `components/admin/wizard-step-details.tsx` — Accept domains prop instead of static constant
- `components/admin/podcast-upload-form.tsx` — Accept domains prop
- `components/library/library-filters.tsx` — Fetch domains from API instead of static constant
- `app/(public)/page.tsx` — Fetch domains from API
- `app/(public)/bulletins/page.tsx` — Fetch domains from API
- `app/(admin)/admin/learning-graphs/new/page.tsx` — Fetch domains from API
- `components/admin/users-table.tsx` — Add domain assignment multi-select
- `__tests__/unit/lib/schemas/common.test.ts` — Rewrite for new domainSchema
- Various test files — Add `domains: []` to mock JwtPayload objects

---

## Chunk 1: Database & Domain Validation Layer

### Task 1: Prisma Schema — Domain Table + UserRole.domains

**Files:**

- Modify: `prisma/schema.prisma:149-159` (UserRole model)
- Modify: `prisma/schema.prisma` (add Domain model after UserRole)

- [ ] **Step 1: Add Domain model to Prisma schema**

Add after the `UserRole` model (line 159) in `prisma/schema.prisma`:

```prisma
model Domain {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name      String   @unique
  slug      String   @unique
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  @@map("domains")
}
```

- [ ] **Step 2: Add domains array to UserRole model**

In `prisma/schema.prisma`, add `domains` field to the `UserRole` model (after line 152):

```prisma
  domains   String[] @default([])
```

- [ ] **Step 3: Generate and apply the migration**

Run:

```bash
npx prisma migrate dev --name add-domain-table-and-user-domains
```

Expected: Migration created and applied successfully. Prisma Client regenerated.

- [ ] **Step 4: Create seed script for domains**

Create `prisma/seed.ts`:

```typescript
/**
 * Database seed script for Podcast Hub v2.
 *
 * Seeds the Domain table with the initial set of knowledge domains.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Initial domain seed data. */
const SEED_DOMAINS = [
  { name: 'Audit Methodology', slug: 'audit-methodology' },
  { name: 'Accounting and Reporting', slug: 'accounting-and-reporting' },
  { name: 'Audit Technology', slug: 'audit-technology' },
  { name: 'Quality and Risk', slug: 'quality-and-risk' },
  { name: 'LEAP', slug: 'leap' },
  { name: 'Auditing', slug: 'auditing' },
] as const;

async function main(): Promise<void> {
  console.info('Seeding domains...');

  for (const domain of SEED_DOMAINS) {
    await prisma.domain.upsert({
      where: { slug: domain.slug },
      update: { name: domain.name },
      create: domain,
    });
  }

  console.info(`Seeded ${SEED_DOMAINS.length} domains.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 5: Add seed config to package.json**

Add to `package.json`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 6: Run seed**

Run: `npx prisma db seed`
Expected: "Seeded 6 domains."

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ prisma/seed.ts package.json
git commit -m "feat: add Domain table and UserRole.domains column"
```

---

### Task 2: Domain Cache + Startup Loading

**Files:**

- Create: `lib/domains.ts`
- Create: `instrumentation.ts`
- Test: `__tests__/unit/lib/domains.test.ts`

- [ ] **Step 1: Write failing tests for domain cache**

Create `__tests__/unit/lib/domains.test.ts`:

```typescript
/**
 * Unit tests for the domain cache module.
 *
 * Tests getActiveDomains(), loadDomains(), and cache invalidation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    domain: {
      findMany: vi.fn(),
    },
  },
}));

import { getActiveDomains, loadDomains, clearDomainCache } from '@/lib/domains';
import { prisma } from '@/lib/db';

const mockFindMany = vi.mocked(prisma.domain.findMany);

describe('domain cache', () => {
  beforeEach(() => {
    clearDomainCache();
    vi.clearAllMocks();
  });

  it('loadDomains fetches active domains from database', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: '1',
        name: 'LEAP',
        slug: 'leap',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Auditing',
        slug: 'auditing',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await loadDomains();

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { name: true },
    });
    expect(getActiveDomains()).toEqual(['LEAP', 'Auditing']);
  });

  it('getActiveDomains returns empty array before loadDomains is called', () => {
    expect(getActiveDomains()).toEqual([]);
  });

  it('clearDomainCache resets the cache', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: '1',
        name: 'LEAP',
        slug: 'leap',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await loadDomains();
    expect(getActiveDomains()).toHaveLength(1);

    clearDomainCache();
    expect(getActiveDomains()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/domains.test.ts`
Expected: FAIL — module `@/lib/domains` does not exist

- [ ] **Step 3: Implement lib/domains.ts**

Create `lib/domains.ts`:

```typescript
/**
 * Domain cache module for Podcast Hub v2.
 *
 * Loads active domain names from the Domain table and caches them
 * in-memory. Used by Zod schemas for runtime domain validation.
 *
 * Key responsibilities:
 * - Load active domains from DB on first use or explicit call
 * - Provide cached domain list for validation
 * - Allow cache clearing for testing and domain updates
 */
import { prisma } from '@/lib/db';

/** In-memory cache of active domain names. */
let cachedDomains: string[] = [];

/**
 * Returns the cached list of active domain names.
 *
 * Returns an empty array if loadDomains() has not been called yet.
 *
 * @returns Array of active domain name strings.
 */
export function getActiveDomains(): string[] {
  return cachedDomains;
}

/**
 * Loads active domains from the database into the in-memory cache.
 *
 * Should be called at application startup or when domains change.
 *
 * @returns The loaded domain names.
 */
export async function loadDomains(): Promise<string[]> {
  const domains = await prisma.domain.findMany({
    where: { isActive: true },
    select: { name: true },
  });
  cachedDomains = domains.map((d) => d.name);
  return cachedDomains;
}

/**
 * Clears the domain cache. Used in tests and after domain updates.
 */
export function clearDomainCache(): void {
  cachedDomains = [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/domains.test.ts`
Expected: PASS

- [ ] **Step 5: Create instrumentation.ts for startup loading**

Create `instrumentation.ts` at project root:

```typescript
/**
 * Next.js instrumentation hook for Podcast Hub v2.
 *
 * Runs once at server startup. Loads the domain cache from the database
 * so that Zod validation schemas have access to valid domain names.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { loadDomains } = await import('@/lib/domains');
    await loadDomains();
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/domains.ts instrumentation.ts __tests__/unit/lib/domains.test.ts
git commit -m "feat: add domain cache with startup loading via instrumentation hook"
```

---

### Task 3: Update lib/schemas/common.ts and All Importing Files

**Files:**

- Modify: `lib/schemas/common.ts:1-55`
- Modify: `__tests__/unit/lib/schemas/common.test.ts:1-86`
- Modify: `components/library/library-filters.tsx:19` (imports DOMAINS)
- Modify: `app/(public)/page.tsx:10` (imports DOMAINS)
- Modify: `app/(public)/bulletins/page.tsx:13` (imports DOMAINS)
- Modify: `components/admin/wizard-step-details.tsx:25` (imports PODCAST_DOMAINS)
- Modify: `components/admin/podcast-upload-form.tsx:32` (imports DOMAINS)
- Modify: `app/(admin)/admin/learning-graphs/new/page.tsx:23` (imports LEARNING_SERIES_DOMAINS)
- Modify: `__tests__/unit/components/admin/wizard-step-details.test.tsx` (imports PODCAST_DOMAINS)
- Modify: `__tests__/unit/components/admin/podcast-upload-form-indicators.test.tsx` (imports)

- [ ] **Step 1: Update lib/schemas/common.ts**

Replace the entire file:

```typescript
/**
 * Shared schema definitions for Podcast Hub v2.
 *
 * Contains the domain validation schema (backed by the Domain table)
 * and reusable pagination query parameter schemas.
 */
import { z } from 'zod';
import { getActiveDomains } from '@/lib/domains';

/**
 * Zod schema for validating domain values against active domains in the database.
 *
 * Uses a runtime refinement against the cached domain list loaded from
 * the Domain table. Falls back to accepting any non-empty string if
 * the cache has not been loaded (e.g., during static analysis or build).
 */
export const domainSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      const domains = getActiveDomains();
      if (domains.length === 0) return true;
      return domains.includes(value);
    },
    { message: 'Invalid domain' }
  );

/** TypeScript type for a valid domain value. */
export type Domain = string;

/**
 * Zod schema for pagination query parameters.
 *
 * - `page`: coerced to integer, minimum 1, defaults to 1
 * - `limit`: coerced to integer, minimum 1, maximum 100, defaults to 20
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Inferred type for pagination query parameters. */
export type PaginationParams = z.infer<typeof paginationSchema>;
```

- [ ] **Step 2: Rewrite `__tests__/unit/lib/schemas/common.test.ts`**

```typescript
/**
 * Unit tests for shared schema definitions.
 *
 * Tests the runtime domainSchema refinement and pagination schema.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { domainSchema, paginationSchema } from '@/lib/schemas/common';

vi.mock('@/lib/domains', () => ({
  getActiveDomains: vi.fn(() => ['LEAP', 'Auditing', 'Audit Methodology']),
}));

describe('common schemas', () => {
  describe('domainSchema', () => {
    it('accepts valid domain names from the cache', () => {
      expect(domainSchema.parse('LEAP')).toBe('LEAP');
      expect(domainSchema.parse('Auditing')).toBe('Auditing');
    });

    it('rejects invalid domain names', () => {
      expect(() => domainSchema.parse('Invalid Domain')).toThrow();
    });

    it('rejects empty strings', () => {
      expect(() => domainSchema.parse('')).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('applies default values', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('clamps limit to max 100', () => {
      expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
    });
  });
});
```

- [ ] **Step 3: Update public page imports — replace static constants with API fetches**

For **Server Components** (`app/(public)/page.tsx`, `app/(public)/bulletins/page.tsx`), replace the static import with a DB query:

```typescript
// Replace: import { DOMAINS } from '@/lib/schemas/common';
// With:
import { prisma } from '@/lib/db';
// Then fetch:
const domains = await prisma.domain.findMany({
  where: { isActive: true },
  orderBy: { name: 'asc' },
  select: { name: true },
});
const domainNames = domains.map((d) => d.name);
```

For **Client Components** (`components/library/library-filters.tsx`), accept domains as a prop from the parent Server Component, or fetch from `/api/domains`.

- [ ] **Step 4: Update admin component imports — accept domains as props**

For `components/admin/wizard-step-details.tsx` (line 25):

- Remove `import { PODCAST_DOMAINS } from '@/lib/schemas/common';`
- Add a `domains` prop to the component: `domains: string[]`
- Replace `PODCAST_DOMAINS.map(...)` with `domains.map(...)`
- The parent (upload page) will pass the user's allowed domains

For `components/admin/podcast-upload-form.tsx` (line 32):

- Same pattern: remove static import, accept `domains` prop

For `app/(admin)/admin/learning-graphs/new/page.tsx` (line 23):

- Remove `import { LEARNING_SERIES_DOMAINS } from '@/lib/schemas/common';`
- Fetch from DB: `const domains = await prisma.domain.findMany({ where: { isActive: true }, select: { name: true } });`

- [ ] **Step 5: Update affected test files**

For `__tests__/unit/components/admin/wizard-step-details.test.tsx`:

- Remove import of `PODCAST_DOMAINS`
- Pass `domains` prop to the component in tests with a mock list

For `__tests__/unit/components/admin/podcast-upload-form-indicators.test.tsx`:

- Same pattern

- [ ] **Step 6: Run full test suite for regressions**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add lib/schemas/common.ts __tests__/unit/lib/schemas/common.test.ts \
  components/admin/wizard-step-details.tsx components/admin/podcast-upload-form.tsx \
  components/library/library-filters.tsx app/(public)/page.tsx app/(public)/bulletins/page.tsx \
  app/(admin)/admin/learning-graphs/new/page.tsx \
  __tests__/unit/components/admin/wizard-step-details.test.tsx \
  __tests__/unit/components/admin/podcast-upload-form-indicators.test.tsx
git commit -m "feat: replace static domain constants with DB-backed runtime validation"
```

---

## Chunk 2: Auth Layer — JWT, Middleware, Helpers

### Task 4: Update JWT Payload to Include Domains

**Files:**

- Modify: `lib/auth/jwt.ts:13-17` (JwtPayload interface)
- Modify: `lib/auth/jwt.ts:60-71` (verifyAccessToken)
- Modify: `lib/auth/jwt.ts:80-91` (verifyRefreshToken)
- Test: `__tests__/unit/lib/auth/jwt.test.ts`

- [ ] **Step 1: Write failing test for domains in JWT**

Add to `__tests__/unit/lib/auth/jwt.test.ts` (inside the existing file, after existing describe blocks so it inherits the `beforeEach` that sets `process.env.JWT_ACCESS_SECRET`):

```typescript
import jwt from 'jsonwebtoken';

describe('JWT with domains', () => {
  it('signAccessToken includes domains in the token payload', () => {
    const payload = { userId: 'u1', email: 'a@b.com', role: 'admin', domains: ['LEAP'] };
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.domains).toEqual(['LEAP']);
  });

  it('verifyAccessToken defaults domains to empty array when missing', () => {
    const secret = process.env.JWT_ACCESS_SECRET!;
    const token = jwt.sign({ userId: 'u1', email: 'a@b.com', role: 'admin' }, secret, {
      expiresIn: '15m',
    });
    const decoded = verifyAccessToken(token);
    expect(decoded.domains).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/auth/jwt.test.ts`
Expected: FAIL — `domains` not in payload

- [ ] **Step 3: Update JwtPayload interface and verify functions**

In `lib/auth/jwt.ts`:

Update the interface (line 13-17):

```typescript
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  domains: string[];
}
```

Update `verifyAccessToken` return (line 66-70):

```typescript
return {
  userId: decoded.userId,
  email: decoded.email,
  role: decoded.role,
  domains: decoded.domains ?? [],
};
```

Update `verifyRefreshToken` return (line 86-90) the same way:

```typescript
return {
  userId: decoded.userId,
  email: decoded.email,
  role: decoded.role,
  domains: decoded.domains ?? [],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/auth/jwt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth/jwt.ts __tests__/unit/lib/auth/jwt.test.ts
git commit -m "feat: add domains field to JwtPayload with backward-compatible default"
```

---

### Task 5: Update Middleware to Pass Domains Header

**Files:**

- Modify: `middleware.ts:24-28` (UserPayload interface)
- Modify: `middleware.ts:33-44` (verifyToken)
- Modify: `middleware.ts:148-171` (addUserHeaders)

- [ ] **Step 1: Update UserPayload interface**

In `middleware.ts`, update the interface (line 24-28):

```typescript
interface UserPayload {
  userId: string;
  email: string;
  role: string;
  domains: string[];
}
```

- [ ] **Step 2: Update verifyToken to extract domains**

In `middleware.ts`, update `verifyToken` (line 33-44):

```typescript
async function verifyToken(token: string, secret: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      domains: (payload.domains as string[]) ?? [],
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Update addUserHeaders to set x-user-domains**

In `middleware.ts`, in the `addUserHeaders` function (after line 156), add:

```typescript
requestHeaders.set('x-user-domains', JSON.stringify(user.domains));
```

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: pass x-user-domains header through middleware"
```

---

### Task 6: Auth Helpers — assertDomainAccess, buildDomainFilter, getAuthUser

**Files:**

- Modify: `lib/auth/api-helpers.ts:28-47` (getAuthUser)
- Modify: `lib/auth/api-helpers.ts` (add new helpers)
- Test: `__tests__/unit/lib/auth/api-helpers.test.ts`

- [ ] **Step 1: Write failing tests for new auth helpers**

Create `__tests__/unit/lib/auth/api-helpers.test.ts`:

```typescript
/**
 * Unit tests for domain-scoped auth helpers.
 */
import { describe, it, expect } from 'vitest';
import { assertDomainAccess, buildDomainFilter } from '@/lib/auth/api-helpers';
import type { JwtPayload } from '@/lib/auth/jwt';
import { ApiError } from '@/lib/api/errors';

describe('assertDomainAccess', () => {
  it('superadmin bypasses domain check', () => {
    const user: JwtPayload = { userId: '1', email: 'a@b.com', role: 'superadmin', domains: [] };
    expect(() => assertDomainAccess(user, 'LEAP')).not.toThrow();
  });

  it('admin with matching domain passes', () => {
    const user: JwtPayload = {
      userId: '1',
      email: 'a@b.com',
      role: 'admin',
      domains: ['LEAP', 'Auditing'],
    };
    expect(() => assertDomainAccess(user, 'LEAP')).not.toThrow();
  });

  it('admin without matching domain throws 403', () => {
    const user: JwtPayload = { userId: '1', email: 'a@b.com', role: 'admin', domains: ['LEAP'] };
    expect(() => assertDomainAccess(user, 'Auditing')).toThrow(ApiError);
    try {
      assertDomainAccess(user, 'Auditing');
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
    }
  });

  it('admin with empty domains throws 403 for any domain', () => {
    const user: JwtPayload = { userId: '1', email: 'a@b.com', role: 'admin', domains: [] };
    expect(() => assertDomainAccess(user, 'LEAP')).toThrow(ApiError);
  });
});

describe('buildDomainFilter', () => {
  it('superadmin gets empty filter', () => {
    const user: JwtPayload = { userId: '1', email: 'a@b.com', role: 'superadmin', domains: [] };
    expect(buildDomainFilter(user)).toEqual({});
  });

  it('admin gets domain IN filter', () => {
    const user: JwtPayload = {
      userId: '1',
      email: 'a@b.com',
      role: 'admin',
      domains: ['LEAP', 'Auditing'],
    };
    expect(buildDomainFilter(user)).toEqual({ domain: { in: ['LEAP', 'Auditing'] } });
  });

  it('admin with empty domains gets empty IN filter', () => {
    const user: JwtPayload = { userId: '1', email: 'a@b.com', role: 'admin', domains: [] };
    expect(buildDomainFilter(user)).toEqual({ domain: { in: [] } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/auth/api-helpers.test.ts`
Expected: FAIL — `assertDomainAccess` and `buildDomainFilter` do not exist

- [ ] **Step 3: Implement helpers and update getAuthUser**

Replace the full contents of `lib/auth/api-helpers.ts`:

```typescript
/**
 * API route authentication helpers for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Extracts and verifies JWT from request cookies or headers
 * - Provides role-based authorization checks for API routes
 * - Provides domain-scoped access control for admin routes
 *
 * @example
 * import { requireAuth, requireRole, assertDomainAccess } from '@/lib/auth/api-helpers';
 *
 * export async function POST(request: NextRequest) {
 *   const user = requireAuth(request);
 *   requireRole(user, ['admin', 'superadmin']);
 *   assertDomainAccess(user, body.domain);
 * }
 */
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import type { JwtPayload } from '@/lib/auth/jwt';
import { ApiError, ErrorCode } from '@/lib/api/errors';

/**
 * Extracts and verifies the JWT from request cookies or x-user headers.
 *
 * @param request - The incoming Next.js request
 * @returns The decoded JWT payload, or null if not authenticated
 */
export function getAuthUser(request: NextRequest): JwtPayload | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');
  const domainsHeader = request.headers.get('x-user-domains');

  if (userId && email && role) {
    let domains: string[] = [];
    if (domainsHeader) {
      try {
        domains = JSON.parse(domainsHeader);
      } catch {
        domains = [];
      }
    }
    return { userId, email, role, domains };
  }

  const token = request.cookies.get('access_token')?.value;
  if (!token) return null;

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Requires authentication. Throws ApiError(401) if not authenticated.
 *
 * @param request - The incoming Next.js request
 * @returns The decoded JWT payload
 * @throws ApiError with status 401 if not authenticated
 */
export function requireAuth(request: NextRequest): JwtPayload {
  const user = getAuthUser(request);
  if (!user) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
  }
  return user;
}

/**
 * Requires specific role(s). Throws ApiError(403) if role doesn't match.
 *
 * @param user - The authenticated user's JWT payload
 * @param allowedRoles - Array of role strings that are permitted
 * @throws ApiError with status 403 if user's role is not in allowedRoles
 */
export function requireRole(user: JwtPayload, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
  }
}

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
export function assertDomainAccess(user: JwtPayload, domain: string): void {
  if (user.role === 'superadmin') return;
  if (!user.domains.includes(domain)) {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'You do not have access to this domain');
  }
}

/**
 * Returns a Prisma where clause that filters by the user's assigned domains.
 * Superadmins get no filter (access to all domains).
 *
 * @param user - The authenticated user's JWT payload
 * @returns Prisma where clause for domain filtering
 */
export function buildDomainFilter(user: JwtPayload): { domain?: { in: string[] } } {
  if (user.role === 'superadmin') return {};
  return { domain: { in: user.domains } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/lib/auth/api-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Fix any existing tests that reference JwtPayload without domains**

Search all test files for mock JwtPayload objects and add `domains: []`:

Run: `grep -rn "userId.*email.*role" --include="*.test.ts" --include="*.test.tsx" __tests__/`

For each match that constructs a JwtPayload-like object, add `domains: []`.

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add lib/auth/api-helpers.ts __tests__/unit/lib/auth/api-helpers.test.ts
git commit -m "feat: add assertDomainAccess and buildDomainFilter helpers"
```

---

### Task 7: Update Login, Register, Refresh, Me Routes

**Files:**

- Modify: `app/api/auth/login/route.ts:75-96`
- Modify: `app/api/auth/register/route.ts:82-106`
- Modify: `app/api/auth/refresh/route.ts:64-85`
- Modify: `app/api/auth/me/route.ts:40-49`

**Note:** These are straightforward field additions (`domains: user.role?.domains ?? []`). TDD is deferred to the integration tests in Chunk 3 which cover the full auth flow including domains.

- [ ] **Step 1: Update login route**

In `app/api/auth/login/route.ts`, update jwtPayload (line 78-82) to include domains:

```typescript
const jwtPayload = {
  userId: user.id,
  email: user.email,
  role: userRole,
  domains: user.role?.domains ?? [],
};
```

Also update the response body (line 88-96) to include domains:

```typescript
        role: userRole,
        domains: user.role?.domains ?? [],
        createdAt: user.createdAt,
```

- [ ] **Step 2: Update register route**

In `app/api/auth/register/route.ts`, same pattern — add `domains: user.role?.domains ?? []` to jwtPayload (line 85-89) and response body (line 95-106).

- [ ] **Step 3: Update refresh route**

In `app/api/auth/refresh/route.ts`, update jwtPayload (line 67-71):

```typescript
const jwtPayload = {
  userId: user.id,
  email: user.email,
  role: userRole,
  domains: user.role?.domains ?? [],
};
```

Update response body (line 77-85):

```typescript
        role: userRole,
        domains: user.role?.domains ?? [],
        createdAt: user.createdAt,
```

- [ ] **Step 4: Update /api/auth/me**

In `app/api/auth/me/route.ts`, update response (line 43-48):

```typescript
return NextResponse.json({
  user: {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    domains: payload.domains,
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/login/route.ts app/api/auth/register/route.ts \
  app/api/auth/refresh/route.ts app/api/auth/me/route.ts
git commit -m "feat: include domains in JWT and auth responses"
```

---

## Chunk 3: API Route Domain Scoping

### Task 8: Scope Podcast API Routes

**Files:**

- Modify: `app/api/podcasts/route.ts:28-94` (GET)
- Modify: `app/api/podcasts/route.ts:105-129` (POST)
- Modify: `app/api/podcasts/[id]/route.ts:63-89` (PUT)
- Test: `__tests__/integration/api/podcasts-domain-scoping.test.ts`

- [ ] **Step 1: Write failing integration tests**

Create `__tests__/integration/api/podcasts-domain-scoping.test.ts`:

```typescript
/**
 * Integration tests for podcast API domain scoping.
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/podcasts/route';

vi.mock('@/lib/db', () => ({
  prisma: {
    podcast: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: '1', domain: 'LEAP' }),
    },
  },
}));

vi.mock('@/lib/domains', () => ({
  getActiveDomains: () => ['LEAP', 'Auditing', 'Audit Methodology'],
}));

import { prisma } from '@/lib/db';

function createRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): NextRequest {
  const { method = 'GET', url = 'http://localhost/api/podcasts', headers = {}, body } = options;
  return new NextRequest(url, {
    method,
    headers: new Headers(headers),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe('GET /api/podcasts — admin domain scoping', () => {
  it('admin with admin=true gets domain-filtered results', async () => {
    const req = createRequest({
      url: 'http://localhost/api/podcasts?admin=true',
      headers: {
        'x-user-id': 'u1',
        'x-user-email': 'a@b.com',
        'x-user-role': 'admin',
        'x-user-domains': JSON.stringify(['LEAP']),
      },
    });

    await GET(req);

    // Verify Prisma was called with domain filter
    expect(vi.mocked(prisma.podcast.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          domain: { in: ['LEAP'] },
        }),
      })
    );
  });

  it('public GET without admin=true returns unfiltered results', async () => {
    const req = createRequest({
      url: 'http://localhost/api/podcasts',
    });

    await GET(req);

    expect(vi.mocked(prisma.podcast.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          domain: expect.anything(),
        }),
      })
    );
  });
});

describe('POST /api/podcasts — domain access check', () => {
  it('admin can create podcast in their domain', async () => {
    const req = createRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'u1',
        'x-user-email': 'a@b.com',
        'x-user-role': 'admin',
        'x-user-domains': JSON.stringify(['LEAP']),
        'content-type': 'application/json',
      },
      body: {
        title: 'Test',
        description: 'Test desc',
        domain: 'LEAP',
        year: 2025,
        thumbnailUrl: 'thumb.jpg',
        audioShortUrl: 'audio.mp3',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('admin cannot create podcast outside their domain', async () => {
    const req = createRequest({
      method: 'POST',
      headers: {
        'x-user-id': 'u1',
        'x-user-email': 'a@b.com',
        'x-user-role': 'admin',
        'x-user-domains': JSON.stringify(['LEAP']),
        'content-type': 'application/json',
      },
      body: {
        title: 'Test',
        description: 'Test desc',
        domain: 'Auditing',
        year: 2025,
        thumbnailUrl: 'thumb.jpg',
        audioShortUrl: 'audio.mp3',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/integration/api/podcasts-domain-scoping.test.ts`
Expected: FAIL

- [ ] **Step 3: Update GET /api/podcasts — admin domain filtering**

In `app/api/podcasts/route.ts`, add import:

```typescript
import {
  getAuthUser,
  requireAuth,
  requireRole,
  assertDomainAccess,
  buildDomainFilter,
} from '@/lib/auth/api-helpers';
```

In the GET handler, after the existing domain filter block (line 37-40), add admin scoping. **Important:** When `admin=true` is set, the `buildDomainFilter` result takes precedence over any explicit `?domain=` query param for domain admins:

```typescript
// Apply domain scoping for admin requests
const adminMode = url.searchParams.get('admin') === 'true';
if (adminMode) {
  const user = getAuthUser(request);
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    const domainFilter = buildDomainFilter(user);
    if (domainFilter.domain) {
      // Domain admin: override any explicit domain query param with scoped filter
      where.domain = domainFilter.domain;
    }
  }
}
```

- [ ] **Step 4: Update POST /api/podcasts — domain access check**

In the POST handler, add domain access check after validation success:

```typescript
assertDomainAccess(user, result.data.domain);
```

- [ ] **Step 5: Update PUT /api/podcasts/[id] — domain access check on existing AND new domain**

In `app/api/podcasts/[id]/route.ts`, add import:

```typescript
import { requireAuth, requireRole, assertDomainAccess } from '@/lib/auth/api-helpers';
```

In the PUT handler, fetch existing podcast first and check both current and new domain:

```typescript
const user = requireAuth(request);
requireRole(user, ['admin', 'superadmin']);

const { id } = await context.params;

// Check domain access on existing podcast
const existing = await prisma.podcast.findUnique({ where: { id }, select: { domain: true } });
if (!existing) {
  return createErrorResponse(notFound('Podcast'));
}
assertDomainAccess(user, existing.domain);

const body = await request.json();
const result = updatePodcastSchema.safeParse(body);

if (!result.success) {
  return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
}

// If domain is being changed, check access to the new domain too
if (result.data.domain && result.data.domain !== existing.domain) {
  assertDomainAccess(user, result.data.domain);
}

const podcast = await prisma.podcast.update({
  where: { id },
  data: result.data as any,
});
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run __tests__/integration/api/podcasts-domain-scoping.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/api/podcasts/route.ts app/api/podcasts/[id]/route.ts \
  __tests__/integration/api/podcasts-domain-scoping.test.ts
git commit -m "feat: add domain scoping to podcast API routes"
```

---

### Task 9: Scope Podcast Batch Route

**Files:**

- Modify: `app/api/podcasts/batch/route.ts:23-51`

- [ ] **Step 1: Add domain check to batch sort order**

In `app/api/podcasts/batch/route.ts`, add import:

```typescript
import { requireAuth, requireRole, assertDomainAccess } from '@/lib/auth/api-helpers';
```

After validation, fetch all podcasts in the batch and check domain access:

```typescript
const user = requireAuth(request);
requireRole(user, ['admin', 'superadmin']);

// ... existing validation ...

// Verify domain access for all podcasts in the batch
if (user.role !== 'superadmin') {
  const podcastIds = result.data.map((item) => item.id);
  const podcasts = await prisma.podcast.findMany({
    where: { id: { in: podcastIds } },
    select: { id: true, domain: true },
  });
  for (const podcast of podcasts) {
    assertDomainAccess(user, podcast.domain);
  }
}

// ... existing transaction ...
```

- [ ] **Step 2: Commit**

```bash
git add app/api/podcasts/batch/route.ts
git commit -m "feat: add domain scoping to podcast batch sort order"
```

---

### Task 10: Scope Learning Graph API Routes

**Files:**

- Modify: `app/api/learning-graphs/route.ts:26-57` (GET)
- Modify: `app/api/learning-graphs/route.ts:68-95` (POST)
- Modify: `app/api/learning-graphs/[id]/route.ts:59-86` (PUT)
- Modify: `app/api/learning-graphs/[id]/route.ts:97-116` (DELETE)
- Test: `__tests__/integration/api/learning-graphs-domain-scoping.test.ts`

- [ ] **Step 1: Write failing tests for learning graph domain scoping**

Create `__tests__/integration/api/learning-graphs-domain-scoping.test.ts` with the same pattern as the podcast tests — test admin GET filtering, POST domain check, and public GET unfiltered.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/integration/api/learning-graphs-domain-scoping.test.ts`

- [ ] **Step 3: Update GET /api/learning-graphs for admin domain filtering**

Same pattern as podcasts: add admin mode domain filter using `buildDomainFilter(user)`.

```typescript
const adminMode = url.searchParams.get('admin') === 'true';
if (adminMode) {
  const user = getAuthUser(request);
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    const domainFilter = buildDomainFilter(user);
    if (domainFilter.domain) {
      where.domain = domainFilter.domain;
    }
  }
}
```

- [ ] **Step 4: Update POST to check domain access**

After validation succeeds, add:

```typescript
assertDomainAccess(user, result.data.domain);
```

- [ ] **Step 5: Update PUT — check domain access on existing AND new domain**

Same pattern as podcast PUT: fetch existing, check current domain, check new domain if changed.

- [ ] **Step 6: Update DELETE to superadmin-only**

Change `requireRole` to:

```typescript
requireRole(user, ['superadmin']);
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run __tests__/integration/api/learning-graphs-domain-scoping.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/api/learning-graphs/route.ts app/api/learning-graphs/[id]/route.ts \
  __tests__/integration/api/learning-graphs-domain-scoping.test.ts
git commit -m "feat: add domain scoping to learning graph API routes"
```

---

### Task 11: Scope Analytics API Route

**Files:**

- Modify: `app/api/admin/analytics/route.ts:14-138`

- [ ] **Step 1: Add domain scoping to analytics queries**

In `app/api/admin/analytics/route.ts`, update imports:

```typescript
import { requireAuth, requireRole, buildDomainFilter } from '@/lib/auth/api-helpers';
```

After `requireRole`, build domain filter:

```typescript
const domainFilter = buildDomainFilter(user);
```

Update podcast count (line 46-48):

```typescript
        prisma.podcast.count({
          where: { isArchived: false, ...dateFilter, ...domainFilter },
        }),
```

Update learning graph count (line 51-53):

```typescript
        prisma.learningGraph.count({
          where: { isPublished: true, ...dateFilter, ...domainFilter },
        }),
```

Update listen activities query (line 56-63) — filter through podcast relation:

```typescript
        prisma.userActivity.findMany({
          where: {
            ...activityDateFilter,
            ...(domainFilter.domain ? { podcast: { domain: domainFilter.domain } } : {}),
          },
          select: {
            podcast: { select: { domain: true } },
          },
        }),
```

Update monthly trends query (line 66-71) — same podcast relation filter:

```typescript
        prisma.userActivity.findMany({
          where: {
            ...activityDateFilter,
            ...(domainFilter.domain ? { podcast: { domain: domainFilter.domain } } : {}),
          },
          select: { createdAt: true },
        }),
```

Update top topics query (line 74-83) — same pattern:

```typescript
        prisma.userActivity.groupBy({
          by: ['podcastId'],
          where: {
            ...activityDateFilter,
            podcastId: { not: null },
            ...(domainFilter.domain ? { podcast: { domain: domainFilter.domain } } : {}),
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/analytics/route.ts
git commit -m "feat: scope analytics to admin's assigned domains"
```

---

### Task 12: Domain Assignment API + Domains List API

**Files:**

- Create: `app/api/admin/users/[id]/domains/route.ts`
- Create: `app/api/domains/route.ts`
- Test: `__tests__/integration/api/admin-domain-assignment.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/integration/api/admin-domain-assignment.test.ts`:

```typescript
/**
 * Integration tests for domain assignment API.
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/admin/users/[id]/domains/route';

vi.mock('@/lib/db', () => ({
  prisma: {
    domain: {
      findMany: vi.fn().mockResolvedValue([
        { name: 'LEAP', isActive: true },
        { name: 'Auditing', isActive: true },
      ]),
    },
    userRole: {
      update: vi.fn().mockResolvedValue({ id: '1', role: 'admin', domains: ['LEAP'] }),
    },
  },
}));

function createRequest(body: unknown, role: string): NextRequest {
  return new NextRequest('http://localhost/api/admin/users/u1/domains', {
    method: 'PUT',
    headers: new Headers({
      'x-user-id': 'superadmin1',
      'x-user-email': 'sa@b.com',
      'x-user-role': role,
      'x-user-domains': '[]',
      'content-type': 'application/json',
    }),
    body: JSON.stringify(body),
  });
}

describe('PUT /api/admin/users/[id]/domains', () => {
  it('superadmin can assign domains', async () => {
    const req = createRequest({ domains: ['LEAP'] }, 'superadmin');
    const res = await PUT(req, { params: Promise.resolve({ id: 'u1' }) });
    expect(res.status).toBe(200);
  });

  it('non-superadmin gets 403', async () => {
    const req = createRequest({ domains: ['LEAP'] }, 'admin');
    const res = await PUT(req, { params: Promise.resolve({ id: 'u1' }) });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/integration/api/admin-domain-assignment.test.ts`

- [ ] **Step 3: Create domain assignment route**

Create `app/api/admin/users/[id]/domains/route.ts`:

```typescript
/**
 * Domain assignment API for admin users.
 *
 * @route PUT /api/admin/users/[id]/domains — Assign domains to a user (superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import { ApiError, createErrorResponse, badRequest, internalError } from '@/lib/api/errors';

/** Route context providing the user ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/** Validation schema for domain assignment request body. */
const assignDomainsSchema = z.object({
  domains: z.array(z.string().min(1)),
});

/**
 * Assigns domains to a user's role.
 *
 * Superadmin-only. Validates that all domain names exist in the
 * Domain table as active domains before updating.
 *
 * @param request - The incoming PUT request with domains array in body.
 * @param context - Route context containing the target user ID.
 * @returns JSON response with updated user role, or error response.
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['superadmin']);

    const { id } = await context.params;
    const body = await request.json();
    const result = assignDomainsSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const { domains } = result.data;

    // Validate all domains exist and are active
    if (domains.length > 0) {
      const activeDomains = await prisma.domain.findMany({
        where: { isActive: true },
        select: { name: true },
      });
      const activeDomainNames = new Set(activeDomains.map((d) => d.name));
      const invalidDomains = domains.filter((d) => !activeDomainNames.has(d));

      if (invalidDomains.length > 0) {
        return createErrorResponse(
          badRequest(`Invalid or inactive domains: ${invalidDomains.join(', ')}`)
        );
      }
    }

    // Update the user's domains — Prisma throws P2025 if record not found
    try {
      const updated = await prisma.userRole.update({
        where: { userId: id },
        data: { domains },
      });
      return NextResponse.json({ data: updated });
    } catch {
      return createErrorResponse(badRequest('User role not found'));
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
```

- [ ] **Step 4: Create GET /api/domains route**

Create `app/api/domains/route.ts`:

```typescript
/**
 * Domains API route for retrieving active domains.
 *
 * @route GET /api/domains — Returns list of active domains
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createErrorResponse, internalError } from '@/lib/api/errors';

/**
 * Returns all active domains from the database.
 *
 * Used by admin UI components to populate domain selectors
 * and public pages for filter dropdowns.
 *
 * @returns JSON response with array of active domains.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ data: domains });
  } catch {
    return createErrorResponse(internalError());
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run __tests__/integration/api/admin-domain-assignment.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/users/[id]/domains/route.ts app/api/domains/route.ts \
  __tests__/integration/api/admin-domain-assignment.test.ts
git commit -m "feat: add domain assignment and domain list API endpoints"
```

---

## Chunk 4: Admin UI Scoping

### Task 13: Update Admin Layout + Sidebar

**Files:**

- Modify: `app/(admin)/layout.tsx:11-27`
- Modify: `lib/navigation-config.ts:59-65`
- Modify: `components/layout/unified-sidebar.tsx:176-191`

- [ ] **Step 1: Update admin layout to read real user data from JWT**

Replace `app/(admin)/layout.tsx`:

```typescript
/**
 * Admin layout providing the unified sidebar and main content area.
 *
 * Reads user data from JWT cookie to pass to sidebar components.
 */
import { cookies } from 'next/headers';
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { PageTransition } from '@/components/layout/page-transition';
import { verifyAccessToken } from '@/lib/auth/jwt';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  let userName = 'Admin';
  let userRole = 'admin';

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      userName = payload.email;
      userRole = payload.role;
    } catch {
      // Token invalid — middleware should redirect
    }
  }

  return (
    <div className="flex min-h-screen">
      <UnifiedSidebar userName={userName} userRole={userRole} isAdmin />
      <div className="flex flex-1 flex-col">
        <MobileTopBar userName={userName} userRole={userRole} isAdmin />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Split admin links — move Users to superadminLinks**

In `lib/navigation-config.ts`, split the Users link out:

```typescript
/** Admin navigation links visible to all admins. */
export const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/upload', label: 'Upload', icon: Upload },
  { href: '/admin/learning-graphs', label: 'Learning Paths', icon: Route },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

/** Admin navigation links visible only to superadmins. */
export const superadminLinks: NavLink[] = [{ href: '/admin/users', label: 'Users', icon: Users }];
```

- [ ] **Step 3: Update sidebar to conditionally render superadmin links**

In `components/layout/unified-sidebar.tsx`, import `superadminLinks`:

```typescript
import {
  mainLinks,
  personalLinks,
  adminLinks,
  superadminLinks,
  isRouteActive,
} from '@/lib/navigation-config';
```

Update the admin section rendering (line 176-191):

```typescript
        {isAdmin && (
          <>
            <div className="my-1" />
            <SectionLabel label="Admin" collapsed={collapsed} />
            {adminLinks.map((link) => (
              <SidebarNavItem
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                isActive={isRouteActive(link.href, pathname)}
                collapsed={collapsed}
              />
            ))}
            {userRole.toLowerCase() === 'superadmin' &&
              superadminLinks.map((link) => (
                <SidebarNavItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  isActive={isRouteActive(link.href, pathname)}
                  collapsed={collapsed}
                />
              ))}
          </>
        )}
```

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/layout.tsx lib/navigation-config.ts components/layout/unified-sidebar.tsx
git commit -m "feat: read real user data in admin layout, hide Users from non-superadmin sidebar"
```

---

### Task 14: Scope Admin Dashboard

**Files:**

- Modify: `app/(admin)/admin/page.tsx:17-68`

- [ ] **Step 1: Update dashboard to domain-scope podcast list**

In `app/(admin)/admin/page.tsx`, add JWT import and domain filtering:

```typescript
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
```

Update the data fetch:

```typescript
export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  let userDomains: string[] = [];
  let userRole = 'admin';

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      userDomains = payload.domains;
      userRole = payload.role;
    } catch {
      // Token invalid — middleware should have caught this
    }
  }

  const domainFilter = userRole === 'superadmin' ? {} : { domain: { in: userDomains } };

  const podcasts = await prisma.podcast.findMany({
    where: { ...domainFilter },
    orderBy: { sortOrder: 'asc' },
  });
  // ... rest of serialization unchanged
```

- [ ] **Step 2: Update the AdminDashboardClient domain filter dropdown**

Find where the domain filter dropdown is rendered in the `AdminDashboardClient` component. Pass the user's domains to it so it only shows their assigned domains (or all domains for superadmin). The component likely needs a `userDomains` and `userRole` prop.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/admin/page.tsx components/admin/admin-dashboard-client.tsx
git commit -m "feat: scope admin dashboard to user's assigned domains"
```

---

### Task 15: Scope Upload + Edit Pages

**Files:**

- Modify: `app/(admin)/admin/upload/page.tsx`
- Modify: `components/admin/wizard-step-details.tsx` (domain selector)
- Modify: `app/(admin)/admin/edit/[id]/page.tsx`

- [ ] **Step 1: Update upload page to pass user's domains to form**

In `app/(admin)/admin/upload/page.tsx`, read user's domains from JWT and pass to the upload wizard:

```typescript
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db';

// If superadmin, fetch all active domains from DB
// If domain admin, use their assigned domains
const cookieStore = await cookies();
const token = cookieStore.get('access_token')?.value;
let availableDomains: string[] = [];

if (token) {
  try {
    const payload = verifyAccessToken(token);
    if (payload.role === 'superadmin') {
      const domains = await prisma.domain.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: 'asc' },
      });
      availableDomains = domains.map((d) => d.name);
    } else {
      availableDomains = payload.domains;
    }
  } catch {}
}
// Pass availableDomains to the wizard component
```

- [ ] **Step 2: Update wizard-step-details to accept domains prop**

In `components/admin/wizard-step-details.tsx`:

- Remove `import { PODCAST_DOMAINS } from '@/lib/schemas/common';`
- Add `domains: string[]` to the component props
- Replace `PODCAST_DOMAINS.map(...)` with `domains.map(...)`

- [ ] **Step 3: Update edit page — handle 403 from API**

In `app/(admin)/admin/edit/[id]/page.tsx`, if the podcast's domain is outside the admin's domains, the API will return 403. Add client-side handling:

- On 403 response, redirect to `/admin` with an error toast
- Use `redirect()` from `next/navigation` or `router.push('/admin')` with a toast

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/admin/upload/page.tsx components/admin/wizard-step-details.tsx \
  app/(admin)/admin/edit/[id]/page.tsx
git commit -m "feat: scope upload/edit pages to user's assigned domains"
```

---

### Task 16: Scope Learning Graphs + Analytics Admin Pages

**Files:**

- Modify: `app/(admin)/admin/learning-graphs/page.tsx`
- Modify: `app/(admin)/admin/learning-graphs/[id]/page.tsx`
- Modify: `app/(admin)/admin/learning-graphs/new/page.tsx`
- Modify: `app/(admin)/admin/analytics/page.tsx` (or the analytics client component)

- [ ] **Step 1: Scope learning graphs list page**

The learning graphs list page should fetch via the API with `admin=true` so the server-side domain filtering applies. If it currently fetches from Prisma directly, update to use the scoped API or add the same JWT-based domain filter pattern used in the dashboard.

- [ ] **Step 2: Scope learning graphs new/edit form domain selector**

In `app/(admin)/admin/learning-graphs/new/page.tsx`:

- Replace `import { LEARNING_SERIES_DOMAINS }` with a DB query or user's domains
- Superadmin sees all domains; domain admin sees their assigned domains

- [ ] **Step 3: Scope analytics page**

The analytics page likely fetches from `/api/admin/analytics`. Since that API is already domain-scoped (Task 11), the analytics page itself should work without changes. However:

- If there's a domain filter dropdown in the analytics UI, update it to only show the admin's assigned domains
- For single-domain admins, hide the dropdown entirely

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/admin/learning-graphs/ app/(admin)/admin/analytics/
git commit -m "feat: scope learning graphs and analytics admin pages to user's domains"
```

---

### Task 17: Add Domain Assignment to Users Page

**Files:**

- Modify: `components/admin/users-table.tsx`

- [ ] **Step 1: Read the current UsersTable component**

Run: `cat components/admin/users-table.tsx`

Understand the current structure (columns, data fetching, rendering).

- [ ] **Step 2: Add domain multi-select to each user row**

1. Fetch active domains from `GET /api/domains` on component mount
2. For each user row, display their current domains as badges
3. Add a multi-select dropdown (using shadcn Popover + Checkbox pattern) that lets the superadmin assign/remove domains
4. On change, call `PUT /api/admin/users/[userId]/domains` with the selected domains
5. Show success/error toast via Sonner

- [ ] **Step 3: Commit**

```bash
git add components/admin/users-table.tsx
git commit -m "feat: add domain assignment multi-select to user management page"
```

---

## Chunk 5: Final Integration & Verification

### Task 18: Fix All Test Regressions

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`

- [ ] **Step 2: Fix any failing tests**

Most failures will be:

- Tests that create mock `JwtPayload` objects without `domains` — add `domains: []`
- Tests that import removed constants — update imports
- Tests for components that now require a `domains` prop — pass mock domains

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: update tests for domain-scoped admin changes"
```

---

### Task 19: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npx eslint .`
Expected: No errors

- [ ] **Step 4: Build the application**

Run: `npx next build`
Expected: Build succeeds
