# AGENTS.md

## Project Overview

- **The Audit Brief** — Internal enterprise web application
- Audio platform with transcripts, bookmarks, learning paths, AI-powered semantic search
- Complete rebuild with enterprise-grade architecture, TDD, CI/CD, and security
- Serves audit professionals accessing "bulletins" (audio content) covering technical topics across audit domains
- Deployed at `https://uat.uno.wcgt.in/auditbrief` (subpath / basePath deployment)

## Tech Stack

| Layer               | Technology                                | Version  | Notes                                                          |
| ------------------- | ----------------------------------------- | -------- | -------------------------------------------------------------- |
| **Framework**       | Next.js (App Router)                      | 15.3.x   | Server Components, API routes, middleware, basePath deployment |
| **Language**        | TypeScript                                | 5.x      | Strict mode (`strict: true`), no `any` types                   |
| **Runtime**         | Node.js                                   | 20 LTS   | Native ESM                                                     |
| **Database**        | PostgreSQL + Prisma ORM                   | 16 + 6.x | pgvector extension for vector search                           |
| **Auth**            | NextAuth v4                               | 4.24.x   | Credentials + Azure AD providers, JWT-cookie session strategy  |
| **UI**              | React 19 + shadcn/ui (Radix)              | 19.2 + — | Accessible, composable components                              |
| **Styling**         | Tailwind CSS                              | 4.x      | Utility-first, design system tokens                            |
| **State**           | Zustand                                   | 5.x      | Lightweight stores (`player-store`, `graph-editor-store`)      |
| **File Storage**    | Azurite (dev) → Azure Blob Storage (prod) | —        | Private container; access via presigned SAS + `/api/media`     |
| **Audio Streaming** | HLS.js (client) + HTML5 `<audio>`         | —        | Streaming media proxy supports HTTP Range requests             |
| **Vector Search**   | pgvector (PostgreSQL extension)           | —        | Via Prisma raw queries (`$queryRaw`)                           |
| **Embeddings**      | Azure OpenAI                              | —        | `text-embedding-3-large` model                                 |
| **Icons**           | Lucide React                              | Latest   | Consistent icon set                                            |
| **Fonts**           | Geist                                     | —        | Body font via `next/font/local`                                |

## Key Libraries

| Category       | Library                           | Purpose                                                           |
| -------------- | --------------------------------- | ----------------------------------------------------------------- |
| **Forms**      | React Hook Form + Zod             | Form state + runtime validation                                   |
| **Charts**     | Recharts                          | Admin analytics visualizations                                    |
| **PDF**        | react-pdf                         | In-app bulletin viewer (bundles pdfjs-dist transitively)          |
| **Sortable**   | @dnd-kit/core + @dnd-kit/sortable | Linear learning-path editor (drag-to-reorder episodes)            |
| **Toast**      | Sonner                            | Notifications                                                     |
| **Theming**    | next-themes                       | Dark/light mode (nonce-aware FOUC-prevention script)              |
| **Logging**    | Pino                              | Structured JSON logging with child loggers                        |
| **Monitoring** | Pino logs + pm2                   | Sentry env vars reserved but SDK is **not currently initialized** |
| **Testing**    | Vitest + RTL + Playwright + MSW   | Unit / integration / E2E                                          |
| **Linting**    | ESLint 9 (flat config) + Prettier | Code quality                                                      |
| **Git Hooks**  | Husky v9 + lint-staged            | Pre-commit checks                                                 |

## Styling Rules

- shadcn/ui is the primary component library — use it before building custom components
- Tailwind utility classes only, no inline `<style>` JSX nodes (CSP forbids them — see `lib/security/csp.ts`)
- `cn()` utility (from `lib/utils.ts`) for conditional class merging
- next-themes for dark/light mode support
- No CSS modules or styled-components

## Architecture

