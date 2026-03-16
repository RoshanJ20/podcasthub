# Stage 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js project with enterprise tooling, database, auth, and testing infrastructure.

**Architecture:** Next.js 16 App Router with PostgreSQL 16 + Prisma. Custom JWT auth with bcrypt. Docker Compose for local dev. Vitest for unit/integration tests, Playwright for E2E.

**Tech Stack:** Next.js 16, TypeScript 5 (strict), PostgreSQL 16, Prisma, Tailwind 4, shadcn/ui, Vitest, Playwright, Pino, Sentry, ESLint 9, Prettier, Husky.

---

## Task Overview

| #   | Task                           | Type  | Est.   |
| --- | ------------------------------ | ----- | ------ |
| 1   | Project scaffold               | Setup | 10 min |
| 2   | Code quality tooling           | Setup | 10 min |
| 3   | Docker Compose + .env          | Setup | 5 min  |
| 4   | Testing infrastructure         | Setup | 10 min |
| 5   | Utility foundation             | Setup | 5 min  |
| 6   | Prisma schema + DB setup       | Setup | 15 min |
| 7   | API error handling             | TDD   | 10 min |
| 8   | Pagination utility             | TDD   | 10 min |
| 9   | Zod schemas                    | TDD   | 15 min |
| 10  | JWT auth utilities             | TDD   | 15 min |
| 11  | Auth middleware                | TDD   | 10 min |
| 12  | Auth API routes + login page   | TDD   | 15 min |
| 13  | Root layout + error boundaries | Setup | 10 min |
| 14  | Health check endpoint          | TDD   | 5 min  |
| 15  | CI pipeline                    | Setup | 10 min |
| 16  | Sentry setup                   | Setup | 5 min  |
| 17  | Rate limiting                  | TDD   | 10 min |

---

### Task 1: Project Scaffold

**Files:**

- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Create Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
```

- [ ] **Step 2: Verify TypeScript strict mode in `tsconfig.json`**

Ensure `tsconfig.json` contains:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Update `next.config.ts`**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/thumbnails/**',
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Install core dependencies**

```bash
npm install pino pino-pretty zod zustand @prisma/client sonner next-themes
npm install -D prisma @types/node
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
# Visit http://localhost:3000 — should show Next.js default page
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: scaffold Next.js 16 project with TypeScript strict mode"
```

---

### Task 2: Code Quality Tooling (ESLint 9, Prettier, Husky, lint-staged)

**Files:**

- Create: `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.lintstagedrc.js`

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D prettier eslint-config-prettier eslint-plugin-import husky lint-staged
```

- [ ] **Step 2: Create ESLint 9 flat config**

Create `eslint.config.mjs`:

```javascript
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    ignores: ['.next/', 'node_modules/', 'coverage/', 'playwright-report/'],
  },
];

export default eslintConfig;
```

- [ ] **Step 3: Create Prettier config**

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Create `.prettierignore`:

```
.next
node_modules
coverage
playwright-report
pnpm-lock.yaml
package-lock.json
prisma/migrations
```

- [ ] **Step 4: Setup Husky + lint-staged**

```bash
npx husky init
```

Create `.lintstagedrc.js`:

```javascript
export default {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
```

Update `.husky/pre-commit`:

```bash
npx lint-staged
```

- [ ] **Step 5: Add scripts to `package.json`**

Add to the `"scripts"` section:

```json
{
  "lint": "next lint",
  "lint:fix": "next lint --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 6: Run lint + format to verify**

```bash
npm run lint
npm run format:check
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add ESLint 9, Prettier, Husky, lint-staged"
```

---

### Task 3: Docker Compose + Environment Setup

**Files:**

- Create: `docker-compose.yml`, `.env.local`, `.env.example`

- [ ] **Step 1: Create Docker Compose file**

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: podcasthub-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: podcasthub
      POSTGRES_PASSWORD: podcasthub_dev
      POSTGRES_DB: podcasthub
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    container_name: podcasthub-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

- [ ] **Step 2: Create environment files**

Create `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://podcasthub:podcasthub_dev@localhost:5432/podcasthub"

# Auth
JWT_ACCESS_SECRET="change-me-access-secret-min-32-chars!!"
JWT_REFRESH_SECRET="change-me-refresh-secret-min-32-chars!!"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
BCRYPT_SALT_ROUNDS=12

# MinIO / S3
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_AUDIO="audio"
S3_BUCKET_THUMBNAILS="thumbnails"
S3_BUCKET_BULLETINS="bulletins"

# Sentry
SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_DSN=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
LOG_LEVEL="debug"
```

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

- [ ] **Step 3: Add Docker entries to `.gitignore`**

Append to `.gitignore`:

```
# Environment
.env.local
.env.production

# Docker volumes
postgres_data/
minio_data/
```

- [ ] **Step 4: Start Docker services and verify**

```bash
docker compose up -d
docker compose ps
# Both services should show "running"
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "feat: add Docker Compose for PostgreSQL 16 + MinIO"
```

---

### Task 4: Testing Infrastructure (Vitest + Playwright)

**Files:**

- Create: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `__tests__/unit/.gitkeep`, `__tests__/e2e/.gitkeep`

- [ ] **Step 1: Install testing dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
npx playwright install --with-deps chromium
npm install -D @playwright/test
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**', 'components/**', 'app/api/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

- [ ] **Step 3: Create Vitest setup file**

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 5: Create test directory structure**

```bash
mkdir -p __tests__/unit/lib __tests__/unit/components __tests__/unit/api __tests__/e2e
touch __tests__/unit/.gitkeep __tests__/e2e/.gitkeep
```

- [ ] **Step 6: Add test scripts to `package.json`**

Add to `"scripts"`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

- [ ] **Step 7: Verify Vitest runs (no tests yet, should exit cleanly)**

```bash
npm run test
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: add Vitest + Playwright testing infrastructure"
```

---

### Task 5: Utility Foundation (cn, logger)

**Files:**

- Create: `lib/utils.ts`, `lib/logger.ts`

- [ ] **Step 1: Install clsx and tailwind-merge**

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 2: Create `lib/utils.ts`**

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `lib/logger.ts`**

```typescript
// lib/logger.ts
import pino from 'pino';

const isServer = typeof window === 'undefined';
const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev && isServer
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:HH:MM:ss',
          },
        },
      }
    : {}),
  base: {
    env: process.env.NODE_ENV,
  },
});

export function createLogger(context: string) {
  return logger.child({ context });
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/utils.ts lib/logger.ts
git commit -m "feat: add cn() utility and Pino structured logger"
```

---

### Task 6: Prisma Schema + Database Setup

**Files:**

- Create: `prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: Write the full Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), uuidOssp(map: "uuid-ossp")]
}

