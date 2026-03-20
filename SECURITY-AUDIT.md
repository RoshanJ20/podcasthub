# The Audit Brief — Pre-Deployment Security Audit Report

**Date:** March 19, 2026 | **Scope:** Full codebase analysis across auth, input validation, Azure infrastructure, headers, logging, and dependencies

---

## Executive Summary

The codebase has **strong foundational security** — structured logging, proper error handling, no hardcoded secrets, multi-stage Docker builds, and good JWT architecture. However, there are **several critical gaps** that must be addressed before Azure deployment: rate limiting is implemented but **never applied** to any routes, JWT secret validation uses unsafe fallbacks in middleware, and authentication endpoints lack brute-force protection.

**Total Issues Found: 38** — 6 Critical, 9 High, 14 Medium, 9 Low

---

## Table of Contents

- [1. CRITICAL Issues (Fix Before Deployment)](#1-critical-issues-fix-before-deployment)
- [2. HIGH Priority Issues (Fix Before Production)](#2-high-priority-issues-fix-before-production)
- [3. MEDIUM Priority Issues (Address Soon)](#3-medium-priority-issues-address-soon)
- [4. LOW Priority Issues (Future Sprints)](#4-low-priority-issues-future-sprints)
- [5. What's Already Done Well](#5-whats-already-done-well)
- [6. Recommended Remediation Order](#6-recommended-remediation-order)

---

## 1. CRITICAL Issues (Fix Before Deployment)

### C1. Rate Limiting Middleware Never Applied

- **Where:** All API routes — `app/api/**`
- **What:** `lib/api/rate-limit-middleware.ts` defines rate limit tiers (auth: 5/min, read: 100/min, write: 20/min, upload: 5/5min, search: 30/min) but **zero routes use `withRateLimit`**. Only test files import it.
- **Risk:** All endpoints are defenseless against brute force, credential stuffing, and DoS attacks.
- **Fix:** Wrap every API route handler with the appropriate `withRateLimit` tier. Prioritize auth endpoints immediately.

### C2. No Brute Force Protection on Login

- **Where:** `app/api/auth/login/route.ts`
- **What:** Unlimited login attempts allowed. No account lockout, no progressive delays, no CAPTCHA.
- **Risk:** Credential stuffing and dictionary attacks are trivial.
- **Fix:** Apply `withRateLimit('auth', ...)`, implement per-user lockout after N failures (e.g., 10 attempts → 30-min lockout), log failed attempts.

### C3. JWT Secret Fallback to Empty String in Middleware

- **Where:** `middleware.ts:210-211`
- **What:** `const accessSecret = process.env.JWT_ACCESS_SECRET || '';` — falls back to empty string if env var is missing.
- **Risk:** If secrets aren't configured, tokens signed with empty string are trivially forgeable. Complete auth bypass.
- **Fix:** Throw an error at startup if secrets are not set. Never use empty string fallback:

```typescript
const accessSecret = process.env.JWT_ACCESS_SECRET;
if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is required');
```

### C4. SQL Injection via `$queryRawUnsafe`

- **Where:** `app/api/search/route.ts:70-102`
- **What:** Uses `$queryRawUnsafe()` for vector similarity search. While inputs come from Azure OpenAI embeddings, `$queryRawUnsafe` bypasses Prisma's parameterization.
- **Risk:** If embedding generation is ever influenced by user input injection, SQL injection is possible.
- **Fix:** Replace with `$queryRaw` using tagged template literals for proper parameterization.

### C5. Path Traversal in Media Proxy

- **Where:** `app/api/media/route.ts:31-39`
- **What:** The `key` query parameter is passed directly to `downloadObject()` without validation for `..` sequences.
- **Risk:** Attacker could request `GET /api/media?key=../../../sensitive-file` to access unintended blob storage objects.
- **Fix:** Validate key matches expected pattern: `^(audio|image|pdf)/[a-zA-Z0-9-]+/[^/]+$`

### C6. Weak Password Requirements

- **Where:** `lib/schemas/user.ts:13-18`
- **What:** Password only requires `min(8)` — no complexity requirements.
- **Risk:** Users can set `password1` or `12345678`. Easy targets for dictionary attacks.
- **Fix:** Add complexity rules or increase minimum length to 12+ chars. Consider checking against breached password databases.

---

## 2. HIGH Priority Issues (Fix Before Production)

### H1. Missing CSRF Protection

- **Where:** Entire codebase
- **What:** No CSRF tokens on state-changing requests. SameSite=lax provides partial but insufficient protection.
- **Fix:** Implement double-submit cookie pattern or upgrade to `SameSite: strict`.

### H2. No Token Invalidation on Logout

- **Where:** `app/api/auth/logout/route.ts`
- **What:** Logout only clears cookies. Stolen tokens remain valid (access: 15min, refresh: 7 days).
- **Fix:** Implement token blacklist (Redis or DB) checked during verification.

### H3. SameSite Cookie Set to Lax

- **Where:** `lib/auth/cookies.ts:53,61,83,91`
- **What:** `sameSite: 'lax'` allows cookies on top-level navigations, enabling some CSRF vectors.
- **Fix:** Change to `sameSite: 'strict'` unless cross-site navigation is required.

### H4. 10 npm Dependency Vulnerabilities (4 HIGH)

- **Where:** `package.json` / `package-lock.json`
- **What:** 4 HIGH severity issues in transitive deps (hono/prisma): auth bypass via encoded slashes, arbitrary file access, XSS. 6 MODERATE: lodash prototype pollution, Next.js CSRF bypass for null origin.
- **Fix:** `npm audit fix`, upgrade prisma to >=6.19.2, test thoroughly.

### H5. CSP Overly Permissive

- **Where:** `next.config.ts:17-21`
- **What:** CSP includes `'unsafe-eval'` and `'unsafe-inline'` in script-src, defeating XSS protections. External CDN `https://unpkg.com` allowed.
- **Fix:** Remove `unsafe-eval`/`unsafe-inline`, use nonces for legitimate inline scripts, add Subresource Integrity for external resources.

### H6. No Rate Limiting on Refresh Token Endpoint

- **Where:** `app/api/auth/refresh/route.ts`
- **What:** Token refresh has no rate limiting. High-value target for token theft.
- **Fix:** Apply `withRateLimit('auth', ...)`.

### H7. URL Fields Accept Arbitrary Strings

- **Where:** `lib/schemas/podcast.ts:27-33`
- **What:** `thumbnailUrl`, `audioShortUrl`, `audioLongUrl` accept any string — including `javascript:`, `data:text/html`, `file://` protocols.
- **Fix:** Use `z.string().url()` or restrict to HTTPS URLs matching your storage domain.

### H8. Missing Business Metrics

- **Where:** Codebase-wide
- **What:** No business-level metrics (sign-ups, listens, search usage). Technical health monitoring only.
- **Fix:** Instrument key operations with metrics; export via `/metrics` endpoint.

### H9. Sentry Not Integrated

- **Where:** `package.json` — `@sentry/nextjs` not installed
- **What:** Error tracking DSN is in `.env.example` but Sentry SDK is not installed or initialized.
- **Fix:** Install `@sentry/nextjs`, initialize in layout and middleware, configure PII scrubbing.

---

## 3. MEDIUM Priority Issues (Address Soon)

| #   | Issue                                | Location                                 | Fix                                                            |
| --- | ------------------------------------ | ---------------------------------------- | -------------------------------------------------------------- |
| M1  | No request body size limits          | All POST/PUT routes                      | Configure `bodyParser: { sizeLimit: '10mb' }` in next.config   |
| M2  | Database SSL/TLS not configured      | `lib/db.ts`                              | Add `ssl: { rejectUnauthorized: true }` for production         |
| M3  | Silent token verification failures   | `middleware.ts:44-52`                    | Log verification failures with context for security monitoring |
| M4  | No account lockout mechanism         | `app/api/auth/login/route.ts`            | Track failed attempts in DB, lock after N failures             |
| M5  | No registration rate limiting        | `app/api/auth/register/route.ts`         | Apply `withRateLimit('auth', ...)`                             |
| M6  | Unvalidated date params in analytics | `app/api/admin/analytics/route.ts:22-28` | Validate ISO 8601 format before `new Date()`                   |
| M7  | `z.any()` for activity metadata      | `app/api/activity/route.ts:26`           | Use typed union with max key count                             |
| M8  | No embedding input length check      | `lib/embeddings.ts:30`                   | Add `if (text.length > 8191)` guard                            |
| M9  | Unbounded tags array parameter       | `app/api/podcasts/route.ts:50-59`        | Limit to 50 tags, validate format                              |
| M10 | `dangerouslyAllowSVG` enabled        | `next.config.ts:39`                      | SVGs can contain XSS; sanitize on upload                       |
| M11 | No token session binding             | `app/api/auth/refresh/route.ts:76-77`    | Add session ID/nonce to JWT payload                            |
| M12 | Generic Prisma error handling        | Throughout API routes                    | Catch `PrismaClientKnownRequestError` for 409 Conflict etc.    |
| M13 | Search query echoed in response      | `app/api/search/route.ts:60`             | Truncate to 500 chars, sanitize before returning               |
| M14 | Azure Blob container access level    | `lib/storage.ts:128-132`                 | Verify container is NOT publicly readable in production        |

---

## 4. LOW Priority Issues (Future Sprints)

| #   | Issue                                   | Location                            | Fix                                                                   |
| --- | --------------------------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| L1  | Timing attack on login                  | `app/api/auth/login/route.ts:61-68` | Add constant-time delay to mask missing-user vs wrong-password timing |
| L2  | No max length on email/password         | `lib/schemas/user.ts`               | Add email max 254, password max 256                                   |
| L3  | Bcrypt rounds misconfigurable           | `lib/auth/password.ts:16`           | Add `Math.max(10, rounds)` floor                                      |
| L4  | X-XSS-Protection set to 0               | `next.config.ts:14`                 | Remove header (browser default is safer)                              |
| L5  | Missing Cache-Control on auth responses | Auth API routes                     | Add `Cache-Control: no-store, private`                                |
| L6  | No Content-Type validation              | All POST/PUT routes                 | Verify `Content-Type: application/json` before parsing                |
| L7  | Year param without range validation     | Podcast routes                      | Validate `1900 <= year <= 2100`                                       |
| L8  | No container image scanning in CI       | `.github/workflows/cd.yml`          | Add Trivy scan before push                                            |
| L9  | No OpenTelemetry distributed tracing    | Codebase-wide                       | Add OTEL SDK for future multi-service support                         |

---

## 5. What's Already Done Well

| Area                         | Status    | Notes                                                                               |
| ---------------------------- | --------- | ----------------------------------------------------------------------------------- |
| No hardcoded secrets         | Excellent | All secrets in env vars, `.gitignore` correct, `.env.example` has placeholders only |
| Structured logging (Pino)    | Excellent | JSON logs, correlation IDs, child loggers, zero `console.log` in prod               |
| No PII in logs               | Excellent | Passwords, tokens, API keys never logged                                            |
| JWT architecture             | Good      | Separate access/refresh secrets, 15min access expiry, token rotation                |
| HttpOnly cookies             | Good      | XSS-protected, Secure in prod, SameSite set                                         |
| Docker security              | Good      | Multi-stage build, non-root user, Alpine base                                       |
| Error handling               | Good      | Structured responses, no stack traces exposed, consistent schema                    |
| CI/CD secrets                | Good      | GitHub Secrets used, not logged or exposed                                          |
| Azure Blob SAS tokens        | Good      | Scoped permissions, 1-hour expiry, per-blob access                                  |
| Health/readiness checks      | Good      | `/health` and `/ready` endpoints with DB verification                               |
| CORS                         | Good      | Restricted to single origin, credentials properly handled                           |
| HSTS                         | Good      | 2-year max-age with preload                                                         |
| Email enumeration prevention | Good      | Generic error messages on login (same for missing user and wrong password)          |
| IDOR protection              | Good      | All user-specific resources check `userId` ownership                                |

---

## 6. Recommended Remediation Order

| Priority        | Action                                                                                | Effort  |
| --------------- | ------------------------------------------------------------------------------------- | ------- |
| **Immediate**   | Apply rate limiting to all routes (C1, C2, H6) — middleware exists, just needs wiring | Low     |
| **Immediate**   | Fix JWT secret fallback (C3) — one-line change                                        | Trivial |
| **This week**   | Fix SQL injection and path traversal (C4, C5)                                         | Low     |
| **This week**   | Upgrade vulnerable dependencies (H4)                                                  | Low     |
| **Before prod** | Implement CSRF protection (H1), token invalidation (H2), cookie hardening (H3)        | Medium  |
| **Before prod** | Configure database SSL (M2), tighten CSP (H5), verify Azure container access (M14)    | Low     |
| **Before prod** | Integrate Sentry (H9), add business metrics (H8)                                      | Medium  |
| **Next sprint** | Address remaining medium and low priority items                                       | Ongoing |

> **The most impactful single change is wiring up the existing rate limiting middleware** — it's already built and configured but simply not connected to any routes.

---

## OWASP Top 10 Coverage

| OWASP Category                        | Status  | Notes                                        |
| ------------------------------------- | ------- | -------------------------------------------- |
| A01: Broken Access Control            | Partial | RBAC present, but missing CSRF + rate limits |
| A02: Cryptographic Failures           | Good    | bcrypt, JWT HS256, HttpOnly cookies          |
| A03: Injection                        | At Risk | `$queryRawUnsafe` + path traversal found     |
| A04: Insecure Design                  | Good    | Layered auth, structured error handling      |
| A05: Security Misconfiguration        | Partial | CSP too permissive, DB SSL missing           |
| A06: Vulnerable Components            | At Risk | 10 npm audit findings (4 HIGH)               |
| A07: Auth Failures                    | At Risk | No brute force protection, weak passwords    |
| A08: Software/Data Integrity Failures | Good    | CI/CD uses pinned actions, lock file present |
| A09: Logging & Monitoring Failures    | Partial | Logging excellent, but Sentry not integrated |
| A10: Server-Side Request Forgery      | Good    | No SSRF vectors identified                   |
