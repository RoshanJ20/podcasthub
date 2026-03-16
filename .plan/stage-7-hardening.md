# Stage 7: Hardening & Deployment — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden security, optimize performance, ensure accessibility, migrate data from v1, and deploy to production.

**Architecture:** Rate limiting middleware, security headers in next.config.ts, Lighthouse/axe-core audits, k6 load tests, Docker deployment to Azure Container Apps.

**Tech Stack:** next.config.ts headers, k6, axe-core, Lighthouse, Azure CLI, Docker.

**Prerequisites:** Stages 1-6 complete (auth, database, podcast CRUD, audio player, bookmarks, progress tracking, learning paths, analytics, search, user management).

---

## Task 1: Rate Limiting Middleware Integration

**Files:**

- `middleware.ts` (update existing)
- `lib/rate-limit.ts` (created in Stage 1 — no changes needed)
- `__tests__/middleware/rate-limit.test.ts`

### Steps

- [ ] **1.1 — Write integration tests for rate limiting**

  ```ts
  // __tests__/middleware/rate-limit.test.ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import { createMockRequest } from '@/test-utils/request';

  describe('Rate limiting middleware', () => {
    beforeEach(() => {
      // Reset rate limit counters between tests
    });

    it('allows requests under the limit', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/podcasts' });
      // Send 5 requests — all should succeed
      for (let i = 0; i < 5; i++) {
        const res = await handleMiddleware(req);
        expect(res.status).not.toBe(429);
      }
    });

    it('returns 429 when auth endpoint limit exceeded (5 req/min)', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: { email: 'a@b.com', password: 'x' },
      });
      // Send 6 requests — 6th should be rate limited
      for (let i = 0; i < 5; i++) {
        await handleMiddleware(req);
      }
      const res = await handleMiddleware(req);
      expect(res.status).toBe(429);
    });

    it('returns 429 when read endpoint limit exceeded (100 req/min)', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/podcasts' });
      for (let i = 0; i < 100; i++) {
        await handleMiddleware(req);
      }
      const res = await handleMiddleware(req);
      expect(res.status).toBe(429);
    });

    it('returns 429 when write endpoint limit exceeded (20 req/min)', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/api/podcasts',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { title: 'Test' },
      });
      for (let i = 0; i < 20; i++) {
        await handleMiddleware(req);
      }
      const res = await handleMiddleware(req);
      expect(res.status).toBe(429);
    });

    it('returns 429 when upload endpoint limit exceeded (5 req/5min)', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/api/upload',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      for (let i = 0; i < 5; i++) {
        await handleMiddleware(req);
      }
      const res = await handleMiddleware(req);
      expect(res.status).toBe(429);
    });

    it('returns 429 when search endpoint limit exceeded (30 req/min)', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/search?q=test' });
      for (let i = 0; i < 30; i++) {
        await handleMiddleware(req);
      }
      const res = await handleMiddleware(req);
      expect(res.status).toBe(429);
    });

    it('includes rate limit headers in response', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/podcasts' });
      const res = await handleMiddleware(req);
      expect(res.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('returns Retry-After header on 429', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: { email: 'a@b.com', password: 'x' },
      });
      for (let i = 0; i < 5; i++) await handleMiddleware(req);
      const res = await handleMiddleware(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBeDefined();
    });
  });
  ```

- [ ] **1.2 — Update middleware.ts to apply rate limits**

  ```ts
  // middleware.ts (add rate limiting logic)
  import { NextRequest, NextResponse } from 'next/server';
  import { rateLimit } from '@/lib/rate-limit';

  // Define rate limit tiers per PRD Section 12.3
  const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
    auth: { limit: 5, windowMs: 60_000 }, // 5 req/min
    read: { limit: 100, windowMs: 60_000 }, // 100 req/min
    write: { limit: 20, windowMs: 60_000 }, // 20 req/min
    upload: { limit: 5, windowMs: 300_000 }, // 5 req/5min
    search: { limit: 30, windowMs: 60_000 }, // 30 req/min
  };

  function getRateLimitTier(pathname: string, method: string): string {
    if (pathname.startsWith('/api/auth')) return 'auth';
    if (pathname.startsWith('/api/upload')) return 'upload';
    if (pathname.startsWith('/api/search')) return 'search';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'write';
    return 'read';
  }

  export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Only rate-limit API routes
    if (pathname.startsWith('/api/')) {
      const tier = getRateLimitTier(pathname, req.method);
      const config = RATE_LIMITS[tier];

      // Use IP address (or user ID if authenticated) as identifier
      const identifier = req.headers.get('x-forwarded-for') ?? req.ip ?? 'anonymous';
      const result = await rateLimit(identifier, config.limit, config.windowMs);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(config.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(result.reset),
              'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
            },
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', String(config.limit));
      response.headers.set('X-RateLimit-Remaining', String(result.remaining));
      response.headers.set('X-RateLimit-Reset', String(result.reset));
      return response;
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: '/api/:path*',
  };
  ```