model User {
  id            String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  email         String   @unique
  passwordHash  String   @map("password_hash")
  displayName   String?  @map("display_name")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  role          UserRole?
  bookmarks     Bookmark[]
  progress      UserProgress[]
  activity      UserActivity[]
  learningGraphs LearningGraph[] @relation("CreatedBy")

  @@map("users")
}

model Podcast {
  id            String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title         String
  description   String
  domain        String
  year          Int
  tags          String[] @default([])
  thumbnailUrl  String   @map("thumbnail_url")
  audioShortUrl String   @map("audio_short_url")
  audioLongUrl  String?  @map("audio_long_url")
  bulletinUrls  String[] @default([]) @map("bulletin_urls")
  sortOrder     Int      @default(0) @map("sort_order")
  isArchived    Boolean  @default(false) @map("is_archived")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  transcripts   Transcript[]
  bookmarks     Bookmark[]
  activity      UserActivity[] @relation("ActivityPodcast")

  @@map("podcasts")
}

model Transcript {
  id              String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  podcastId       String   @map("podcast_id") @db.Uuid
  fullText        String   @map("full_text")
  segments        Json     @default("[]")
  embedding       Unsupported("vector(1536)")?
  transcriptType  String   @default("short") @map("transcript_type")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  podcast         Podcast  @relation(fields: [podcastId], references: [id], onDelete: Cascade)

  @@unique([podcastId, transcriptType])
  @@map("transcripts")
}

model LearningGraph {
  id            String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title         String
  description   String?
  domain        String
  pathType      String   @default("linear") @map("path_type")
  thumbnailUrl  String?  @map("thumbnail_url")
  isPublished   Boolean  @default(false) @map("is_published")
  createdBy     String?  @map("created_by") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  creator       User?    @relation("CreatedBy", fields: [createdBy], references: [id])
  episodes      Episode[]
  edges         LearningPathEdge[]
  progress      UserProgress[]
  activity      UserActivity[] @relation("ActivityGraph")

  @@map("learning_graphs")
}

model Episode {
  id            String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  graphId       String   @map("graph_id") @db.Uuid
  title         String
  description   String?
  audioUrl      String   @map("audio_url")
  transcript    Json     @default("[]")
  positionX     Float    @default(0) @map("position_x") @db.Real
  positionY     Float    @default(0) @map("position_y") @db.Real
  nodeType      String   @default("default") @map("node_type")
  sortOrder     Int      @default(0) @map("sort_order")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  graph         LearningGraph @relation(fields: [graphId], references: [id], onDelete: Cascade)
  sourceEdges   LearningPathEdge[] @relation("SourceEpisode")
  targetEdges   LearningPathEdge[] @relation("TargetEpisode")
  progress      UserProgress[]
  activity      UserActivity[] @relation("ActivityEpisode")

  @@index([graphId])
  @@map("episodes")
}

model LearningPathEdge {
  id              String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  graphId         String   @map("graph_id") @db.Uuid
  sourceEpisodeId String   @map("source_episode_id") @db.Uuid
  targetEpisodeId String   @map("target_episode_id") @db.Uuid
  label           String?
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  graph           LearningGraph @relation(fields: [graphId], references: [id], onDelete: Cascade)
  sourceEpisode   Episode       @relation("SourceEpisode", fields: [sourceEpisodeId], references: [id], onDelete: Cascade)
  targetEpisode   Episode       @relation("TargetEpisode", fields: [targetEpisodeId], references: [id], onDelete: Cascade)

  @@index([graphId])
  @@map("learning_path_edges")
}