```
the-audit-brief/
├── .github/workflows/           # CI/CD (ci.yml, e2e.yml, cd.yml†)
├── .husky/                      # Git hooks (pre-commit → lint-staged)
├── prisma/
│   ├── schema.prisma            # Database schema (14 models)
│   ├── migrations/              # Prisma migrations
│   └── seed.ts                  # Seed script (run via `npm run db:seed`)
├── app/
│   ├── layout.tsx               # Root layout (CSP nonce, providers, fonts, audio context)
│   ├── globals.css              # Tailwind + design tokens + @keyframes
│   ├── error.tsx                # Global error boundary
│   ├── not-found.tsx            # 404 handler
│   ├── (auth)/                  # login, register, unauthorized
│   ├── (public)/                # /, bulletins, audit-brief/[id], search, learning-path[/[id]], progress
│   ├── (admin)/                 # /admin, upload, edit/[id][/transcript], learning-graphs[/new|/[id]],
│   │                            #   users, analytics, audit-log
│   └── api/                     # 25 endpoints (see "API Routes Overview" below)
├── components/
│   ├── ui/                      # shadcn primitives (Radix wrappers)
│   ├── audio-player/            # Global player, transcript, bulletin viewer, bookmark panel
│   ├── admin/                   # Upload wizard, tables, transcript editor, thumbnail crop
│   ├── learning-path/           # Linear editor, episode sidebar, path viewer
│   ├── layout/                  # Unified sidebar, mobile bars, command palette
│   ├── auth/                    # Login/register forms, SSO button
│   ├── search/                  # Search input + results
│   ├── progress/                # Progress dashboard
│   ├── home/                    # Home card grid
│   ├── library/                 # Pagination controls
│   ├── providers/               # Session/Theme/Nonce/Audio providers
│   └── error-boundary.tsx       # React error boundary wrapper
├── lib/
│   ├── db.ts                    # Prisma client singleton (was `prisma.ts`)
│   ├── db-instrumentation.ts    # Slow-query logging via Prisma middleware
│   ├── auth/                    # NextAuth config, custom Prisma adapter, password, token revocation
│   ├── api/                     # errors, pagination, rate-limit, cors, request-context, request-logging
│   ├── admin/                   # audit-log, blob-sweep, concurrency, revalidate
│   ├── schemas/                 # Zod schemas per entity
│   ├── security/                # csp.ts (nonce generation + policy assembly)
│   ├── config/                  # base-path.ts (`withBasePath()`)
│   ├── storage.ts               # Azure Blob ops (presigned URLs, streaming, delete)
│   ├── storage-{client,cleanup,errors,logger,types,url}.ts  # storage support family
│   ├── embeddings.ts            # Azure OpenAI embedding generation (retry + backoff)
│   ├── logger.ts                # Pino structured logger
│   ├── upload.ts                # File-type / size validation, key generation
│   ├── file-to-data-url.ts      # File → data: URL (CSP-safe image previews)
│   ├── attachment-utils.ts      # Bulletin/PDF attachment helpers
│   ├── format-time.ts           # MM:SS / HH:MM:SS formatting
│   ├── domain-colors.ts         # Domain → color token map
│   ├── navigation-config.ts     # Sidebar menu structure
│   ├── animation.ts             # Animation durations / easings
│   ├── types.ts                 # Global TS types
│   └── utils.ts                 # cn(), misc utilities
├── hooks/                       # 13 custom React hooks (HLS player, transcript sync, wizard state, …)
├── stores/
│   ├── player-store.ts          # Global audio player (Zustand)
│   ├── graph-editor-store.ts    # Learning-path editor state
│   └── graph-editor-helpers.ts  # Pure payload/reconciliation helpers
├── middleware.ts                # Auth + admin role check + CSP nonce + request-id propagation
├── __tests__/
│   ├── unit/                    # Pure function tests (lib/, schemas/, hooks/, stores/)
│   ├── integration/             # API route + component tests (RTL + MSW)
│   └── e2e/                     # Playwright browser tests (Chromium)
├── scripts/                     # bootstrap-azure.sh, migrate-production.sh,
│                                #   backfill-transcript-embeddings.ts, regenerate-openapi-yaml.mjs
├── docs/
│   ├── deployment-guide.md      # Canonical Azure VM + Nginx + pm2 deployment
│   ├── architecture-diagrams.md # Top-level system mermaid diagrams
│   ├── architecture/            # C4-style .mmd source diagrams
│   ├── csp-nonce-nginx-integration-guide.md  # CSP + nginx playbook for other apps
│   ├── PRD_PODCAST_HUB_V2.md    # Historical product spec
│   ├── openapi.{json,yaml}      # OpenAPI 3 spec (regenerated via scripts/)
│   └── superpowers/{plans,specs}/  # Historical planning artefacts
├── application-links.md         # Exhaustive URL / env / route reference (auditable index)
├── openapi-auditbrief.html      # Rendered Swagger UI for VAPT consumers
├── Dockerfile                   # Multi-stage build (deps → builder → runner)
├── docker-compose.yml           # Local dev: PostgreSQL 16 (pgvector) + Azurite
├── vitest.config.ts             # Vitest + jsdom + 45 % line-coverage threshold
├── playwright.config.ts         # Playwright (Chromium)
├── playwright.csp.config.ts     # CSP-specific Playwright suite
├── next.config.ts               # basePath, output: standalone, security headers (no CSP — built in middleware)
└── package.json
```