- [ ] **1.3 — Run tests, verify green**
- [ ] **1.4 — Commit:** `feat(security): apply tiered rate limiting to all API routes`

---

## Task 2: Security Headers

**Files:**

- `next.config.ts` (update existing)
- `__tests__/integration/security-headers.test.ts`

### Steps

- [ ] **2.1 — Write integration tests for security headers**

  ```ts
  // __tests__/integration/security-headers.test.ts
  import { describe, it, expect } from 'vitest';

  describe('Security headers', () => {
    it('includes X-Content-Type-Options: nosniff', async () => {
      const res = await fetch('http://localhost:3000');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('includes X-Frame-Options: DENY', async () => {
      const res = await fetch('http://localhost:3000');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('includes Strict-Transport-Security', async () => {
      const res = await fetch('http://localhost:3000');
      const hsts = res.headers.get('Strict-Transport-Security');
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
    });

    it('includes Content-Security-Policy', async () => {
      const res = await fetch('http://localhost:3000');
      expect(res.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('includes Referrer-Policy: strict-origin-when-cross-origin', async () => {
      const res = await fetch('http://localhost:3000');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('includes Permissions-Policy', async () => {
      const res = await fetch('http://localhost:3000');
      expect(res.headers.get('Permissions-Policy')).toBeDefined();
    });
  });
  ```

- [ ] **2.2 — Update `next.config.ts` with security headers**

  ```ts
  // next.config.ts
  import type { NextConfig } from 'next';

  const securityHeaders = [
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js dev
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: https:",
        "font-src 'self'",
        "connect-src 'self' https://*.openai.azure.com",
        "frame-ancestors 'none'",
      ].join('; '),
    },
  ];

  const nextConfig: NextConfig = {
    // ... existing config
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders,
        },
      ];
    },
  };

  export default nextConfig;
  ```

- [ ] **2.3 — Run tests, verify green**
- [ ] **2.4 — Commit:** `feat(security): add comprehensive security headers to next.config.ts`

---

## Task 3: CORS Configuration

**Files:**

- `middleware.ts` (update existing)
- `__tests__/middleware/cors.test.ts`

### Steps

- [ ] **3.1 — Write integration tests for CORS**

  ```ts
  // __tests__/middleware/cors.test.ts
  import { describe, it, expect } from 'vitest';

  describe('CORS', () => {
    it('allows requests from app domain', async () => {
      const res = await fetch('http://localhost:3000/api/podcasts', {
        headers: { Origin: process.env.APP_DOMAIN ?? 'http://localhost:3000' },
      });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        process.env.APP_DOMAIN ?? 'http://localhost:3000'
      );
    });

    it('blocks requests from unknown origins', async () => {
      const res = await fetch('http://localhost:3000/api/podcasts', {
        headers: { Origin: 'https://evil.com' },
      });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('handles preflight OPTIONS requests', async () => {
      const res = await fetch('http://localhost:3000/api/podcasts', {
        method: 'OPTIONS',
        headers: {
          Origin: process.env.APP_DOMAIN ?? 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });
  ```