model Bookmark {
  id                String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  podcastId         String   @map("podcast_id") @db.Uuid
  timestampSeconds  Float    @map("timestamp_seconds") @db.Real
  note              String?
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  podcast           Podcast  @relation(fields: [podcastId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([podcastId])
  @@map("bookmarks")
}

model UserRole {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId    String   @unique @map("user_id") @db.Uuid
  role      String   @default("public")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_roles")
}

model UserProgress {
  id          String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  graphId     String   @map("graph_id") @db.Uuid
  episodeId   String   @map("episode_id") @db.Uuid
  completedAt DateTime @default(now()) @map("completed_at") @db.Timestamptz

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  graph       LearningGraph @relation(fields: [graphId], references: [id], onDelete: Cascade)
  episode     Episode       @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@unique([userId, episodeId])
  @@index([userId])
  @@index([graphId])
  @@map("user_progress")
}

model UserActivity {
  id            String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  activityType  String   @map("activity_type")
  podcastId     String?  @map("podcast_id") @db.Uuid
  episodeId     String?  @map("episode_id") @db.Uuid
  graphId       String?  @map("graph_id") @db.Uuid
  metadata      Json     @default("{}")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  podcast       Podcast?       @relation("ActivityPodcast", fields: [podcastId], references: [id], onDelete: SetNull)
  episode       Episode?       @relation("ActivityEpisode", fields: [episodeId], references: [id], onDelete: SetNull)
  graph         LearningGraph? @relation("ActivityGraph", fields: [graphId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([activityType])
  @@index([createdAt])
  @@map("user_activity")
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `lib/db.ts`:

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Generate Prisma client and run initial migration**

```bash
# Make sure Docker postgres is running
docker compose up -d postgres
npx prisma generate
npx prisma migrate dev --name init
```

- [ ] **Step 5: Verify migration**

```bash
npx prisma studio
# Should open browser showing all tables
```

- [ ] **Step 6: Commit**

```bash
git add prisma/ lib/db.ts
git commit -m "feat: add Prisma schema with all models and initial migration"
```

---

### Task 7: API Error Handling (TDD)

**Files:**

- Create: `lib/api/errors.ts`
- Test: `__tests__/unit/lib/api/errors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/lib/api/errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  ApiError,
  ErrorCode,
  createErrorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  validationFailed,
  rateLimited,
  internalError,
} from '@/lib/api/errors';

describe('ApiError', () => {
  it('creates an ApiError with correct properties', () => {
    const error = new ApiError(400, ErrorCode.VALIDATION_FAILED, 'Bad input');
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(400);
    expect(error.errorCode).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('Bad input');
    expect(error.details).toBeUndefined();
  });

  it('creates an ApiError with details', () => {
    const details = { email: ['Email is required'] };
    const error = new ApiError(400, ErrorCode.VALIDATION_FAILED, 'Validation failed', details);
    expect(error.details).toEqual(details);
  });
});

describe('createErrorResponse', () => {
  it('returns a NextResponse with correct JSON body and status', async () => {
    const error = new ApiError(404, ErrorCode.NOT_FOUND, 'Not found');
    const response = createErrorResponse(error);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      status: 404,
      error_code: 'NOT_FOUND',
      message: 'Not found',
    });
  });

  it('includes details when present', async () => {
    const error = new ApiError(400, ErrorCode.VALIDATION_FAILED, 'Bad', {
      name: ['Required'],
    });
    const response = createErrorResponse(error);
    const body = await response.json();
    expect(body.details).toEqual({ name: ['Required'] });
  });

  it('includes request_id when provided', async () => {
    const error = new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Oops');
    const response = createErrorResponse(error, 'req-123');
    const body = await response.json();
    expect(body.request_id).toBe('req-123');
  });
});

describe('error factory functions', () => {
  it('badRequest returns 400', () => {
    const err = badRequest('bad');
    expect(err.status).toBe(400);
    expect(err.errorCode).toBe('VALIDATION_FAILED');
  });

  it('unauthorized returns 401', () => {
    const err = unauthorized();
    expect(err.status).toBe(401);
    expect(err.errorCode).toBe('UNAUTHORIZED');
  });

  it('forbidden returns 403', () => {
    const err = forbidden();
    expect(err.status).toBe(403);
    expect(err.errorCode).toBe('FORBIDDEN');
  });

  it('notFound returns 404', () => {
    const err = notFound('Podcast');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Podcast not found');
  });

  it('validationFailed returns 400 with details', () => {
    const err = validationFailed({ email: ['Invalid'] });
    expect(err.status).toBe(400);
    expect(err.details).toEqual({ email: ['Invalid'] });
  });

  it('rateLimited returns 429', () => {
    const err = rateLimited();
    expect(err.status).toBe(429);
    expect(err.errorCode).toBe('RATE_LIMITED');
  });

  it('internalError returns 500', () => {
    const err = internalError();
    expect(err.status).toBe(500);
    expect(err.errorCode).toBe('INTERNAL_ERROR');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/lib/api/errors.test.ts
```

Expected: FAIL — module `@/lib/api/errors` not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/api/errors.ts`:

```typescript
// lib/api/errors.ts
import { NextResponse } from 'next/server';

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiErrorResponse {
  status: number;
  error_code: string;
  message: string;
  details?: Record<string, string[]>;
  request_id?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: ErrorCode,
    message: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createErrorResponse(error: ApiError, requestId?: string): NextResponse {
  const body: ApiErrorResponse = {
    status: error.status,
    error_code: error.errorCode,
    message: error.message,
  };

  if (error.details) {
    body.details = error.details;
  }

  if (requestId) {
    body.request_id = requestId;
  }

  return NextResponse.json(body, { status: error.status });
}

// Factory functions
export function badRequest(message: string, details?: Record<string, string[]>): ApiError {
  return new ApiError(400, ErrorCode.VALIDATION_FAILED, message, details);
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError(401, ErrorCode.UNAUTHORIZED, message);
}

export function forbidden(message = 'Forbidden'): ApiError {
  return new ApiError(403, ErrorCode.FORBIDDEN, message);
}

export function notFound(resource: string): ApiError {
  return new ApiError(404, ErrorCode.NOT_FOUND, `${resource} not found`);
}

export function validationFailed(details: Record<string, string[]>): ApiError {
  return new ApiError(400, ErrorCode.VALIDATION_FAILED, 'Validation failed', details);
}

export function rateLimited(message = 'Too many requests'): ApiError {
  return new ApiError(429, ErrorCode.RATE_LIMITED, message);
}

export function internalError(message = 'Internal server error'): ApiError {
  return new ApiError(500, ErrorCode.INTERNAL_ERROR, message);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/api/errors.test.ts
```

Expected: PASS — all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/api/errors.ts __tests__/unit/lib/api/errors.test.ts
git commit -m "feat: add API error handling utilities with TDD"
```

---

### Task 8: Pagination Utility (TDD)

**Files:**

- Create: `lib/api/pagination.ts`
- Test: `__tests__/unit/lib/api/pagination.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/lib/api/pagination.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  createPaginatedResponse,
  type PaginatedResponse,
} from '@/lib/api/pagination';

describe('parsePaginationParams', () => {
  it('returns defaults when no params provided', () => {
    const url = new URL('http://localhost/api/podcasts');
    const result = parsePaginationParams(url);
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('parses page and limit from URL params', () => {
    const url = new URL('http://localhost/api/podcasts?page=3&limit=10');
    const result = parsePaginationParams(url);
    expect(result).toEqual({ page: 3, limit: 10 });
  });

  it('clamps page to minimum 1', () => {
    const url = new URL('http://localhost/api/podcasts?page=-5');
    const result = parsePaginationParams(url);
    expect(result.page).toBe(1);
  });

  it('clamps limit to range 1-100', () => {
    const url = new URL('http://localhost/api/podcasts?limit=500');
    const result = parsePaginationParams(url);
    expect(result.limit).toBe(100);
  });

  it('handles non-numeric values gracefully', () => {
    const url = new URL('http://localhost/api/podcasts?page=abc&limit=xyz');
    const result = parsePaginationParams(url);
    expect(result).toEqual({ page: 1, limit: 20 });
  });
});

describe('createPaginatedResponse', () => {
  it('creates a paginated response with correct metadata', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const result: PaginatedResponse<{ id: string }> = createPaginatedResponse(items, {
      page: 1,
      limit: 10,
      total: 25,
    });

    expect(result).toEqual({
      data: items,
      pagination: {
        page: 1,
        limit: 10,
        total: 25,
        total_pages: 3,
      },
    });
  });

  it('calculates total_pages correctly for exact division', () => {
    const result = createPaginatedResponse([], { page: 1, limit: 10, total: 20 });
    expect(result.pagination.total_pages).toBe(2);
  });

  it('returns 0 total_pages when total is 0', () => {
    const result = createPaginatedResponse([], { page: 1, limit: 10, total: 0 });
    expect(result.pagination.total_pages).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/lib/api/pagination.test.ts
```

Expected: FAIL — module `@/lib/api/pagination` not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/api/pagination.ts`:

```typescript
// lib/api/pagination.ts

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePaginationParams(url: URL): PaginationParams {
  const rawPage = parseInt(url.searchParams.get('page') || '', 10);
  const rawLimit = parseInt(url.searchParams.get('limit') || '', 10);

  const page = Number.isNaN(rawPage) ? DEFAULT_PAGE : Math.max(1, rawPage);
  const limit = Number.isNaN(rawLimit) ? DEFAULT_LIMIT : Math.min(MAX_LIMIT, Math.max(1, rawLimit));

  return { page, limit };
}

export function createPaginatedResponse<T>(
  data: T[],
  params: { page: number; limit: number; total: number }
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total: params.total,
      total_pages: params.total === 0 ? 0 : Math.ceil(params.total / params.limit),
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/api/pagination.test.ts
```

Expected: PASS — all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/api/pagination.ts __tests__/unit/lib/api/pagination.test.ts
git commit -m "feat: add pagination utility with TDD"
```

---

### Task 9: Zod Schemas (TDD)

**Files:**

- Create: `lib/schemas/common.ts`, `lib/schemas/user.ts`, `lib/schemas/podcast.ts`, `lib/schemas/learning-graph.ts`, `lib/schemas/bookmark.ts`
- Test: `__tests__/unit/lib/schemas/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/lib/schemas/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { uuidSchema, domainSchema, paginationQuerySchema, DOMAINS } from '@/lib/schemas/common';
import {
  createUserSchema,
  loginSchema,
  updateUserSchema,
  userResponseSchema,
} from '@/lib/schemas/user';
import {
  createPodcastSchema,
  updatePodcastSchema,
  podcastResponseSchema,
} from '@/lib/schemas/podcast';
import {
  createLearningGraphSchema,
  learningGraphResponseSchema,
  createEpisodeSchema,
  createEdgeSchema,
} from '@/lib/schemas/learning-graph';
import {
  createBookmarkSchema,
  updateBookmarkSchema,
  bookmarkResponseSchema,
} from '@/lib/schemas/bookmark';

describe('common schemas', () => {
  it('uuidSchema accepts valid UUID', () => {
    const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('uuidSchema rejects invalid UUID', () => {
    const result = uuidSchema.safeParse('not-a-uuid');
    expect(result.success).toBe(false);
  });

  it('domainSchema accepts valid domain', () => {
    const result = domainSchema.safeParse('Audit Methodology');
    expect(result.success).toBe(true);
  });

  it('domainSchema rejects invalid domain', () => {
    const result = domainSchema.safeParse('Invalid Domain');
    expect(result.success).toBe(false);
  });

  it('DOMAINS contains all 6 domains', () => {
    expect(DOMAINS).toHaveLength(6);
  });

  it('paginationQuerySchema provides defaults', () => {
    const result = paginationQuerySchema.parse({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });
});

describe('user schemas', () => {
  it('createUserSchema validates correct input', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      password: 'SecureP@ss1',
      displayName: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('createUserSchema rejects short password', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      password: '123',
    });
    expect(result.success).toBe(false);
  });

  it('createUserSchema rejects invalid email', () => {
    const result = createUserSchema.safeParse({
      email: 'not-email',
      password: 'SecureP@ss1',
    });
    expect(result.success).toBe(false);
  });

  it('loginSchema validates correct input', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'SecureP@ss1',
    });
    expect(result.success).toBe(true);
  });

  it('updateUserSchema allows partial updates', () => {
    const result = updateUserSchema.safeParse({ displayName: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('userResponseSchema validates response shape', () => {
    const result = userResponseSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      displayName: 'Test',
      role: 'public',
      createdAt: '2024-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('podcast schemas', () => {
  const validPodcast = {
    title: 'Test Podcast',
    description: 'A test podcast',
    domain: 'Audit Methodology',
    year: 2025,
    thumbnailUrl: 'https://example.com/thumb.jpg',
    audioShortUrl: 'https://example.com/short.mp3',
  };

  it('createPodcastSchema validates correct input', () => {
    const result = createPodcastSchema.safeParse(validPodcast);
    expect(result.success).toBe(true);
  });

  it('createPodcastSchema rejects missing required fields', () => {
    const result = createPodcastSchema.safeParse({ title: 'Only title' });
    expect(result.success).toBe(false);
  });

  it('createPodcastSchema rejects year out of range', () => {
    const result = createPodcastSchema.safeParse({ ...validPodcast, year: 2019 });
    expect(result.success).toBe(false);
  });

  it('updatePodcastSchema allows partial updates', () => {
    const result = updatePodcastSchema.safeParse({ title: 'New title' });
    expect(result.success).toBe(true);
  });

  it('podcastResponseSchema validates response shape', () => {
    const result = podcastResponseSchema.safeParse({
      ...validPodcast,
      id: '550e8400-e29b-41d4-a716-446655440000',
      tags: [],
      bulletinUrls: [],
      sortOrder: 0,
      isArchived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('learning graph schemas', () => {
  it('createLearningGraphSchema validates correct input', () => {
    const result = createLearningGraphSchema.safeParse({
      title: 'Test Path',
      domain: 'LEAP',
      pathType: 'linear',
    });
    expect(result.success).toBe(true);
  });

  it('createLearningGraphSchema rejects invalid pathType', () => {
    const result = createLearningGraphSchema.safeParse({
      title: 'Test',
      domain: 'LEAP',
      pathType: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('createEpisodeSchema validates correct input', () => {
    const result = createEpisodeSchema.safeParse({
      graphId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Episode 1',
      audioUrl: 'https://example.com/audio.mp3',
    });
    expect(result.success).toBe(true);
  });

  it('createEdgeSchema validates correct input', () => {
    const result = createEdgeSchema.safeParse({
      graphId: '550e8400-e29b-41d4-a716-446655440000',
      sourceEpisodeId: '550e8400-e29b-41d4-a716-446655440001',
      targetEpisodeId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.success).toBe(true);
  });
});

describe('bookmark schemas', () => {
  it('createBookmarkSchema validates correct input', () => {
    const result = createBookmarkSchema.safeParse({
      podcastId: '550e8400-e29b-41d4-a716-446655440000',
      timestampSeconds: 120.5,
      note: 'Important point',
    });
    expect(result.success).toBe(true);
  });

  it('createBookmarkSchema rejects negative timestamp', () => {
    const result = createBookmarkSchema.safeParse({
      podcastId: '550e8400-e29b-41d4-a716-446655440000',
      timestampSeconds: -1,
    });
    expect(result.success).toBe(false);
  });

  it('updateBookmarkSchema allows partial updates', () => {
    const result = updateBookmarkSchema.safeParse({ note: 'Updated note' });
    expect(result.success).toBe(true);
  });

  it('bookmarkResponseSchema validates response shape', () => {
    const result = bookmarkResponseSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      podcastId: '550e8400-e29b-41d4-a716-446655440002',
      timestampSeconds: 120.5,
      note: 'A note',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/lib/schemas/schemas.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Write implementations**

Create `lib/schemas/common.ts`:

```typescript
// lib/schemas/common.ts
import { z } from 'zod';

export const DOMAINS = [
  'Audit Methodology',
  'Accounting and Reporting',
  'Audit Technology',
  'Quality and Risk',
  'LEAP',
  'Auditing',
] as const;

export type Domain = (typeof DOMAINS)[number];

export const uuidSchema = z.string().uuid();

export const domainSchema = z.enum(DOMAINS);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortOrderSchema = z.coerce.number().int().min(0).default(0);

export const timestampSchema = z.string().datetime();
```

Create `lib/schemas/user.ts`:

```typescript
// lib/schemas/user.ts
import { z } from 'zod';
import { uuidSchema } from './common';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z
  .object({
    displayName: z.string().min(1).max(100).optional(),
  })
  .strict();

export const userResponseSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  role: z.enum(['public', 'admin', 'superadmin']),
  createdAt: z.string(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

Create `lib/schemas/podcast.ts`:

```typescript
// lib/schemas/podcast.ts
import { z } from 'zod';
import { uuidSchema, domainSchema } from './common';

export const createPodcastSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  domain: domainSchema,
  year: z.number().int().min(2020).max(2099),
  tags: z.array(z.string()).default([]),
  thumbnailUrl: z.string().url('Invalid thumbnail URL'),
  audioShortUrl: z.string().url('Invalid audio URL'),
  audioLongUrl: z.string().url('Invalid audio URL').optional(),
  bulletinUrls: z.array(z.string().url()).default([]),
  sortOrder: z.number().int().min(0).default(0),
});

export const updatePodcastSchema = createPodcastSchema.partial();

export const podcastResponseSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string(),
  domain: domainSchema,
  year: z.number(),
  tags: z.array(z.string()),
  thumbnailUrl: z.string(),
  audioShortUrl: z.string(),
  audioLongUrl: z.string().nullable().optional(),
  bulletinUrls: z.array(z.string()),
  sortOrder: z.number(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreatePodcastInput = z.infer<typeof createPodcastSchema>;
export type UpdatePodcastInput = z.infer<typeof updatePodcastSchema>;
```

Create `lib/schemas/learning-graph.ts`:

```typescript
// lib/schemas/learning-graph.ts
import { z } from 'zod';
import { uuidSchema, domainSchema } from './common';

export const pathTypeSchema = z.enum(['linear', 'graph']);
export const nodeTypeSchema = z.enum(['start', 'default', 'milestone', 'end']);

export const createLearningGraphSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  domain: domainSchema,
  pathType: pathTypeSchema.default('linear'),
  thumbnailUrl: z.string().url().optional(),
  isPublished: z.boolean().default(false),
});

export const updateLearningGraphSchema = createLearningGraphSchema.partial();

export const learningGraphResponseSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable().optional(),
  domain: domainSchema,
  pathType: pathTypeSchema,
  thumbnailUrl: z.string().nullable().optional(),
  isPublished: z.boolean(),
  createdBy: uuidSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createEpisodeSchema = z.object({
  graphId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  audioUrl: z.string().url('Invalid audio URL'),
  transcript: z
    .array(
      z.object({
        start: z.number(),
        end: z.number(),
        text: z.string(),
      })
    )
    .default([]),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  nodeType: nodeTypeSchema.default('default'),
  sortOrder: z.number().int().min(0).default(0),
});

export const createEdgeSchema = z.object({
  graphId: uuidSchema,
  sourceEpisodeId: uuidSchema,
  targetEpisodeId: uuidSchema,
  label: z.string().optional(),
});

export type CreateLearningGraphInput = z.infer<typeof createLearningGraphSchema>;
export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>;
export type CreateEdgeInput = z.infer<typeof createEdgeSchema>;
```

Create `lib/schemas/bookmark.ts`:

```typescript
// lib/schemas/bookmark.ts
import { z } from 'zod';
import { uuidSchema } from './common';

export const createBookmarkSchema = z.object({
  podcastId: uuidSchema,
  timestampSeconds: z.number().min(0, 'Timestamp must be non-negative'),
  note: z.string().max(500).optional(),
});

export const updateBookmarkSchema = z
  .object({
    timestampSeconds: z.number().min(0).optional(),
    note: z.string().max(500).optional(),
  })
  .strict();

export const bookmarkResponseSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  podcastId: uuidSchema,
  timestampSeconds: z.number(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/schemas/schemas.test.ts
```

Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/ __tests__/unit/lib/schemas/
git commit -m "feat: add Zod validation schemas for all entities with TDD"
```

---

### Task 10: JWT Auth Utilities (TDD)

**Files:**

- Create: `lib/auth/jwt.ts`, `lib/auth/password.ts`, `lib/auth/session.ts`, `lib/auth/types.ts`
- Test: `__tests__/unit/lib/auth/jwt.test.ts`, `__tests__/unit/lib/auth/password.test.ts`, `__tests__/unit/lib/auth/session.test.ts`

- [ ] **Step 1: Install auth dependencies**

```bash
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

- [ ] **Step 2: Create auth types**

Create `lib/auth/types.ts`:

```typescript
// lib/auth/types.ts
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
```

- [ ] **Step 3: Write failing JWT tests**

Create `__tests__/unit/lib/auth/jwt.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '@/lib/auth/jwt';
import type { AuthUser } from '@/lib/auth/types';

// Mock environment variables
vi.stubEnv('JWT_ACCESS_SECRET', 'test-access-secret-that-is-long-enough-32chars!!');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-that-is-long-enough-32chars!');
vi.stubEnv('JWT_ACCESS_EXPIRY', '15m');
vi.stubEnv('JWT_REFRESH_EXPIRY', '7d');

const mockUser: AuthUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  role: 'public',
};

describe('JWT sign and verify', () => {
  it('signAccessToken returns a valid JWT string', () => {
    const token = signAccessToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyAccessToken decodes a valid access token', () => {
    const token = signAccessToken(mockUser);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(mockUser.id);
    expect(payload.email).toBe(mockUser.email);
    expect(payload.role).toBe(mockUser.role);
    expect(payload.type).toBe('access');
  });

  it('signRefreshToken returns a valid JWT string', () => {
    const token = signRefreshToken(mockUser);
    expect(typeof token).toBe('string');
  });

  it('verifyRefreshToken decodes a valid refresh token', () => {
    const token = signRefreshToken(mockUser);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(mockUser.id);
    expect(payload.type).toBe('refresh');
  });

  it('verifyAccessToken throws on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('verifyAccessToken throws on refresh token (wrong type)', () => {
    const refreshToken = signRefreshToken(mockUser);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });

  it('verifyRefreshToken throws on access token (wrong type)', () => {
    const accessToken = signAccessToken(mockUser);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});

describe('cookie helpers', () => {
  it('setAuthCookies sets both cookies on response', () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const mockCookieStore = {
      set: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
    };

    setAuthCookies(mockCookieStore as never, 'access-tok', 'refresh-tok');
    expect(cookies).toHaveLength(2);
    expect(cookies[0].name).toBe('access_token');
    expect(cookies[0].options.httpOnly).toBe(true);
    expect(cookies[0].options.secure).toBe(true);
    expect(cookies[0].options.sameSite).toBe('lax');
    expect(cookies[1].name).toBe('refresh_token');
  });

  it('clearAuthCookies deletes both cookies', () => {
    const deleted: string[] = [];
    const mockCookieStore = {
      delete: (name: string) => {
        deleted.push(name);
      },
    };

    clearAuthCookies(mockCookieStore as never);
    expect(deleted).toEqual(['access_token', 'refresh_token']);
  });
});
```

- [ ] **Step 4: Run JWT test to verify it fails**

```bash
npx vitest run __tests__/unit/lib/auth/jwt.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 5: Implement JWT utilities**

Create `lib/auth/jwt.ts`:

```typescript
// lib/auth/jwt.ts
import jwt from 'jsonwebtoken';
import type { JwtPayload, AuthUser } from './types';

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  return secret;
}

export function signAccessToken(user: AuthUser): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };

  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
}

export function signRefreshToken(user: AuthUser): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };

  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const payload = jwt.verify(token, getAccessSecret()) as JwtPayload;
  if (payload.type !== 'access') {
    throw new Error('Invalid token type: expected access token');
  }
  return payload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const payload = jwt.verify(token, getRefreshSecret()) as JwtPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token');
  }
  return payload;
}

export function setAuthCookies(
  cookieStore: { set: (name: string, value: string, options: Record<string, unknown>) => void },
  accessToken: string,
  refreshToken: string
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
    ...(isProduction && { domain: process.env.COOKIE_DOMAIN }),
  });

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    ...(isProduction && { domain: process.env.COOKIE_DOMAIN }),
  });
}