† `.github/workflows/cd.yml` is the legacy Azure Container Apps workflow and is **currently out of sync** with the VM + Nginx + pm2 production deployment described in `docs/deployment-guide.md`. Do not enable on `push` triggers without first migrating per the deployment guide.

## Key Architecture Patterns

- **Server Components by default** — pages fetch data server-side; only interactive parts are Client Components
- **Route groups:** `(auth)`, `(public)`, `(admin)` for layout and middleware isolation
- **Centralized Zod validation** in `lib/schemas/`, shared between client forms and API routes
- **Error boundary hierarchy** — React ErrorBoundary in root layout + `error.tsx` per route group
- **Defense in depth:** Middleware (NextAuth JWT verify) → API auth check (`requireAuth`, `requireRole`) → Prisma-level checks
- **Per-request CSP nonce** — middleware generates a random nonce, propagates via `x-nonce` header, layout stamps it on `<meta>` + bootstrap `<script>`
- **Service layer separation** — API routes handle HTTP concerns; business logic in `lib/`
- **Structured logging everywhere** — Pino child loggers carry `request_id` and domain context

## Audio Pipeline

```
Upload (admin)
  → POST /api/upload returns a presigned Azure Blob SAS URL (write, 1 hr)
  → Client PUT direct to Azure Blob (private container)
  → AuditBrief record stores blob keys (not absolute URLs)
  → Playback: <audio src="/api/media?key=…"> proxies through Next.js
  → /api/media streams from Azure Blob with HTTP Range support (no buffering)
  → HLS.js handles `.m3u8` assets; HTML5 <audio> handles MP3/WAV
```

## Auth Flow

```
User visits protected route
  → middleware.ts validates JWT via `getToken()` (edge-compatible, no DB call)
  → No valid token → redirect to /login?callbackUrl=<original-path>
  → User authenticates:
      • Email/password → Credentials provider (bcryptjs verify, BCRYPT_SALT_ROUNDS cost)
      • Microsoft SSO  → Azure AD provider (OAuth2/OIDC, account linking in signIn callback)
  → NextAuth issues an encrypted JWT session cookie (HttpOnly, 30-day expiry)
  → `signIn` callback links Azure AD accounts to existing users by email
  → `jwt` callback injects { userId, role } into the token
  → Server-side: `requireAuth()` / `requireRole()` in lib/auth/session-helpers.ts
  → `lib/auth/token-revocation.ts` supports sign-out / device removal blacklisting
```

## API Routes Overview

25 endpoints under `app/api/`. Source-of-truth specs: `docs/openapi.yaml`. Detailed table in `application-links.md` §5.

| Group       | Endpoints                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Health**  | `GET /api/health` (liveness), `GET /api/ready` (readiness + DB check)                                                                  |
| **Auth**    | `GET\|POST /api/auth/[...nextauth]`, `POST /api/auth/register`                                                                         |
| **Content** | `audit-briefs` (CRUD + `/transcript` + `/batch`), `learning-graphs` (CRUD + `/data` bulk save)                                         |
| **Search**  | `GET /api/search` (keyword), `POST /api/search` (semantic via pgvector + Azure OpenAI)                                                 |
| **Media**   | `GET /api/media?key=` (streaming proxy with HTTP Range)                                                                                |
| **User**    | `bookmarks` (CRUD), `favorites` (toggle), `learning-graph-favorites` (toggle), `progress` (GET/POST/PUT), `activity` (fire-and-forget) |
| **Upload**  | `POST /api/upload` (presigned SAS), `POST /api/upload/file` (multipart, excluded from edge middleware due to body cap)                 |
| **Admin**   | `users` + `users/[id]/role` (superadmin), `admin/analytics`, `admin/blob-sweep` (orphan cleanup, superadmin, dry-run by default)       |