- [ ] **3.2 — Add CORS handling to middleware**

  ```ts
  // Add to middleware.ts — within the API route handler section

  const ALLOWED_ORIGIN = process.env.APP_DOMAIN ?? 'http://localhost:3000';

  function handleCors(req: NextRequest): NextResponse | null {
    const origin = req.headers.get('origin');

    // Preflight
    if (req.method === 'OPTIONS') {
      if (origin === ALLOWED_ORIGIN) {
        return new NextResponse(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      return new NextResponse(null, { status: 204 });
    }

    return null; // not a preflight, continue
  }

  // In the middleware function, add CORS headers to responses:
  // if (origin === ALLOWED_ORIGIN) {
  //   response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  // }
  ```

- [ ] **3.3 — Add `APP_DOMAIN` to `.env.example`**

  ```
  APP_DOMAIN=http://localhost:3000
  ```

- [ ] **3.4 — Run tests, verify green**
- [ ] **3.5 — Commit:** `feat(security): add CORS configuration restricting API to app domain`

---

## Task 4: Performance Audit

**Files:**

- `scripts/lighthouse-audit.sh`
- `next.config.ts` (update for bundle analyzer)

### Steps

- [ ] **4.1 — Install performance tools**

  ```bash
  npm install -D @next/bundle-analyzer lighthouse
  ```

- [ ] **4.2 — Configure bundle analyzer in `next.config.ts`**

  ```ts
  // Add to next.config.ts
  import withBundleAnalyzer from '@next/bundle-analyzer';

  const withAnalyzer = withBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
  });

  export default withAnalyzer(nextConfig);
  ```

- [ ] **4.3 — Create Lighthouse audit script**

  ```bash
  #!/bin/bash
  # scripts/lighthouse-audit.sh
  # Run Lighthouse CI on key pages

  PAGES=(
    "http://localhost:3000"
    "http://localhost:3000/library"
    "http://localhost:3000/search"
    "http://localhost:3000/learning-path"
  )

  echo "Starting Lighthouse audits..."

  for page in "${PAGES[@]}"; do
    echo "Auditing: $page"
    npx lighthouse "$page" \
      --output=json \
      --output-path="./lighthouse-reports/$(echo $page | sed 's|https\?://||;s|/|_|g').json" \
      --chrome-flags="--headless --no-sandbox" \
      --only-categories=performance,accessibility,best-practices,seo
  done

  echo "Reports saved to ./lighthouse-reports/"
  ```

- [ ] **4.4 — Run bundle analyzer**

  ```bash
  ANALYZE=true npm run build
  ```

  - Review output for large bundles
  - Document findings and optimization opportunities

- [ ] **4.5 — Apply performance optimizations**
  - [ ] Add `dynamic(() => import(...), { ssr: false })` for heavy client components (ReactFlow, Recharts)
  - [ ] Ensure images use `next/image` with proper `width`/`height`/`sizes`
  - [ ] Verify `loading="lazy"` on below-fold images
  - [ ] Add `<link rel="preload">` for critical fonts
  - [ ] Review and optimize Prisma queries (add `select` to avoid over-fetching)
  - [ ] Ensure Server Components are used wherever possible (no unnecessary 'use client')

- [ ] **4.6 — Run Lighthouse audit, verify scores**
  - Target: Performance >= 90, Accessibility >= 90, Best Practices >= 90
  - Fix any critical issues

- [ ] **4.7 — Commit:** `perf: optimize bundle size and add Lighthouse audit script`

---

## Task 5: Accessibility Audit

**Files:**

- `__tests__/a11y/pages.test.ts`

### Steps

- [ ] **5.1 — Install axe-core**

  ```bash
  npm install -D @axe-core/playwright  # if using Playwright for E2E
  # or
  npm install -D vitest-axe            # if using Vitest
  ```

- [ ] **5.2 — Write accessibility tests for all pages**

  ```ts
  // __tests__/a11y/pages.test.ts
  import { describe, it, expect } from 'vitest';
  import { render } from '@testing-library/react';
  import { axe, toHaveNoViolations } from 'vitest-axe';

  expect.extend(toHaveNoViolations);

  const pages = [
    { name: 'Home', component: () => import('@/app/page') },
    { name: 'Library', component: () => import('@/app/(public)/library/page') },
    { name: 'Search', component: () => import('@/app/(public)/search/page') },
    { name: 'Learning Paths', component: () => import('@/app/(public)/learning-path/page') },
  ];

  describe('Accessibility', () => {
    pages.forEach(({ name, component }) => {
      it(`${name} page has no a11y violations`, async () => {
        const Page = (await component()).default;
        const { container } = render(<Page />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });
  ```