export function clearAuthCookies(cookieStore: { delete: (name: string) => void }): void {
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}
```

- [ ] **Step 6: Run JWT test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/auth/jwt.test.ts
```

Expected: PASS

- [ ] **Step 7: Write failing password tests**

Create `__tests__/unit/lib/auth/password.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '@/lib/auth/password';

describe('password utilities', () => {
  it('hashPassword returns a bcrypt hash', async () => {
    const hash = await hashPassword('TestPassword123');
    expect(hash).toBeTruthy();
    expect(hash).not.toBe('TestPassword123');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('comparePassword returns true for matching password', async () => {
    const hash = await hashPassword('TestPassword123');
    const result = await comparePassword('TestPassword123', hash);
    expect(result).toBe(true);
  });

  it('comparePassword returns false for non-matching password', async () => {
    const hash = await hashPassword('TestPassword123');
    const result = await comparePassword('WrongPassword', hash);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 8: Run password test to verify it fails**

```bash
npx vitest run __tests__/unit/lib/auth/password.test.ts
```

Expected: FAIL

- [ ] **Step 9: Implement password utilities**

Create `lib/auth/password.ts`:

```typescript
// lib/auth/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 10: Run password test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/auth/password.test.ts
```

Expected: PASS

- [ ] **Step 11: Write failing session tests**

Create `__tests__/unit/lib/auth/session.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createTokenPair, refreshTokenPair } from '@/lib/auth/session';
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth/jwt';
import type { AuthUser } from '@/lib/auth/types';

