# CLAUDE.md

## Project Overview

- **Podcast Hub v2** — Internal enterprise web application
- Audio podcast platform with transcripts, bookmarks, learning paths, AI-powered semantic search
- Complete rebuild with enterprise-grade architecture, TDD, CI/CD, and security
- Serves audit professionals accessing "bulletins" (audio content) covering technical topics across audit domains

## Tech Stack

| Layer               | Technology                                 | Version | Notes                                                |
| ------------------- | ------------------------------------------ | ------- | ---------------------------------------------------- |
| **Framework**       | Next.js (App Router)                       | 16.x    | Server Components, API routes, middleware, streaming |
| **Language**        | TypeScript                                 | 5.x     | Strict mode (`strict: true`), no `any` types         |
| **Runtime**         | Node.js                                    | 20 LTS  | Native ESM                                           |
| **Database**        | PostgreSQL + Prisma ORM                    | 16.x    | pgvector extension for vector search                 |
| **Auth**            | Custom JWT                                 | —       | bcrypt + jsonwebtoken, HttpOnly cookies              |
| **UI**              | React 19 + shadcn/ui (Radix)               | Latest  | Accessible, composable components                    |
| **Styling**         | Tailwind CSS                               | 4.x     | Utility-first, design system tokens                  |
| **State**           | Zustand                                    | Latest  | Lightweight state management (PlayerContext, etc.)   |
| **File Storage**    | Azurite (dev) → Azure Blob Storage (prod)  | —       | Azure Blob Storage object storage                    |
| **Audio Streaming** | FFmpeg (HLS transcoding) + HLS.js (client) | —       | Adaptive bitrate streaming                           |
| **Vector Search**   | pgvector (PostgreSQL extension)            | —       | Via Prisma raw queries                               |
| **Embeddings**      | Azure OpenAI                               | —       | text-embedding-3-large model                         |
| **Icons**           | Lucide React                               | Latest  | Consistent icon set                                  |
| **Fonts**           | Geist                                      | —       | Body font via next/font                              |

## Key Libraries

| Category        | Library                           | Purpose                           |
| --------------- | --------------------------------- | --------------------------------- |
| **Forms**       | React Hook Form + Zod             | Form state + runtime validation   |
| **Charts**      | Recharts                          | Analytics visualizations          |
| **PDF**         | react-pdf                         | In-app bulletin viewer            |
| **Drag & Drop** | @dnd-kit                          | Sortable lists (podcast ordering) |
| **Graph Viz**   | @xyflow/react + Dagre             | Learning path graph rendering     |
| **Toast**       | Sonner                            | Notifications                     |
| **Theming**     | next-themes                       | Dark/light mode                   |
| **Logging**     | Pino                              | Structured JSON logging           |
| **Monitoring**  | Sentry                            | Error tracking + performance      |
| **Testing**     | Vitest + RTL + Playwright         | Unit/integration/E2E              |
| **Linting**     | ESLint 9 (flat config) + Prettier | Code quality                      |
| **Git Hooks**   | Husky + lint-staged               | Pre-commit checks                 |

## Styling Rules

- shadcn/ui is the primary component library — use it before building custom components
- Tailwind utility classes only, no inline styles
- `cn()` utility (from `lib/utils.ts`) for conditional class merging
- next-themes for dark/light mode support
- No CSS modules or styled-components

## Architecture