## Database Access

- **Prisma ORM** for all standard queries (type-safe, auto-generated client)
- **Prisma raw queries** (`$queryRaw`) for pgvector cosine similarity search
- **Prisma client singleton** in `lib/db.ts` (prevents connection exhaustion in dev)
- **Slow-query logging** in `lib/db-instrumentation.ts` (threshold via `SLOW_QUERY_THRESHOLD_MS`)
- **Optimistic locking** in `lib/admin/concurrency.ts` for concurrent admin edits
- **Prisma migrations** for schema changes (`npx prisma migrate dev` locally, `npx prisma migrate deploy` in prod)

## Database Schema

14 models in `prisma/schema.prisma`. Authoritative source — read the schema file for fields and relations.

| Model                   | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `User`                  | Authentication + profile + role (`public` / `admin` / `superadmin`)                  |
| `Account` / `Session`   | NextAuth provider accounts and sessions (managed by `lib/auth/prisma-adapter.ts`)    |
| `AuditBrief`            | Main content entity — title, description, domain, year, tags, audio + bulletin URLs  |
| `Transcript`            | Full text + JSON segments + `vector(1536)` embedding for semantic search             |
| `LearningGraph`         | Content sequence (linear path) with episodes + edges                                 |
| `Episode`               | Node in a learning graph — audio, transcript JSON, position, sortOrder, nodeType     |
| `LearningPathEdge`      | Directed connection between episodes (optional label)                                |
| `Favorite`              | User → AuditBrief favorite toggle (unique `(userId, auditBriefId)`)                  |
| `LearningGraphFavorite` | User → LearningGraph favorite toggle                                                 |
| `Bookmark`              | User annotation at a timestamp on either an AuditBrief or an Episode                 |
| `UserProgress`          | Episode completion (`(userId, episodeId)` unique)                                    |
| `UserActivity`          | Fire-and-forget activity log (listen, bookmark, complete_episode, view_path, search) |
| `AdminAuditLog`         | Audit trail for admin operations with before/after JSON snapshots                    |

**PostgreSQL extensions:** `pgvector` (semantic search), `uuid-ossp` (UUID generation).

## Development Workflow

**Implementation Planning is mandatory.** Before writing any code, produce a detailed plan listing every file, every function (with signature + purpose), and every test to be written. No implementation without a plan.

**Test-Driven Development is mandatory.** Write tests before writing implementation code — no exceptions.

1. Write a failing test that describes the behaviour
2. Write the minimum implementation to make it pass
3. Refactor with tests green

- **Testing stack**: Vitest + RTL (unit/integration) → Playwright (E2E)
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`, `security:`
- Husky v9 + lint-staged pre-commit hooks (ESLint + Prettier on staged files)
- Docker Compose for local dev: PostgreSQL 16 (pgvector), Azurite (Azure Blob Storage)
- Branch naming: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`, etc. See `CONTRIBUTING.md`.

## Local Dev Setup

```bash
git clone <repo-url> the-audit-brief
cd the-audit-brief
npm install                   # Husky v9 prepare script auto-installs git hooks
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, AZURE_BLOB_CONNECTION_STRING, etc.
docker compose up -d          # Start PostgreSQL + Azurite
npx prisma migrate dev        # Apply database migrations
npm run db:seed               # Seed initial data (runs prisma/seed.ts)
npm run dev                   # Start Next.js dev server at http://localhost:3000/auditbrief
```

## Environment Variables