vi.stubEnv('JWT_ACCESS_SECRET', 'test-access-secret-that-is-long-enough-32chars!!');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-that-is-long-enough-32chars!');
vi.stubEnv('JWT_ACCESS_EXPIRY', '15m');
vi.stubEnv('JWT_REFRESH_EXPIRY', '7d');

const mockUser: AuthUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  role: 'admin',
};

describe('session management', () => {
  it('createTokenPair returns access and refresh tokens', () => {
    const pair = createTokenPair(mockUser);
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();

    const accessPayload = verifyAccessToken(pair.accessToken);
    expect(accessPayload.sub).toBe(mockUser.id);
    expect(accessPayload.type).toBe('access');

    const refreshPayload = verifyRefreshToken(pair.refreshToken);
    expect(refreshPayload.sub).toBe(mockUser.id);
    expect(refreshPayload.type).toBe('refresh');
  });

  it('refreshTokenPair creates new tokens from a valid refresh token', () => {
    const original = createTokenPair(mockUser);
    const newPair = refreshTokenPair(original.refreshToken);

    expect(newPair.accessToken).toBeTruthy();
    expect(newPair.refreshToken).toBeTruthy();
    // New tokens should be different (different iat)
    expect(newPair.accessToken).not.toBe(original.accessToken);
  });

  it('refreshTokenPair throws on invalid refresh token', () => {
    expect(() => refreshTokenPair('invalid-token')).toThrow();
  });

  it('refreshTokenPair throws when given an access token', () => {
    const pair = createTokenPair(mockUser);
    expect(() => refreshTokenPair(pair.accessToken)).toThrow();
  });
});
```

- [ ] **Step 12: Run session test to verify it fails**

```bash
npx vitest run __tests__/unit/lib/auth/session.test.ts
```

Expected: FAIL

- [ ] **Step 13: Implement session utilities**

Create `lib/auth/session.ts`:

```typescript
// lib/auth/session.ts
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt';
import type { AuthUser, TokenPair } from './types';