- [ ] **5.3 — Audit keyboard navigation**
  - [ ] Verify tab order is logical on all pages
  - [ ] Verify focus ring is visible on all interactive elements
  - [ ] Verify Escape key closes modals and dialogs
  - [ ] Verify Enter/Space activates buttons and links
  - [ ] Verify arrow keys work in select dropdowns and toggle groups
  - [ ] Audio player is fully keyboard navigable (play/pause, volume, seek, next/prev)

- [ ] **5.4 — Audit ARIA labels**
  - [ ] All form inputs have associated labels (via `<Label htmlFor>` or `aria-label`)
  - [ ] All icon-only buttons have `aria-label`
  - [ ] Navigation landmarks: `<nav>`, `<main>`, `<header>`, `<footer>` are present
  - [ ] Dynamic content uses `aria-live` regions where appropriate (search results, notifications)
  - [ ] Progress bars have `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
  - [ ] Dialogs have `aria-modal="true"` and proper focus trapping (shadcn/ui handles this)

- [ ] **5.5 — Fix all violations found**
  - Document each fix with the specific WCAG criterion addressed

- [ ] **5.6 — Run a11y tests, verify green**
- [ ] **5.7 — Commit:** `fix(a11y): resolve accessibility violations across all pages`

---

## Task 6: Load Testing

**Files:**

- `k6/load-test.js`
- `k6/stress-test.js`

### Steps

- [ ] **6.1 — Install k6**

  ```bash
  brew install grafana/k6/k6  # macOS
  ```

- [ ] **6.2 — Create load test script**

  ```js
  // k6/load-test.js
  import http from 'k6/http';
  import { check, sleep } from 'k6';
  import { Rate } from 'k6/metrics';

  const errorRate = new Rate('errors');

  export const options = {
    stages: [
      { duration: '30s', target: 10 }, // Ramp up to 10 users
      { duration: '1m', target: 10 }, // Stay at 10 users
      { duration: '30s', target: 50 }, // Ramp up to 50 users
      { duration: '1m', target: 50 }, // Stay at 50 users
      { duration: '30s', target: 0 }, // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
      errors: ['rate<0.01'], // Error rate under 1%
    },
  };

  const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

  export default function () {
    // GET /api/podcasts (read — most common)
    const podcastsRes = http.get(`${BASE_URL}/api/podcasts`);
    check(podcastsRes, {
      'podcasts status 200': (r) => r.status === 200,
      'podcasts response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    // GET /api/learning-graphs (read)
    const graphsRes = http.get(`${BASE_URL}/api/learning-graphs`);
    check(graphsRes, {
      'graphs status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    // GET /api/search?q=react (search)
    const searchRes = http.get(`${BASE_URL}/api/search?q=react`);
    check(searchRes, {
      'search status 200': (r) => r.status === 200,
      'search response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    sleep(1);
  }
  ```

- [ ] **6.3 — Create stress test script**

  ```js
  // k6/stress-test.js
  import http from 'k6/http';
  import { check, sleep } from 'k6';

  export const options = {
    stages: [
      { duration: '1m', target: 100 }, // Ramp to 100 users
      { duration: '2m', target: 100 }, // Hold at 100
      { duration: '1m', target: 200 }, // Ramp to 200
      { duration: '2m', target: 200 }, // Hold at 200
      { duration: '1m', target: 0 }, // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(99)<1500'], // 99% under 1.5s
    },
  };

  // Same test function as load-test.js
  ```

- [ ] **6.4 — Run load tests against local/staging**

  ```bash
  k6 run k6/load-test.js
  ```

- [ ] **6.5 — Analyze results and fix bottlenecks**
  - [ ] If database queries slow: add indexes, optimize Prisma queries
  - [ ] If API slow: add caching (Redis or in-memory for read-heavy endpoints)
  - [ ] If memory issues: check for memory leaks in server components
  - [ ] Document results: p50, p95, p99, error rate, throughput

- [ ] **6.6 — Commit:** `test(perf): add k6 load and stress test scripts`

---

## Task 7: Data Migration Script

**Files:**

- `scripts/migrate-v1.ts`
- `scripts/migrate-v1.test.ts`

### Steps

- [ ] **7.1 — Write unit tests for migration functions**

  ```ts
  // scripts/migrate-v1.test.ts
  import { describe, it, expect, vi } from 'vitest';
  import {
    transformPodcast,
    transformUser,
    transformLearningGraph,
    validateMigration,
  } from './migrate-v1';

  describe('Data migration', () => {
    it('transforms v1 podcast to v2 schema', () => {
      const v1Podcast = {
        id: 1,
        title: 'Test',
        audio_url: '/uploads/audio.mp3',
        created_at: '2025-01-01',
      };
      const v2Podcast = transformPodcast(v1Podcast);
      expect(v2Podcast.title).toBe('Test');
      expect(v2Podcast.audioUrl).toBe('/uploads/audio.mp3');
      expect(v2Podcast.createdAt).toBeInstanceOf(Date);
    });

    it('hashes v1 user passwords with bcrypt', async () => {
      const v1User = { id: 1, username: 'admin', password: 'plaintext123', role: 'admin' };
      const v2User = await transformUser(v1User);
      expect(v2User.passwordHash).not.toBe('plaintext123');
      expect(v2User.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('validates row counts match', () => {
      const result = validateMigration({ v1Count: 50, v2Count: 50, entity: 'podcasts' });
      expect(result.success).toBe(true);
    });

    it('reports discrepancies', () => {
      const result = validateMigration({ v1Count: 50, v2Count: 48, entity: 'podcasts' });
      expect(result.success).toBe(false);
      expect(result.message).toContain('2 podcasts missing');
    });
  });
  ```

- [ ] **7.2 — Implement migration script**

  ```ts
  // scripts/migrate-v1.ts
  import { PrismaClient as V2Client } from '@prisma/client';
  import pg from 'pg';
  import bcrypt from 'bcrypt';
  import { BlobServiceClient } from '@azure/storage-blob';

  const v1Pool = new pg.Pool({ connectionString: process.env.V1_DATABASE_URL });
  const v2 = new V2Client({ datasourceUrl: process.env.DATABASE_URL });

  interface MigrationResult {
    entity: string;
    v1Count: number;
    v2Count: number;
    success: boolean;
    errors: string[];
  }

  export function transformPodcast(v1: any) {
    return {
      title: v1.title,
      description: v1.description ?? null,
      audioUrl: v1.audio_url,
      thumbnailUrl: v1.thumbnail_url ?? null,
      domain: v1.domain ?? 'general',
      tags: v1.tags ? v1.tags.split(',').map((t: string) => t.trim()) : [],
      duration: v1.duration ?? 0,
      createdAt: new Date(v1.created_at),
    };
  }

  export async function transformUser(v1: any) {
    const passwordHash = await bcrypt.hash(v1.password, 12);
    return {
      name: v1.username,
      email: v1.email ?? `${v1.username}@migrated.local`,
      passwordHash,
      role: v1.role ?? 'user',
      createdAt: new Date(v1.created_at),
    };
  }

  export function validateMigration(args: { v1Count: number; v2Count: number; entity: string }) {
    const diff = args.v1Count - args.v2Count;
    if (diff === 0)
      return { success: true, message: `${args.entity}: ${args.v2Count} migrated successfully` };
    return {
      success: false,
      message: `${diff} ${args.entity} missing (v1: ${args.v1Count}, v2: ${args.v2Count})`,
    };
  }

  async function migrateUsers(): Promise<MigrationResult> {
    const errors: string[] = [];
    const { rows: v1Users } = await v1Pool.query('SELECT * FROM users ORDER BY id');
    const idMap = new Map<number, string>(); // v1 id -> v2 id

    for (const v1User of v1Users) {
      try {
        const data = await transformUser(v1User);
        const v2User = await v2.user.create({ data });
        idMap.set(v1User.id, v2User.id);
      } catch (err) {
        errors.push(`User ${v1User.id} (${v1User.username}): ${err}`);
      }
    }

    const v2Count = await v2.user.count();
    return {
      entity: 'users',
      v1Count: v1Users.length,
      v2Count,
      success: errors.length === 0,
      errors,
    };
  }

  async function migratePodcasts(): Promise<MigrationResult> {
    const errors: string[] = [];
    const { rows: v1Podcasts } = await v1Pool.query('SELECT * FROM podcasts ORDER BY id');

    for (const v1Podcast of v1Podcasts) {
      try {
        const data = transformPodcast(v1Podcast);
        await v2.podcast.create({ data });
      } catch (err) {
        errors.push(`Podcast ${v1Podcast.id} (${v1Podcast.title}): ${err}`);
      }
    }

    const v2Count = await v2.podcast.count();
    return {
      entity: 'podcasts',
      v1Count: v1Podcasts.length,
      v2Count,
      success: errors.length === 0,
      errors,
    };
  }

  async function migrateLearningGraphs(): Promise<MigrationResult> {
    const errors: string[] = [];
    const { rows: v1Graphs } = await v1Pool.query('SELECT * FROM learning_graphs ORDER BY id');

    for (const v1Graph of v1Graphs) {
      try {
        await v2.learningGraph.create({
          data: {
            title: v1Graph.title,
            description: v1Graph.description,
            domain: v1Graph.domain,
            pathType: v1Graph.path_type ?? 'graph',
            isPublished: v1Graph.is_published ?? false,
            createdAt: new Date(v1Graph.created_at),
          },
        });
      } catch (err) {
        errors.push(`Graph ${v1Graph.id} (${v1Graph.title}): ${err}`);
      }
    }

    // Also migrate episodes, edges, bookmarks, progress
    // ... (similar pattern for each entity)

    const v2Count = await v2.learningGraph.count();
    return {
      entity: 'learningGraphs',
      v1Count: v1Graphs.length,
      v2Count,
      success: errors.length === 0,
      errors,
    };
  }

  async function migrateStorageFiles(): Promise<void> {
    // If v1 uses local filesystem and v2 uses MinIO/Azure Blob:
    // 1. List all audio files in v1 storage
    // 2. Upload each to Azure Blob Storage
    // 3. Update podcast audioUrl references in v2 database
    console.log('Storage migration: implement based on v1 storage type');
  }

  async function main() {
    console.log('=== Podcast Hub v1 → v2 Data Migration ===\n');

    const results: MigrationResult[] = [];

    console.log('1/4 Migrating users...');
    results.push(await migrateUsers());

    console.log('2/4 Migrating podcasts...');
    results.push(await migratePodcasts());

    console.log('3/4 Migrating learning graphs, episodes, edges...');
    results.push(await migrateLearningGraphs());

    console.log('4/4 Migrating storage files...');
    await migrateStorageFiles();

    // Summary
    console.log('\n=== Migration Summary ===');
    for (const result of results) {
      const status = result.success ? 'OK' : 'ISSUES';
      console.log(`[${status}] ${result.entity}: v1=${result.v1Count} v2=${result.v2Count}`);
      if (result.errors.length > 0) {
        console.log(`  Errors (${result.errors.length}):`);
        result.errors.forEach((e) => console.log(`    - ${e}`));
      }
    }

    await v1Pool.end();
    await v2.$disconnect();
  }

  main().catch(console.error);
  ```

- [ ] **7.3 — Add migration environment variables to `.env.example`**

  ```
  V1_DATABASE_URL=postgresql://user:pass@localhost:5432/podcasthub_v1
  ```

- [ ] **7.4 — Run tests, verify green**
- [ ] **7.5 — Commit:** `feat(migration): add v1 to v2 data migration script with validation`

---

## Task 8: README & Documentation

**Files:**

- `README.md`

### Steps

- [ ] **8.1 — Write comprehensive README.md with all 13 required sections**
      The README must include:
  1. **Project Title & Description** — Podcast Hub v2: internal podcast management + learning path platform
  2. **Features** — podcast CRUD, audio player, learning paths (graph + linear), bookmarks, progress tracking, search (basic + semantic), analytics, user management
  3. **Tech Stack** — Next.js 16, TypeScript, PostgreSQL, Prisma, Zustand, @xyflow/react, @dnd-kit, Recharts, Azure OpenAI, shadcn/ui
  4. **Prerequisites** — Node.js 20+, PostgreSQL 15+, pnpm/npm, Azure OpenAI access (for semantic search)
  5. **Getting Started** — Copy-pasteable setup commands:
     ```bash
     git clone <repo-url>
     cd podcasthub
     cp .env.example .env
     # Edit .env with your database URL and API keys
     npm install
     npx prisma migrate dev
     npm run dev
     ```
  6. **Environment Variables** — Table of all required/optional env vars with descriptions
  7. **Database Setup** — Prisma schema overview, migration commands, seeding
  8. **Project Structure** — Directory tree with descriptions
  9. **API Reference** — Table of all endpoints with method, path, auth requirement, description
  10. **Testing** — Commands for unit, integration, E2E, a11y tests
  11. **Deployment** — Docker build, Azure Container Apps deployment steps
  12. **Data Migration** — How to run the v1→v2 migration script
  13. **Contributing** — Code style, PR process, commit conventions

- [ ] **8.2 — Verify all setup commands work on a fresh clone**
- [ ] **8.3 — Commit:** `docs: add comprehensive README with setup and API reference`

---

## Task 9: Staging Deployment

**Files:**

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `scripts/deploy-staging.sh`

### Steps

- [ ] **9.1 — Create Dockerfile**

  ```dockerfile
  # Dockerfile
  FROM node:20-alpine AS base

  # Install dependencies
  FROM base AS deps
  WORKDIR /app
  COPY package.json package-lock.json ./
  RUN npm ci --omit=dev

  # Build
  FROM base AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npx prisma generate
  RUN npm run build

  # Production
  FROM base AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1

  RUN addgroup --system --gid 1001 nodejs
  RUN adduser --system --uid 1001 nextjs

  COPY --from=builder /app/public ./public
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  COPY --from=builder /app/prisma ./prisma

  USER nextjs
  EXPOSE 3000
  ENV PORT=3000
  ENV HOSTNAME="0.0.0.0"

  CMD ["node", "server.js"]
  ```

- [ ] **9.2 — Create docker-compose.yml for local testing**

  ```yaml
  # docker-compose.yml
  version: '3.8'
  services:
    app:
      build: .
      ports:
        - '3000:3000'
      environment:
        - DATABASE_URL=postgresql://postgres:postgres@db:5432/podcasthub
        - NEXTAUTH_URL=http://localhost:3000
        - JWT_SECRET=local-dev-secret
      depends_on:
        - db
    db:
      image: pgvector/pgvector:pg16
      ports:
        - '5432:5432'
      environment:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: podcasthub
      volumes:
        - pgdata:/var/lib/postgresql/data

  volumes:
    pgdata:
  ```

- [ ] **9.3 — Create `.dockerignore`**

  ```
  node_modules
  .next
  .env
  .env.local
  .git
  *.md
  k6
  lighthouse-reports
  __tests__
  e2e
  ```

- [ ] **9.4 — Create staging deployment script**

  ```bash
  #!/bin/bash
  # scripts/deploy-staging.sh
  set -euo pipefail

  RESOURCE_GROUP="podcasthub-staging-rg"
  ACR_NAME="podcasthubacr"
  APP_NAME="podcasthub-staging"
  IMAGE_TAG="${ACR_NAME}.azurecr.io/podcasthub:staging-$(git rev-parse --short HEAD)"

  echo "Building Docker image..."
  az acr build --registry $ACR_NAME --image "podcasthub:staging-$(git rev-parse --short HEAD)" .

  echo "Deploying to Azure Container Apps..."
  az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $IMAGE_TAG

  echo "Running database migrations..."
  az containerapp exec \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --command "npx prisma migrate deploy"

  echo "Deployment complete!"
  echo "URL: https://${APP_NAME}.azurecontainerapps.io"
  ```

- [ ] **9.5 — Deploy to staging**

  ```bash
  chmod +x scripts/deploy-staging.sh
  ./scripts/deploy-staging.sh
  ```

- [ ] **9.6 — Run E2E test suite against staging**

  ```bash
  BASE_URL=https://podcasthub-staging.azurecontainerapps.io npm run test:e2e
  ```

- [ ] **9.7 — Verify all features work end-to-end on staging**
  - [ ] Auth: register, login, logout
  - [ ] Podcast CRUD: create, read, update, delete
  - [ ] Audio player: play, pause, seek, volume
  - [ ] Bookmarks: add, remove, list
  - [ ] Progress tracking: play episode, verify progress saved
  - [ ] Learning paths: admin creates graph path, publishes, user views, tracks progress
  - [ ] Search: basic text search, semantic search
  - [ ] Analytics: admin dashboard loads with data
  - [ ] User management: superadmin changes roles

- [ ] **9.8 — Monitor Sentry for errors (24h soak)**
- [ ] **9.9 — Commit:** `chore(deploy): add Docker and Azure staging deployment config`

---

## Task 10: Production Deployment

**Files:**

- `scripts/deploy-production.sh`
- `scripts/health-check.sh`

### Steps

- [ ] **10.1 — Run final E2E test suite on staging**

  ```bash
  BASE_URL=https://podcasthub-staging.azurecontainerapps.io npm run test:e2e
  ```

  - All tests must pass before proceeding

- [ ] **10.2 — Run data migration against production database**

  ```bash
  V1_DATABASE_URL=<production-v1-url> DATABASE_URL=<production-v2-url> npx tsx scripts/migrate-v1.ts
  ```

  - Review migration summary — all entities should show "OK"
  - Verify row counts match expected values

- [ ] **10.3 — Create production deployment script**

  ```bash
  #!/bin/bash
  # scripts/deploy-production.sh
  set -euo pipefail

  RESOURCE_GROUP="podcasthub-prod-rg"
  ACR_NAME="podcasthubacr"
  APP_NAME="podcasthub-prod"
  IMAGE_TAG="${ACR_NAME}.azurecr.io/podcasthub:prod-$(git rev-parse --short HEAD)"

  echo "=== PRODUCTION DEPLOYMENT ==="
  echo "Image: $IMAGE_TAG"
  echo "Press Ctrl+C within 10 seconds to abort..."
  sleep 10

  echo "Building Docker image..."
  az acr build --registry $ACR_NAME --image "podcasthub:prod-$(git rev-parse --short HEAD)" .

  echo "Deploying to Azure Container Apps..."
  az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $IMAGE_TAG

  echo "Running database migrations..."
  az containerapp exec \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --command "npx prisma migrate deploy"

  echo "Verifying health..."
  ./scripts/health-check.sh "https://${APP_NAME}.azurecontainerapps.io"

  echo "Production deployment complete!"
  ```

- [ ] **10.4 — Create health check script**

  ```bash
  #!/bin/bash
  # scripts/health-check.sh
  set -euo pipefail

  BASE_URL="${1:-http://localhost:3000}"
  MAX_RETRIES=10
  RETRY_INTERVAL=5

  echo "Checking health at ${BASE_URL}/api/health..."

  for i in $(seq 1 $MAX_RETRIES); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health" || echo "000")
    if [ "$STATUS" = "200" ]; then
      echo "Health check passed (attempt $i)"
      exit 0
    fi
    echo "Attempt $i/$MAX_RETRIES: status=$STATUS, retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
  done

  echo "HEALTH CHECK FAILED after $MAX_RETRIES attempts"
  exit 1
  ```

- [ ] **10.5 — Deploy to production**

  ```bash
  chmod +x scripts/deploy-production.sh scripts/health-check.sh
  ./scripts/deploy-production.sh
  ```

- [ ] **10.6 — Verify health check endpoint responds 200**

  ```bash
  curl -s https://podcasthub-prod.azurecontainerapps.io/api/health | jq .
  ```

- [ ] **10.7 — Post-deployment verification**
  - [ ] Verify home page loads
  - [ ] Verify login works
  - [ ] Verify podcast playback works
  - [ ] Verify search returns results
  - [ ] Verify migrated data is accessible (spot check 5-10 podcasts, learning paths)

- [ ] **10.8 — Monitor for 24 hours**
  - [ ] Check Sentry for new errors
  - [ ] Check Azure Monitor for CPU/memory usage
  - [ ] Check database connection pool health
  - [ ] Verify no 5xx errors in logs

- [ ] **10.9 — Commit:** `chore(deploy): add production deployment and health check scripts`