| Variable                            | Description                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                      | PostgreSQL connection string                                                   |
| `NEXTAUTH_SECRET`                   | NextAuth JWT encryption secret (min 32 chars)                                  |
| `NEXTAUTH_URL`                      | Canonical app URL (**must include the `/auditbrief` basePath**)                |
| `NEXT_PUBLIC_APP_URL`               | Origin only (no basePath) — used for CORS                                      |
| `NEXT_PUBLIC_BASE_PATH`             | Deployment subpath (default `/auditbrief`)                                     |
| `PORT`                              | Server listen port (prod: `3103`)                                              |
| `AZURE_BLOB_CONNECTION_STRING`      | Azure Blob Storage connection string                                           |
| `AZURE_BLOB_CONTAINER`              | Azure Blob container name (default `the-audit-brief-uploads`)                  |
| `AZURE_AD_CLIENT_ID`                | Entra ID app client ID (for SSO)                                               |
| `AZURE_AD_CLIENT_SECRET`            | Entra ID app client secret (for SSO)                                           |
| `AZURE_AD_TENANT_ID`                | Entra ID tenant ID (for SSO)                                                   |
| `AZURE_OPENAI_ENDPOINT`             | Azure OpenAI API endpoint                                                      |
| `AZURE_OPENAI_API_KEY`              | Azure OpenAI API key (read by `lib/embeddings.ts:33`)                          |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Embedding deployment name (read by `lib/embeddings.ts:34`)                     |
| `SENTRY_DSN`                        | Sentry DSN — **reserved; SDK not currently initialized**                       |
| `NEXT_PUBLIC_SENTRY_DSN`            | Sentry DSN (client bundle) — **reserved**                                      |
| `BCRYPT_SALT_ROUNDS`                | Bcrypt cost factor (default `12`; read by `lib/auth/password.ts`)              |
| `SLOW_QUERY_THRESHOLD_MS`           | Slow-query log threshold in ms (default `500`; `lib/db-instrumentation.ts:26`) |
| `NODE_ENV`                          | `development` / `production` / `test`                                          |
| `LOG_LEVEL`                         | Pino log level (default `info`)                                                |

> **Legacy names:** Bicep templates and earlier `.env` files emit `AZURE_OPENAI_KEY` / `AZURE_OPENAI_DEPLOYMENT`. The application code reads the new `_API_KEY` / `_EMBEDDING_DEPLOYMENT` names — keep `.env` in sync with the code.

## Deployment

- **Target:** Azure VM (Ubuntu 22.04 LTS) on port `3103`
- **Reverse Proxy:** Nginx (SSL termination, gzip, static caching)
- **Process Manager:** pm2 (auto-restart, log management; `ecosystem.config.js` is created on the VM, not committed — see `docs/deployment-guide.md` §8.2)
- **Database:** Azure Database for PostgreSQL Flexible Server (pgvector)
- **Storage:** Azure Blob Storage
- **Secrets:** Environment file on VM (or Azure Key Vault)
- **Monitoring:** Pino structured logs + pm2 logs (Sentry SDK not yet initialized)
- **Canonical guide:** `docs/deployment-guide.md`
- **CSP + nginx integration:** `docs/csp-nonce-nginx-integration-guide.md`

> The `.github/workflows/cd.yml` workflow targets Azure Container Apps and is **out of sync** with the canonical VM deployment. It remains as a reference for a possible future migration; do not enable its `push` trigger without updating image build, migrations strategy, and env-var wiring first.

## Code Rules

All code must follow these mandatory rules (see individual files for full details):

- [SOLID Principles](.claude/rules/solid-principles.md)
- [Naming Conventions](.claude/rules/naming-conventions.md)
- [README & Deployment Documentation](.claude/rules/readme-documentation.md)
- [Code Documentation](.claude/rules/code-documentation.md)
- [Project Structure](.claude/rules/project-structure.md)
- [Error Handling & Resilience](.claude/rules/error-handling.md)
- [Logging & Observability](.claude/rules/logging-observability.md)
- [Quick-Reference Checklist](.claude/rules/checklist.md)

Before submitting any code, verify against the [Quick-Reference Checklist](.claude/rules/checklist.md).

## Repository Conventions

- **`application-links.md`** is the auditable index of every page route, API endpoint, navigation entry, programmatic redirect, env var, and external URL — keep it in sync when adding routes.
- **`docs/architecture-diagrams.md`** holds top-level system diagrams; **`docs/architecture/`** has C4-style `.mmd` source files plus a README.
- **`docs/openapi.{json,yaml}`** are the API spec — regenerate the YAML from JSON via `node scripts/regenerate-openapi-yaml.mjs` after editing the JSON.
- **`docs/superpowers/{plans,specs}/`** and **`.claude/projects/`** contain historical planning artefacts. Treat as a record, not authoritative.
- **`.claude/rules/`** is the only authoritative source for coding standards; never duplicate rule content inline.