export function createTokenPair(user: AuthUser): TokenPair {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export function refreshTokenPair(currentRefreshToken: string): TokenPair {
  const payload = verifyRefreshToken(currentRefreshToken);

  const user: AuthUser = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  return createTokenPair(user);
}
```

- [ ] **Step 14: Run session test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/auth/session.test.ts
```

Expected: PASS

- [ ] **Step 15: Run all auth tests together**

```bash
npx vitest run __tests__/unit/lib/auth/
```

Expected: PASS — all auth tests pass.

- [ ] **Step 16: Commit**

```bash
git add lib/auth/ __tests__/unit/lib/auth/
git commit -m "feat: add JWT, password, and session auth utilities with TDD"
```

---

### Task 11: Auth Middleware (TDD)

**Files:**

- Create: `middleware.ts`
- Test: `__tests__/unit/middleware.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/middleware.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.stubEnv('JWT_ACCESS_SECRET', 'test-access-secret-that-is-long-enough-32chars!!');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-that-is-long-enough-32chars!');

import { middleware, config } from '@/middleware';
import { signAccessToken } from '@/lib/auth/jwt';

function createRequest(path: string, accessToken?: string): NextRequest {
  const url = new URL(path, 'http://localhost:3000');
  const headers = new Headers();
  if (accessToken) {
    headers.set('cookie', `access_token=${accessToken}`);
  }
  return new NextRequest(url, { headers });
}

describe('auth middleware', () => {
  it('allows public routes without auth', () => {
    const req = createRequest('/');
    const res = middleware(req);
    expect(res.status).not.toBe(401);
  });

  it('allows /login without auth', () => {
    const req = createRequest('/login');
    const res = middleware(req);
    expect(res.status).not.toBe(401);
  });

  it('allows /api/auth/* without auth', () => {
    const req = createRequest('/api/auth/login');
    const res = middleware(req);
    expect(res.status).not.toBe(401);
  });

  it('allows static assets without auth', () => {
    const req = createRequest('/_next/static/chunk.js');
    const res = middleware(req);
    expect(res.status).not.toBe(401);
  });

  it('redirects unauthenticated users from /admin to /login', () => {
    const req = createRequest('/admin');
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('allows authenticated users to access /admin', () => {
    const token = signAccessToken({ id: 'user-1', email: 'a@b.com', role: 'admin' });
    const req = createRequest('/admin', token);
    const res = middleware(req);
    expect(res.status).not.toBe(307);
  });

  it('redirects non-admin users from /admin to /unauthorized', () => {
    const token = signAccessToken({ id: 'user-1', email: 'a@b.com', role: 'public' });
    const req = createRequest('/admin/upload', token);
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/unauthorized');
  });

  it('config matcher excludes static files', () => {
    expect(config.matcher).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/middleware.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement middleware**

Create `middleware.ts`:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';

const PUBLIC_PATHS = ['/', '/login', '/unauthorized', '/api/auth', '/api/health'];

const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/images', '/fonts'];

function isPublicPath(pathname: string): boolean {
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get access token from cookies
  const accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = verifyAccessToken(accessToken);

    // Admin route protection
    if (isAdminPath(pathname)) {
      if (payload.role !== 'admin' && payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Add user info to headers for downstream use
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.sub);
    response.headers.set('x-user-email', payload.email);
    response.headers.set('x-user-role', payload.role);
    return response;
  } catch {
    // Invalid token — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/middleware.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add middleware.ts __tests__/unit/middleware.test.ts
git commit -m "feat: add auth middleware with route protection and TDD"
```

---

### Task 12: Auth API Routes + Login Page

**Files:**

- Create: `app/api/auth/login/route.ts`, `app/api/auth/refresh/route.ts`, `app/api/auth/logout/route.ts`, `app/(auth)/login/page.tsx`

- [ ] **Step 1: Create login API route**

Create `app/api/auth/login/route.ts`:

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { comparePassword } from '@/lib/auth/password';
import { createTokenPair } from '@/lib/auth/session';
import { setAuthCookies } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/schemas/user';
import {
  createErrorResponse,
  unauthorized,
  validationFailed,
  internalError,
} from '@/lib/api/errors';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:login');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path.join('.');
        details[key] = details[key] || [];
        details[key].push(issue.message);
      });
      return createErrorResponse(validationFailed(details));
    }

    const { email, password } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      logger.warn({ email }, 'Login attempt for non-existent user');
      return createErrorResponse(unauthorized('Invalid email or password'));
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      logger.warn({ email }, 'Login attempt with invalid password');
      return createErrorResponse(unauthorized('Invalid email or password'));
    }

    // Create tokens
    const role = user.role?.role || 'public';
    const tokenPair = createTokenPair({
      id: user.id,
      email: user.email,
      role,
    });

    // Set cookies
    const cookieStore = await cookies();
    setAuthCookies(cookieStore, tokenPair.accessToken, tokenPair.refreshToken);

    logger.info({ userId: user.id, email }, 'User logged in successfully');

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    return createErrorResponse(internalError());
  }
}
```

- [ ] **Step 2: Create refresh API route**

Create `app/api/auth/refresh/route.ts`:

```typescript
// app/api/auth/refresh/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshTokenPair } from '@/lib/auth/session';
import { setAuthCookies } from '@/lib/auth/jwt';
import { createErrorResponse, unauthorized, internalError } from '@/lib/api/errors';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:refresh');

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return createErrorResponse(unauthorized('No refresh token'));
    }

    try {
      const newTokens = refreshTokenPair(refreshToken);
      setAuthCookies(cookieStore, newTokens.accessToken, newTokens.refreshToken);

      return NextResponse.json({ message: 'Tokens refreshed' });
    } catch {
      logger.warn('Invalid refresh token used');
      return createErrorResponse(unauthorized('Invalid refresh token'));
    }
  } catch (error) {
    logger.error({ error }, 'Refresh error');
    return createErrorResponse(internalError());
  }
}
```

- [ ] **Step 3: Create logout API route**

Create `app/api/auth/logout/route.ts`:

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearAuthCookies } from '@/lib/auth/jwt';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:logout');

export async function POST() {
  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);
  logger.info('User logged out');
  return NextResponse.json({ message: 'Logged out' });
}
```