```
podcast-hub-v2/
├── .github/workflows/           # CI/CD (ci.yml, cd.yml, e2e.yml)
├── .husky/                      # Git hooks (pre-commit)
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Prisma migrations
├── app/
│   ├── layout.tsx               # Root layout (providers, fonts, error boundary)
│   ├── (auth)/                  # Login, callback, unauthorized
│   ├── (public)/                # Home, bulletins, podcast, learning paths, search, profile
│   ├── (admin)/                 # Admin dashboard, upload, edit, users, analytics
│   └── api/                     # API routes (podcasts, learning-graphs, bookmarks, etc.)
├── components/
│   ├── ui/                      # shadcn base components
│   ├── audio-player/            # Player, transcript, bulletin viewer
│   ├── admin/                   # Admin-specific components
│   ├── learning-path/           # Path viewer, graph renderer
│   ├── library/                 # Podcast cards, grid
│   └── error-boundary.tsx       # React error boundary wrapper
├── lib/
│   ├── prisma.ts                # Prisma client singleton
│   ├── auth/                    # JWT utilities, session management, middleware helpers
│   ├── api/                     # error-response.ts, pagination.ts, rate-limit.ts
│   ├── schemas/                 # Zod schemas per entity
│   ├── logger.ts                # Pino structured logger
│   ├── embeddings.ts            # Azure OpenAI embedding generation
│   ├── storage.ts               # File upload utilities (Azure Blob Storage)
│   └── utils.ts                 # General utilities (cn(), etc.)
├── hooks/                       # Custom React hooks
├── stores/                      # Zustand stores
├── middleware.ts                 # Auth + admin route protection (JWT verification)
├── __tests__/
│   ├── unit/                    # Pure function tests (lib/, schemas/)
│   ├── integration/             # API route + component tests (RTL + MSW)
│   └── e2e/                     # Playwright browser tests
├── Dockerfile
├── docker-compose.yml           # Local dev: PostgreSQL + Azurite containers
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

## Key Architecture Patterns

- **Server Components by default** — pages fetch data server-side; only interactive parts are Client Components
- **Route groups:** `(auth)`, `(public)`, `(admin)` for layout and middleware isolation
- **Centralized Zod validation** in `lib/schemas/`, shared between client forms and API routes
- **Error boundary hierarchy** — React ErrorBoundary in root layout + `error.tsx` per route group
- **Defense in depth:** Middleware (JWT verify) → API auth check → Prisma-level checks (3 layers)
- **PlayerContext (Zustand)** for audio state shared across components
- **Service layer separation** — API routes handle HTTP concerns; business logic in `lib/`

## Audio Pipeline

```
Upload → FFmpeg HLS transcoding → Azure Blob Storage → HLS.js adaptive playback
```

## Auth Flow

```
User visits protected route
  → Middleware verifies JWT from HttpOnly cookie
  → No valid JWT → Redirect to /login?redirectTo=<original-path>
  → User authenticates (email + password)
  → Server validates credentials (bcrypt), issues JWT + refresh token (HttpOnly cookies)
  → Redirect to original path
```

## Database Access

- **Prisma ORM** for all standard queries (type-safe, auto-generated client)
- **Prisma raw queries** (`$queryRaw`) for pgvector similarity search
- **Prisma client singleton** in `lib/prisma.ts` (prevents connection exhaustion in dev)
- **Prisma migrations** for schema changes (`npx prisma migrate dev`)

## Development Workflow

**Implementation Planning is mandatory.** Before writing any code, produce a detailed plan listing every file, every function (with signature + purpose), and every test to be written. No implementation without a plan.

**Test-Driven Development is mandatory.** Write tests before writing implementation code — no exceptions.

1. Write a failing test that describes the behaviour
2. Write the minimum implementation to make it pass
3. Refactor with tests green

- **Testing stack**: Vitest + RTL (unit/integration) → Playwright (E2E)
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Husky + lint-staged pre-commit hooks (ESLint + Prettier + type check)
- Docker Compose for local dev: PostgreSQL 16, Azurite (Azure Blob Storage)
- Branch naming: `feat/FR-USER-002-audio-player`, `fix/BUG-001-playback-issue`

## Local Dev Setup

```bash
git clone <repo-url> podcast-hub-v2
cd podcast-hub-v2
npm install
cp .env.example .env.local
# Fill in DATABASE_URL, JWT_SECRET, AZURE_BLOB_CONNECTION_STRING, AZURE_OPENAI_KEY, etc.
docker compose up -d          # Start PostgreSQL + Azurite
npx prisma migrate dev        # Apply database migrations
npx prisma db seed            # Seed initial data (if available)
npx husky install             # Set up git hooks
npm run dev                   # Start Next.js dev server
```

## Environment Variables

| Variable                       | Description                          |
| ------------------------------ | ------------------------------------ |
| `DATABASE_URL`                 | PostgreSQL connection string         |
| `JWT_SECRET`                   | Secret key for JWT signing           |
| `JWT_REFRESH_SECRET`           | Secret key for refresh token signing |
| `AZURE_BLOB_CONNECTION_STRING` | Azure Blob Storage connection string |
| `AZURE_BLOB_CONTAINER`         | Azure Blob container name            |
| `AZURE_OPENAI_ENDPOINT`        | Azure OpenAI API endpoint            |
| `AZURE_OPENAI_KEY`             | Azure OpenAI API key                 |
| `AZURE_OPENAI_DEPLOYMENT`      | Azure OpenAI deployment name         |
| `SENTRY_DSN`                   | Sentry error tracking DSN            |
| `NEXT_PUBLIC_APP_URL`          | Public app URL                       |
| `LOG_LEVEL`                    | Pino log level (default: `info`)     |

## Deployment

- **Target:** Azure Container Apps (each service containerized separately)
- **Container Registry:** Azure Container Registry
- **Secrets:** Azure Key Vault + GitHub Secrets
- **CDN:** Azure Front Door
- **DNS:** Azure DNS
- **Monitoring:** Sentry + Azure Monitor

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