- [ ] **Step 4: Create login page**

Create `app/(auth)/login/page.tsx`:

```tsx
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Login failed');
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Podcast Hub
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create unauthorized page**

Create `app/unauthorized/page.tsx`:

```tsx
// app/unauthorized/page.tsx
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">403</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          You do not have permission to access this page.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/ app/(auth)/ app/unauthorized/
git commit -m "feat: add auth API routes (login, refresh, logout) and login page"
```

---

### Task 13: Root Layout + Error Boundaries

**Files:**

- Modify: `app/layout.tsx`
- Create: `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `components/providers.tsx`

- [ ] **Step 1: Create providers component**

Create `components/providers.tsx`:

```tsx
// components/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Update root layout**

Update `app/layout.tsx`:

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Podcast Hub',
    template: '%s | Podcast Hub',
  },
  description: 'Enterprise podcast platform for audit professionals',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create error boundary**

Create `app/error.tsx`:

```tsx
// app/error.tsx
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create not-found page**

Create `app/not-found.tsx`:

```tsx
// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">404</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create loading component**

Create `app/loading.tsx`:

```tsx
// app/loading.tsx
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/error.tsx app/not-found.tsx app/loading.tsx components/providers.tsx
git commit -m "feat: add root layout, providers, error boundaries, and loading states"
```

---

### Task 14: Health Check Endpoint (TDD)

**Files:**

- Create: `app/api/health/route.ts`
- Test: `__tests__/unit/api/health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/api/health.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/health/route';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
  },
}));

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.database).toBe('connected');
  });

  it('returns 503 when database is down', async () => {
    const { prisma } = await import('@/lib/db');
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection refused'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe('disconnected');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/api/health.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement health check route**

Create `app/api/health/route.ts`:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'connected';

  try {
    await prisma.$queryRaw`SELECT 1 as result`;
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      version: process.env.npm_package_version || '0.0.0',
    },
    { status: isHealthy ? 200 : 503 }
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/api/health.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/health/ __tests__/unit/api/health.test.ts
git commit -m "feat: add health check endpoint with TDD"
```

---

### Task 15: CI Pipeline (GitHub Actions)

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  DATABASE_URL: 'postgresql://podcasthub:podcasthub_dev@localhost:5432/podcasthub'
  JWT_ACCESS_SECRET: 'ci-test-access-secret-that-is-long-enough-32chars!!'
  JWT_REFRESH_SECRET: 'ci-test-refresh-secret-that-is-long-enough-32chars!'
  JWT_ACCESS_EXPIRY: '15m'
  JWT_REFRESH_EXPIRY: '7d'
  BCRYPT_SALT_ROUNDS: '4'

jobs:
  lint:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: podcasthub
          POSTGRES_PASSWORD: podcasthub_dev
          POSTGRES_DB: podcasthub
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
      - run: npm run test:coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [lint, test]
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: podcasthub
          POSTGRES_PASSWORD: podcasthub_dev
          POSTGRES_DB: podcasthub
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npx prisma generate
      - run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions CI pipeline"
```

---

### Task 16: Sentry Setup

**Files:**

- Create: `lib/sentry.ts`, `app/global-error.tsx`
- Modify: `next.config.ts`

- [ ] **Step 1: Install Sentry**

```bash
npm install @sentry/nextjs
```

- [ ] **Step 2: Create Sentry config**

Create `lib/sentry.ts`:

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: false,
    enabled: process.env.NODE_ENV === 'production',
  });
}
```

- [ ] **Step 3: Create global error page for Sentry**

Create `app/global-error.tsx`:

```tsx
// app/global-error.tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h1>Something went wrong</h1>
            <p>An unexpected error occurred.</p>
            <button onClick={reset}>Try again</button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create Sentry config files**

Create `sentry.client.config.ts`:

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  enabled: process.env.NODE_ENV === 'production',
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

Create `sentry.server.config.ts`:

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  enabled: process.env.NODE_ENV === 'production',
});
```

Create `sentry.edge.config.ts`:

```typescript
// sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  enabled: process.env.NODE_ENV === 'production',
});
```

- [ ] **Step 5: Update `next.config.ts` to include Sentry**

Update `next.config.ts`:

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/thumbnails/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
```

- [ ] **Step 6: Commit**

```bash
git add lib/sentry.ts app/global-error.tsx sentry.*.config.ts next.config.ts
git commit -m "feat: add Sentry error tracking integration"
```

---

### Task 17: Rate Limiting Utility (TDD)

**Files:**

- Create: `lib/api/rate-limit.ts`
- Test: `__tests__/unit/lib/api/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/lib/api/rate-limit.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit, type RateLimitConfig } from '@/lib/api/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 5 });
    const result = limiter.check('user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests over the limit', () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 2 });
    limiter.check('user-1'); // 1
    limiter.check('user-1'); // 2
    const result = limiter.check('user-1'); // 3 — blocked
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 1 });
    const result1 = limiter.check('user-1');
    const result2 = limiter.check('user-2');
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('resets after the interval', () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 1 });
    limiter.check('user-1'); // uses the 1 allowed
    const blocked = limiter.check('user-1');
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(60_001);

    const afterReset = limiter.check('user-1');
    expect(afterReset.success).toBe(true);
  });

  it('returns reset time in the result', () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 5 });
    const result = limiter.check('user-1');
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it('returns limit in the result', () => {
    const limiter = rateLimit({ interval: 60_000, maxRequests: 10 });
    const result = limiter.check('user-1');
    expect(result.limit).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/unit/lib/api/rate-limit.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/api/rate-limit.ts`:

```typescript
// lib/api/rate-limit.ts

export interface RateLimitConfig {
  interval: number; // milliseconds
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // timestamp in ms
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function rateLimit(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key);

      // If no entry or window expired, create new window
      if (!entry || now >= entry.resetAt) {
        const resetAt = now + config.interval;
        store.set(key, { count: 1, resetAt });
        return {
          success: true,
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          reset: resetAt,
        };
      }

      // Increment count
      entry.count += 1;

      if (entry.count > config.maxRequests) {
        return {
          success: false,
          limit: config.maxRequests,
          remaining: 0,
          reset: entry.resetAt,
        };
      }

      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - entry.count,
        reset: entry.resetAt,
      };
    },

    reset(key: string): void {
      store.delete(key);
    },
  };
}

// Pre-configured limiters for common use cases
export const apiLimiter = rateLimit({
  interval: 60_000, // 1 minute
  maxRequests: 60,
});

export const authLimiter = rateLimit({
  interval: 900_000, // 15 minutes
  maxRequests: 10,
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/unit/lib/api/rate-limit.test.ts
```

Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/api/rate-limit.ts __tests__/unit/lib/api/rate-limit.test.ts
git commit -m "feat: add in-memory rate limiting utility with TDD"
```

---

## Final Verification

After completing all 17 tasks, run the full verification suite:

- [ ] **Run all unit tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Run linting**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Run type checking**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Run format check**

```bash
npm run format:check
```

Expected: All files formatted.

- [ ] **Build the project**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Start dev server and verify health check**

```bash
docker compose up -d
npm run dev &
sleep 5
curl http://localhost:3000/api/health
```

Expected: `{ "status": "ok", "database": "connected", ... }`

---

## File Tree Summary

```
podcasthub/
├── .github/workflows/ci.yml
├── .husky/pre-commit
├── .lintstagedrc.js
├── .prettierrc
├── .prettierignore
├── .env.example
├── .env.local (not committed)
├── docker-compose.yml
├── eslint.config.mjs
├── middleware.ts
├── next.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── vitest.setup.ts
├── sentry.client.config.ts
├── sentry.server.config.ts
├── sentry.edge.config.ts
├── prisma/
│   └── schema.prisma
├── lib/
│   ├── db.ts
│   ├── utils.ts
│   ├── logger.ts
│   ├── sentry.ts
│   ├── api/
│   │   ├── errors.ts
│   │   ├── pagination.ts
│   │   └── rate-limit.ts
│   ├── auth/
│   │   ├── types.ts
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── session.ts
│   └── schemas/
│       ├── common.ts
│       ├── user.ts
│       ├── podcast.ts
│       ├── learning-graph.ts
│       └── bookmark.ts
├── components/
│   └── providers.tsx
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── loading.tsx
│   ├── global-error.tsx
│   ├── (auth)/login/page.tsx
│   ├── unauthorized/page.tsx
│   └── api/
│       ├── health/route.ts
│       └── auth/
│           ├── login/route.ts
│           ├── refresh/route.ts
│           └── logout/route.ts
└── __tests__/
    ├── unit/
    │   ├── lib/
    │   │   ├── api/
    │   │   │   ├── errors.test.ts
    │   │   │   ├── pagination.test.ts
    │   │   │   └── rate-limit.test.ts
    │   │   ├── auth/
    │   │   │   ├── jwt.test.ts
    │   │   │   ├── password.test.ts
    │   │   │   └── session.test.ts
    │   │   └── schemas/
    │   │       └── schemas.test.ts
    │   ├── api/
    │   │   └── health.test.ts
    │   └── middleware.test.ts
    └── e2e/
        └── .gitkeep
```
