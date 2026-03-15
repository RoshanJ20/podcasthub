# Podcast Hub v2 — Product Requirements Document

**Version:** 2.0
**Date:** 2026-03-15
**Status:** Pre-development specification
**Purpose:** Complete rebuild with enterprise-grade architecture, testing, CI/CD, and security

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Stakeholders & Roles](#2-stakeholders--roles)
3. [Functional Requirements](#3-functional-requirements)
4. [Information Architecture](#4-information-architecture)
5. [Database Schema](#5-database-schema)
6. [API Specification](#6-api-specification)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Tech Stack](#8-tech-stack)
9. [Architecture & Code Organization](#9-architecture--code-organization)
10. [Testing Strategy](#10-testing-strategy)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Security Requirements](#12-security-requirements)
13. [Observability & Monitoring](#13-observability--monitoring)
14. [Performance Requirements](#14-performance-requirements)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Development Workflow & Standards](#16-development-workflow--standards)
17. [Migration Plan from v1](#17-migration-plan-from-v1)
18. [Feature Roadmap & Phases](#18-feature-roadmap--phases)
19. [Appendix: Lessons from v1](#19-appendix-lessons-from-v1)

---

## 1. Product Overview

### 1.1 What is Podcast Hub?

Podcast Hub is an internal enterprise web application for a National Audit Office. It serves as a centralized platform where audit professionals can access audio podcasts (called "bulletins") covering technical content and learning series across audit domains.

### 1.2 Problem Statement

Audit experts produce technical content as PDFs. This content needs to be:
- Converted to audio podcasts (narrative or conversational style, short and long duration)
- Organized by domain and categorized for discovery
- Made searchable via smart AI-powered search
- Consumed by audit teams with a rich listening experience (transcripts, bookmarks, notes)
- Structured into learning paths for professional development

### 1.3 Core Value Proposition

- **For Admins:** A simple workflow to upload, organize, and manage audio content with metadata
- **For Users:** A rich, podcast-like experience to consume audit knowledge — listen, read transcripts, bookmark, track progress, and search across all content

### 1.4 Terminology

| Term | Meaning |
|------|---------|
| **Bulletin** | A PDF document prepared by audit experts (the source content) |
| **Podcast/Episode** | The audio version of a bulletin (short and long duration) |
| **Domain** | One of 6 audit practice areas (see Section 5) |
| **Learning Path** | A curated sequence or graph of episodes for structured learning |
| **Playlist** | Synonym for learning path (used interchangeably in business context) |
| **Lake** | External document management system where PDFs are also hosted |

---

## 2. Stakeholders & Roles

### 2.1 User Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| **Public User** | Any authenticated employee | Read all published content, manage own bookmarks/progress/notes |
| **Admin** | Domain experts from National Audit Offices | All public + create/edit/delete content, manage podcasts and learning paths |
| **Super Admin** | System administrators | All admin + manage user roles, access analytics, system configuration |

### 2.2 Role Assignment

- Default role on signup: `public`
- Admins are promoted by Super Admins via the User Management page
- Super Admin is a seeded role (first user or DB-seeded)

---

## 3. Functional Requirements

### 3.1 Admin Workflow

#### 3.1.1 Content Preparation (External)
1. Admin prepares content as a PDF (APB, APMU, ATU, etc.)
2. Admin uses Copilot to generate a transcript (brief summary + detailed overview)
3. Admin uses Microsoft Clipchamp to convert transcript to audio (short + long duration)
4. Admin uploads PDF to Lake (external system)
5. Admin uploads audio to Podcast Hub (this app)
6. Admin sends email with links to Lake content and Podcast Hub audio

#### 3.1.2 Podcast Upload (FR-ADMIN-001)
**Priority:** P0 (Must Have)

Admin can create a new podcast with:
- Title (required, max 200 chars)
- Description (required, max 2000 chars)
- Domain (required, single select from 6 domains)
- Year (required, YYYY format)
- Tags (optional, comma-separated, enables search)
- Thumbnail image (required, JPEG/PNG/WebP, max 5MB)
- Audio — short duration (required, MP3/WAV/M4A, max 200MB)
- Audio — long duration (optional, MP3/WAV/M4A, max 500MB)
- Bulletin PDF(s) (optional, multiple files, max 50MB each)
- Transcript text (optional, with timestamped segments)

#### 3.1.3 Podcast Edit/Delete (FR-ADMIN-002)
**Priority:** P0

- Edit all metadata fields of an existing podcast
- Replace uploaded files (audio, thumbnail, bulletins)
- Soft-delete a podcast (mark as archived, not hard delete)
- Restore archived podcasts

#### 3.1.4 Podcast Ordering (FR-ADMIN-003)
**Priority:** P1

- Drag-and-drop reorder podcasts within the admin dashboard
- Sort order persists and affects public display order

#### 3.1.5 Learning Path Management (FR-ADMIN-004)
**Priority:** P1

- Create a learning path with: title, description, domain, thumbnail, path type (linear or graph)
- Add episodes to a learning path (each with: title, audio URL, transcript, position)
- For graph mode: connect episodes with directed edges (source → target) with optional labels
- Set node types: start, default, milestone, end
- Publish/unpublish a learning path
- Edit and reorder episodes within a path

#### 3.1.6 User Role Management (FR-ADMIN-005)
**Priority:** P1

- Super Admin can search users by email
- Assign/revoke admin or superadmin roles
- View list of all users with their current roles

#### 3.1.7 Analytics Dashboard (FR-ADMIN-006)
**Priority:** P2

- Total bulletins count, total learning paths count
- Listens by domain (donut chart)
- Monthly listening trends (bar/area chart)
- Top topics by listen count (horizontal bar)
- Date range filtering

### 3.2 Public User Features

#### 3.2.1 Library / Browse (FR-USER-001)
**Priority:** P0

Two main content buckets:
1. **Technical Content** — Individual bulletins/podcasts
2. **Learning Series** — Curated learning paths

Each bucket supports:
- Domain-wise filtering (Audit Methodology, Accounting and Reporting, Audit Technology, Quality and Risk, LEAP, Auditing)
- Sort by: newest, oldest, title A-Z
- Grid/card view with thumbnails
- Pagination (20 items per page default)

#### 3.2.2 Audio Player (FR-USER-002)
**Priority:** P0

- Play/pause with keyboard shortcut (spacebar)
- Toggle between short and long duration versions
- Progress slider with seek (click or drag)
- Skip forward/backward ±10 seconds
- Volume control with mute toggle
- Playback speed control (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- Persistent mini-player across page navigation
- Remember last position on return

#### 3.2.3 Transcript Viewer (FR-USER-003)
**Priority:** P0

- Display transcript synchronized with audio playback
- Highlight current segment as audio plays
- Click any transcript segment to seek to that timestamp
- Auto-scroll transcript to follow playback
- Full transcript download as text file

#### 3.2.4 Bulletin/PDF Viewer (FR-USER-004)
**Priority:** P1

- View associated PDF bulletin(s) alongside audio
- PDF rendered in-app (not download-only)
- Download option for offline reading

#### 3.2.5 Bookmarks & Notes (FR-USER-005)
**Priority:** P1

- Bookmark at current timestamp with optional note
- View all bookmarks for a podcast
- Click bookmark to seek to that timestamp
- Edit/delete bookmark notes
- View all bookmarks across all podcasts (in profile/progress page)

#### 3.2.6 Progress Tracking (FR-USER-006)
**Priority:** P1

- Track episode completion within learning paths
- Visual progress indicator on learning path cards
- Resume from where user left off
- Progress page showing: completed episodes, in-progress paths, listening history

#### 3.2.7 Learning Path Viewer (FR-USER-007)
**Priority:** P1

- Visual rendering: linear path (step-by-step) or graph (node-based with connections)
- Play episodes directly from the path view
- Track completion per episode
- Navigate between episodes within the path

#### 3.2.8 Search (FR-USER-008)
**Priority:** P2

- **Basic search:** Text search across podcast titles, descriptions, tags
- **Smart search (AI-powered):** Semantic search across transcripts using vector embeddings
  - User asks a question in natural language
  - System returns matching podcasts with specific timestamps where the topic is discussed
- Search results show: podcast title, matching snippet, timestamp link

#### 3.2.9 User Profile (FR-USER-009)
**Priority:** P2

- View/edit display name
- Theme preference (light/dark)
- Listening statistics summary
- Download history

### 3.3 Future Features (Out of Scope for v2 Launch)

These are documented for future phases but NOT built in the initial release:
- AI transcript generation (Copilot integration)
- Text-to-speech conversion within the app
- AI-generated thumbnail images
- Email notification system for new content
- Mobile native app (PWA is acceptable for v2)
- Offline listening support

---

## 4. Information Architecture

### 4.1 Site Map

```
/                           → Home (hero, recently added, categories)
/login                      → Authentication (magic link + password)
/auth/callback              → OAuth/magic link callback
/unauthorized               → 403 page

/bulletins                  → Technical content library (filterable grid)
/podcast/:id                → Individual podcast player page
/learning-path              → Learning paths listing
/learning-path/:id          → Individual learning path viewer
/search                     → Search page (basic + AI)
/profile                    → User profile & settings
/progress                   → User progress, bookmarks, history

/admin                      → Admin dashboard (stats, podcast table)
/admin/upload               → Upload new podcast
/admin/edit/:id             → Edit existing podcast
/admin/learning-graphs      → Manage learning paths
/admin/learning-graphs/:id  → Learning path editor (visual)
/admin/users                → User role management
/admin/analytics            → Analytics dashboard
```

### 4.2 Navigation

- **Top Nav:** Home, Library (dropdown: Technical Content, Learning Series), Search
- **User Menu:** Profile, Progress, Theme Toggle, Logout
- **Admin Sidebar:** Dashboard, Upload, Learning Paths, Users, Analytics
- **Persistent Mini-Player:** Fixed bottom bar when audio is playing

### 4.3 Domains (Categories)

| Domain | Abbreviation |
|--------|-------------|
| Audit Methodology | AMG |
| Accounting and Reporting | ARG |
| Audit Technology | AITG |
| Quality and Risk | QRMG |
| LEAP | LEAP |
| Auditing (Independence) | Independence |

---

## 5. Database Schema

### 5.1 Database: PostgreSQL 16 + Prisma ORM

Extensions required:
- `pgvector` — vector similarity search for AI-powered search
- `uuid-ossp` — UUID generation

### 5.2 Tables

#### `podcasts`
```sql
CREATE TABLE podcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN (
    'Audit Methodology', 'Accounting and Reporting',
    'Audit Technology', 'Quality and Risk', 'LEAP', 'Auditing'
  )),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2099),
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT NOT NULL,
  audio_short_url TEXT NOT NULL,
  audio_long_url TEXT,
  bulletin_urls TEXT[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `transcripts`
```sql
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  segments JSONB NOT NULL DEFAULT '[]',
  -- segments: [{ start: number, end: number, text: string }]
  embedding VECTOR(1536),
  transcript_type TEXT NOT NULL DEFAULT 'short' CHECK (transcript_type IN ('short', 'long')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(podcast_id, transcript_type)
);

CREATE INDEX transcripts_embedding_idx ON transcripts
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### `learning_graphs`
```sql
CREATE TABLE learning_graphs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL CHECK (domain IN (
    'Audit Methodology', 'Accounting and Reporting',
    'Audit Technology', 'Quality and Risk', 'LEAP', 'Auditing'
  )),
  path_type TEXT NOT NULL DEFAULT 'linear' CHECK (path_type IN ('linear', 'graph')),
  thumbnail_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `episodes`
```sql
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  graph_id UUID NOT NULL REFERENCES learning_graphs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  transcript JSONB DEFAULT '[]',
  -- transcript: [{ start: number, end: number, text: string }]
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  node_type TEXT NOT NULL DEFAULT 'default' CHECK (node_type IN ('start', 'default', 'milestone', 'end')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX episodes_graph_id_idx ON episodes(graph_id);
```

#### `learning_path_edges`
```sql
CREATE TABLE learning_path_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  graph_id UUID NOT NULL REFERENCES learning_graphs(id) ON DELETE CASCADE,
  source_episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  target_episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX edges_graph_id_idx ON learning_path_edges(graph_id);
```

#### `bookmarks`
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  timestamp_seconds REAL NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX bookmarks_podcast_id_idx ON bookmarks(podcast_id);
```

#### `user_roles`
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('public', 'admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `user_progress`
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  graph_id UUID NOT NULL REFERENCES learning_graphs(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

CREATE INDEX user_progress_user_id_idx ON user_progress(user_id);
CREATE INDEX user_progress_graph_id_idx ON user_progress(graph_id);
```

#### `user_activity`
```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'listen', 'bookmark', 'complete_episode', 'view_path', 'search'
  )),
  podcast_id UUID REFERENCES podcasts(id) ON DELETE SET NULL,
  episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
  graph_id UUID REFERENCES learning_graphs(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX user_activity_type_idx ON user_activity(activity_type);
CREATE INDEX user_activity_created_at_idx ON user_activity(created_at);
```

### 5.3 Authorization Rules

Authorization is enforced at the **application layer** via middleware and Prisma query filters, rather than database-level RLS. The following access rules must be implemented:

| Entity | Read | Write | Delete |
|--------|------|-------|--------|
| **Podcasts** | Public (non-archived) | Admin, SuperAdmin | SuperAdmin only |
| **Bookmarks** | Own user only | Own user only | Own user only |
| **User Roles** | Own user (or SuperAdmin for all) | SuperAdmin only | SuperAdmin only |
| **Learning Graphs** | Published = public; all = Admin | Admin, SuperAdmin | Admin, SuperAdmin |
| **User Progress** | Own user only | Own user only | Own user only |
| **User Activity** | Own user only | Own user only | — |

These rules are enforced via:
1. **Middleware** (`middleware.ts`) — JWT verification, route protection
2. **API route handlers** — Role-based access checks before database operations
3. **Prisma query filters** — `where` clauses scoped to the authenticated user

### 5.4 Storage Buckets (MinIO / Azure Blob Storage)

| Bucket | Access | Contents |
|--------|--------|----------|
| `audio` | Private (presigned URLs) | MP3/WAV/M4A → HLS segments (after FFmpeg transcoding) |
| `thumbnails` | Public | JPEG/PNG/WebP images |
| `bulletins` | Private (signed URLs) | PDF documents |

### 5.5 RPC Functions

> **Note:** This function is called via `prisma.$queryRaw` in the application layer.

```sql
-- Semantic search via pgvector
CREATE FUNCTION match_transcripts(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 10
) RETURNS TABLE (
  id UUID,
  podcast_id UUID,
  full_text TEXT,
  segments JSONB,
  similarity FLOAT
) AS $$
  SELECT id, podcast_id, full_text, segments,
    1 - (embedding <=> query_embedding) AS similarity
  FROM transcripts
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;
```

---

## 6. API Specification

### 6.1 Design Principles

- RESTful endpoints under `/api/`
- JSON request/response bodies
- Consistent error response shape (see 6.3)
- All list endpoints support pagination (`?page=1&limit=20`)
- All write endpoints require authentication
- Input validation via Zod schemas on every endpoint
- Rate limiting on all endpoints (see Section 12)

### 6.2 Endpoints

#### Podcasts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/podcasts` | Public | List podcasts (paginated, filterable by domain/year/tags) |
| GET | `/api/podcasts/:id` | Public | Get single podcast with transcript |
| POST | `/api/podcasts` | Admin | Create new podcast |
| PUT | `/api/podcasts/:id` | Admin | Update podcast metadata |
| DELETE | `/api/podcasts/:id` | SuperAdmin | Soft-delete (archive) podcast |
| PATCH | `/api/podcasts/batch` | Admin | Batch update sort order |
| GET | `/api/podcasts/:id/transcript` | Public | Get transcript for podcast |
| PUT | `/api/podcasts/:id/transcript` | Admin | Update/upload transcript |

#### Learning Paths

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/learning-graphs` | Public (published only) | List learning paths |
| GET | `/api/learning-graphs/:id` | Public (if published) | Get path with episodes and edges |
| POST | `/api/learning-graphs` | Admin | Create learning path |
| PUT | `/api/learning-graphs/:id` | Admin | Update learning path metadata |
| DELETE | `/api/learning-graphs/:id` | Admin | Delete learning path |
| PUT | `/api/learning-graphs/:id/data` | Admin | Bulk save episodes + edges |

#### User Data

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/bookmarks` | User | List user's bookmarks (optionally filter by podcast_id) |
| POST | `/api/bookmarks` | User | Create bookmark |
| PUT | `/api/bookmarks/:id` | User | Update bookmark note |
| DELETE | `/api/bookmarks/:id` | User | Delete bookmark |
| GET | `/api/progress` | User | Get user's progress across all paths |
| POST | `/api/progress` | User | Mark episode as complete |
| DELETE | `/api/progress/:id` | User | Unmark episode completion |
| POST | `/api/activity` | User | Log user activity |

#### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/analytics` | Admin | Aggregated analytics data |
| GET | `/api/users` | SuperAdmin | List users with roles |
| PUT | `/api/users/:id/role` | SuperAdmin | Update user role |

#### Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload` | Admin | Generate signed upload URL for file |

#### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/search?q=...&type=basic` | User | Text search across titles/descriptions/tags |
| POST | `/api/search` | User | Semantic search (sends query, returns matching transcripts with timestamps) |

### 6.3 Standard Error Response Shape

```typescript
interface ApiErrorResponse {
  status: number;
  error_code: string;
  message: string;
  details?: Record<string, string[]>; // field-level validation errors
  request_id?: string; // for tracing
}
```

Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR`

### 6.4 Pagination Response Shape

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

---

## 7. Authentication & Authorization

### 7.1 Authentication Methods

1. **Magic Link (Email OTP)** — Primary method for enterprise SSO feel
2. **Email + Password** — Fallback for users who prefer traditional login
3. **Future:** SAML/OIDC SSO integration with organization's identity provider

### 7.2 Auth Flow

```
User visits protected route
  → Middleware verifies JWT from HttpOnly cookie
  → No valid JWT → Redirect to /login?redirectTo=<original-path>
  → User authenticates (email + password)
  → Server validates credentials (bcrypt), issues JWT + refresh token (HttpOnly cookies)
  → Redirect to original path (with open-redirect protection)
```

### 7.3 Authorization Layers

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Middleware** | Next.js middleware (`middleware.ts`) | Protect `/admin/*` routes, redirect unauthenticated users |
| **API Route** | JWT verification + role check | Verify auth on every write endpoint |
| **Database** | Prisma query filters | Scoped queries enforce access at the data layer (defense in depth) |

### 7.4 Session Management

- JWT access tokens (short-lived, ~15 minutes) stored in HttpOnly cookies
- Refresh tokens (long-lived, ~7 days) stored in HttpOnly cookies
- Middleware verifies and refreshes tokens on every request
- Token rotation: new refresh token issued on each refresh
- Session timeout: configurable via environment variables

---

## 8. Tech Stack

### 8.1 Core Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Framework** | Next.js (App Router) | 16.x | Server Components, API routes, middleware, streaming |
| **Language** | TypeScript | 5.x | Strict mode, full type safety |
| **Runtime** | Node.js | 20 LTS | Long-term support, native ESM |
| **Database** | PostgreSQL + Prisma ORM | 16.x | pgvector extension for vector search |
| **UI** | React | 19.x | Server/Client components |
| **Styling** | Tailwind CSS | 4.x | Utility-first, design system tokens |
| **Components** | shadcn/ui (Radix) | Latest | Accessible, composable, copy-paste ownership |

### 8.2 Key Libraries

| Category | Library | Purpose |
|----------|---------|---------|
| **Forms** | React Hook Form + Zod | Form state + runtime validation |
| **Charts** | Recharts | Analytics visualizations |
| **PDF** | react-pdf | In-app bulletin viewer |
| **Drag & Drop** | @dnd-kit | Sortable lists (podcast ordering) |
| **Graph Viz** | @xyflow/react + Dagre | Learning path graph rendering |
| **Icons** | Lucide React | Consistent icon set |
| **Toast** | Sonner | Notifications |
| **Theming** | next-themes | Dark/light mode |

### 8.3 Development & Quality Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration test runner |
| **React Testing Library** | Component testing |
| **MSW (Mock Service Worker)** | API mocking in tests |
| **Playwright** | End-to-end browser testing |
| **ESLint 9** | Linting (flat config) |
| **Prettier** | Code formatting |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit checks |
| **Pino** | Structured logging |
| **Sentry** | Error tracking and performance monitoring |

---

## 9. Architecture & Code Organization

### 9.1 Project Structure

```
podcast-hub-v2/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # PR checks: lint, types, test, build
│   │   ├── cd.yml                # Deploy on merge to main
│   │   └── e2e.yml               # Nightly E2E tests
│   └── CODEOWNERS
├── .husky/
│   └── pre-commit                # lint-staged
├── app/
│   ├── layout.tsx                # Root layout (providers, fonts, error boundary)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── auth/callback/route.ts
│   │   └── unauthorized/page.tsx
│   ├── (public)/
│   │   ├── layout.tsx            # Public nav layout
│   │   ├── page.tsx              # Home
│   │   ├── bulletins/page.tsx
│   │   ├── podcast/[id]/page.tsx
│   │   ├── learning-path/page.tsx
│   │   ├── learning-path/[id]/page.tsx
│   │   ├── search/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── progress/page.tsx
│   │   └── error.tsx
│   ├── (admin)/
│   │   ├── layout.tsx            # Admin sidebar layout
│   │   ├── admin/page.tsx
│   │   ├── admin/upload/page.tsx
│   │   ├── admin/edit/[id]/page.tsx
│   │   ├── admin/learning-graphs/page.tsx
│   │   ├── admin/learning-graphs/[id]/page.tsx
│   │   ├── admin/users/page.tsx
│   │   ├── admin/analytics/page.tsx
│   │   └── error.tsx
│   └── api/
│       ├── podcasts/
│       ├── learning-graphs/
│       ├── bookmarks/
│       ├── progress/
│       ├── activity/
│       ├── search/
│       ├── upload/
│       ├── users/
│       └── admin/
├── components/
│   ├── ui/                       # shadcn base components
│   ├── audio-player/             # Player, transcript, bulletin viewer
│   ├── admin/                    # Admin-specific components
│   ├── learning-path/            # Path viewer, graph renderer
│   ├── library/                  # Podcast cards, grid
│   ├── profile/
│   ├── progress/
│   └── error-boundary.tsx        # React error boundary wrapper
├── lib/
│   ├── api/
│   │   ├── error-response.ts     # Standardized API errors
│   │   ├── pagination.ts         # Pagination helpers
│   │   └── rate-limit.ts         # Rate limiting middleware
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth/
│   │   ├── jwt.ts                # JWT sign/verify utilities
│   │   ├── session.ts            # Session management
│   │   └── password.ts           # bcrypt hash/compare
│   ├── schemas/                  # Zod schemas per entity
│   │   ├── podcast.ts
│   │   ├── learning-graph.ts
│   │   ├── bookmark.ts
│   │   └── user.ts
│   ├── logger.ts                 # Pino structured logger
│   ├── embeddings.ts             # OpenAI embedding generation
│   ├── upload.ts                 # File upload utilities
│   └── utils.ts                  # General utilities
├── hooks/
│   ├── use-listen-tracker.ts
│   ├── use-audio-player.ts
│   └── use-mobile.ts
├── middleware.ts                  # Auth + admin route protection
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Prisma migrations
├── __tests__/
│   ├── unit/
│   │   ├── lib/                  # Pure function tests
│   │   └── schemas/              # Zod schema tests
│   ├── integration/
│   │   ├── api/                  # API route tests (with MSW)
│   │   └── components/           # Component tests (RTL)
│   └── e2e/
│       ├── auth.spec.ts          # Login/logout flows
│       ├── podcast.spec.ts       # Browse/play/bookmark
│       ├── admin.spec.ts         # Upload/edit/delete
│       └── learning-path.spec.ts # Path viewer/editor
├── vitest.config.ts
├── playwright.config.ts
├── Dockerfile
├── docker-compose.yml            # Local dev: PostgreSQL + MinIO
├── .env.example
├── .env.local
├── .prettierrc
├── eslint.config.mjs
├── tsconfig.json
├── next.config.ts
└── package.json
```

### 9.2 Key Architecture Patterns

| Pattern | Implementation |
|---------|---------------|
| **Server Components by default** | Pages fetch data server-side; only interactive parts are Client Components |
| **Route Groups** | `(auth)`, `(public)`, `(admin)` for layout and middleware isolation |
| **Centralized validation** | Zod schemas in `lib/schemas/`, shared between client forms and API routes |
| **Error boundary hierarchy** | React ErrorBoundary in root layout + `error.tsx` per route group |
| **Zustand for cross-cutting state** | PlayerContext (Zustand store) for audio state shared across components |
| **Service layer separation** | API routes handle HTTP concerns; business logic in lib/ |
| **Defense in depth** | Middleware (JWT verify) → API auth check → Prisma query filters (3 layers of authorization) |

### 9.3 Component Guidelines

- Every component file should export ONE named component (no default exports)
- Client Components must have `'use client'` directive
- Props interfaces defined in the same file, exported if reused
- No inline styles — Tailwind classes only
- Complex components should be decomposed into sub-components in the same directory

---

## 10. Testing Strategy

### 10.1 Testing Pyramid

```
          ┌─────────┐
          │   E2E   │  ~10 tests (critical user journeys)
         ┌┴─────────┴┐
         │Integration │  ~50 tests (API routes, component interactions)
        ┌┴───────────┴┐
        │    Unit     │  ~200 tests (schemas, utils, pure logic)
        └─────────────┘
```

### 10.2 Unit Tests (Vitest)

**Target: 100% coverage on `lib/` and `schemas/`**

| Module | What to Test |
|--------|-------------|
| `lib/schemas/*.ts` | Valid inputs pass, invalid inputs fail with correct error messages |
| `lib/api/error-response.ts` | Each error builder returns correct status/code/message |
| `lib/api/pagination.ts` | Page/limit parsing, edge cases (negative, zero, overflow) |
| `lib/upload.ts` | File size formatting, filename sanitization, MIME type validation |
| `lib/utils.ts` | All utility functions |
| `lib/embeddings.ts` | Mocked OpenAI calls, error handling |

### 10.3 Integration Tests (Vitest + RTL + MSW)

**Target: All API routes and critical components**

#### API Route Tests
- Every endpoint tested for: success path, validation errors, auth failures, not found
- MSW to mock API responses
- Test pagination parameters
- Test rate limiting headers

#### Component Tests
- AudioPlayer: play/pause, seek, volume, duration toggle
- UploadForm: validation, file selection, submit flow
- PodcastCard: rendering, click handlers
- BookmarkPanel: create, edit, delete bookmarks
- LearningPathViewer: graph rendering, episode navigation

### 10.4 End-to-End Tests (Playwright)

**Target: Critical user journeys only**

| Test | Flow |
|------|------|
| **Auth** | Login → verify session → access protected route → logout |
| **Browse & Listen** | Home → filter by domain → open podcast → play audio → bookmark |
| **Admin Upload** | Login as admin → upload form → fill fields → upload files → verify in library |
| **Learning Path** | Browse paths → open path → play episode → mark complete → verify progress |
| **Search** | Search query → verify results → click result → verify navigation |

### 10.5 Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
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
})
```

### 10.6 Test-Driven Development Process

For every new feature or bug fix:
1. Write failing test(s) first
2. Implement the minimum code to pass
3. Refactor with tests as safety net
4. All tests must pass before PR merge

---

## 11. CI/CD Pipeline

### 11.1 Continuous Integration (on every PR)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      # Step 1: Format check
      - name: Prettier check
        run: npx prettier --check .

      # Step 2: Lint
      - name: ESLint
        run: npm run lint

      # Step 3: Type check
      - name: TypeScript
        run: npx tsc --noEmit

      # Step 4: Unit + Integration tests with coverage
      - name: Tests
        run: npm run test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          JWT_SECRET: test-jwt-secret-for-ci

      # Step 5: Coverage threshold check
      - name: Check coverage thresholds
        run: npx vitest run --coverage --reporter=json
        # Fails if below configured thresholds

      # Step 6: Build
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          JWT_SECRET: test-jwt-secret-for-ci
          NEXT_PUBLIC_APP_URL: http://localhost:3000

      # Step 7: Upload coverage report
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

### 11.2 Continuous Deployment (on merge to main)

```yaml
# .github/workflows/cd.yml
name: CD

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.APP_URL }}

      - name: Build Docker image
        run: docker build -t podcast-hub:${{ github.sha }} .

      - name: Push to container registry
        run: |
          # Push to Azure Container Registry or equivalent
          docker tag podcast-hub:${{ github.sha }} ${{ secrets.REGISTRY_URL }}/podcast-hub:${{ github.sha }}
          docker push ${{ secrets.REGISTRY_URL }}/podcast-hub:${{ github.sha }}

      - name: Deploy to Azure Container Apps
        # Use Azure CLI or GitHub Action to update container app revision
        run: |
          az containerapp update \
            --name podcast-hub \
            --resource-group ${{ secrets.AZURE_RG }} \
            --image ${{ secrets.REGISTRY_URL }}/podcast-hub:${{ github.sha }}
```

### 11.3 E2E Tests (Nightly or pre-release)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM UTC daily
  workflow_dispatch:

jobs:
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          E2E_BASE_URL: ${{ secrets.STAGING_URL }}
```

### 11.4 Branch Strategy

| Branch | Purpose | Protection |
|--------|---------|-----------|
| `main` | Production-ready code | Require PR, CI pass, 1 approval |
| `develop` | Integration branch (optional) | CI pass |
| `feat/*` | Feature branches | — |
| `fix/*` | Bug fix branches | — |
| `release/*` | Release candidates | CI + E2E pass |

### 11.5 PR Checklist (Enforced)

Every PR must:
- [ ] Pass all CI checks (lint, types, tests, build)
- [ ] Have test coverage for new/changed code
- [ ] Not decrease overall coverage below threshold
- [ ] Have a descriptive title and linked issue
- [ ] Be reviewed by at least 1 team member

---

## 12. Security Requirements

### 12.1 Authentication Security

| Requirement | Implementation |
|-------------|---------------|
| Session tokens in HttpOnly cookies | Custom JWT middleware with HttpOnly, Secure, SameSite cookies |
| CSRF protection | SameSite=Lax cookie attribute |
| Redirect validation | Whitelist of allowed redirect paths (no open redirects) |
| Password policy | Minimum 8 chars, enforced by Zod schema + bcrypt hashing |
| Rate limit on login | Max 5 attempts per minute per IP |
| JWT access token expiry | 15 minutes (configurable via JWT_EXPIRY env var) |

### 12.2 API Security

| Requirement | Implementation |
|-------------|---------------|
| Input validation | Zod schemas on every endpoint |
| SQL injection prevention | Prisma ORM (parameterized queries); `$queryRaw` with tagged templates for pgvector |
| XSS prevention | React auto-escaping + CSP headers |
| Rate limiting | Per-endpoint limits (see below) |
| Request size limits | 10MB default, 500MB for upload endpoint |
| CORS | Restrict to app domain only |
| File upload validation | MIME type + extension + size checks server-side |

### 12.3 Rate Limits

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Read endpoints | 100 requests | 1 minute |
| Write endpoints | 20 requests | 1 minute |
| Upload | 5 requests | 5 minutes |
| Search | 30 requests | 1 minute |

### 12.4 HTTP Security Headers

```typescript
// next.config.ts headers
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',  // Rely on CSP instead
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}
```

### 12.5 Data Protection

- No PII stored beyond email and display name
- PostgreSQL encrypts data at rest (Azure-managed encryption for prod; local dev unencrypted)
- All traffic over HTTPS (TLS 1.2+)
- Service role key never exposed to client
- Environment secrets managed via GitHub Secrets + Azure Key Vault

---

## 13. Observability & Monitoring

### 13.1 Structured Logging

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  // In production, output JSON for Azure Log Analytics
  // In development, use pino-pretty
})
```

**Log levels by context:**
| Context | Level | What to Log |
|---------|-------|-------------|
| API requests | `info` | Method, path, status, duration, user_id |
| Validation failures | `warn` | Endpoint, error details |
| Auth failures | `warn` | Endpoint, reason (no user data) |
| Unhandled errors | `error` | Stack trace, request context |
| Business events | `info` | Podcast created/updated, user role changed |

### 13.2 Error Tracking (Sentry)

- Capture all unhandled exceptions (client + server)
- Source maps uploaded on build
- User context attached (user_id only, no email)
- Performance tracing on API routes
- Session replay for debugging UI issues (optional)

### 13.3 Health Check Endpoint

```typescript
// app/api/health/route.ts
GET /api/health → { status: 'ok', timestamp: ISO, version: '2.0.0' }
```

### 13.4 Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API response time (p95) | Sentry/Azure | > 2 seconds |
| Error rate (5xx) | Sentry | > 1% of requests |
| Database connection pool | Prisma metrics / Azure Monitor | > 80% utilization |
| Storage usage | MinIO console / Azure Monitor | > 80% of quota |
| Active users (DAU/WAU) | user_activity table | Informational |
| Upload failures | Sentry | Any occurrence |

---

## 14. Performance Requirements

### 14.1 Performance Targets

| Metric | Target |
|--------|--------|
| Time to First Byte (TTFB) | < 200ms |
| Largest Contentful Paint (LCP) | < 2.5s |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| API response time (p95) | < 500ms |
| Audio start playback | < 1s after click |
| Search results | < 2s |

### 14.2 Optimization Strategies

| Strategy | Implementation |
|----------|---------------|
| Server Components | Minimize client JS; fetch data server-side |
| Image optimization | `next/image` with Azure Front Door CDN |
| Audio streaming | HLS adaptive streaming via FFmpeg + HLS.js |
| Database queries | Proper indexes, select only needed columns |
| Pagination | All list endpoints paginated (no unbounded queries) |
| Font optimization | `next/font` with subsetting |
| Bundle analysis | `@next/bundle-analyzer` in CI |
| Caching | Azure Front Door CDN for public assets, ISR for static pages |

---

## 15. Deployment & Infrastructure

### 15.1 Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| **Local** | Development | `http://localhost:3000` |
| **Preview** | PR previews (optional) | `https://pr-{number}.preview.podcasthub.com` |
| **Staging** | Pre-production testing | `https://staging.podcasthub.com` |
| **Production** | Live application | `https://podcasthub.com` |

### 15.2 Infrastructure Stack

| Component | Service |
|-----------|---------|
| **Compute** | Azure Container Apps (Docker) |
| **Database** | Azure Database for PostgreSQL Flexible Server |
| **Storage** | MinIO (dev) / Azure Blob Storage (prod) |
| **CDN** | Azure Front Door |
| **Secrets** | Azure Key Vault + GitHub Secrets |
| **Container Registry** | Azure Container Registry |
| **Monitoring** | Sentry + Azure Monitor |
| **DNS** | Azure DNS or Cloudflare |

### 15.3 Docker Configuration

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### 15.4 Local Development Setup

```bash
# 1. Clone and install
git clone <repo-url> podcast-hub-v2
cd podcast-hub-v2
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in DATABASE_URL, JWT_SECRET, MINIO_*, AZURE_OPENAI_* variables

# 3. Start local services
docker compose up -d  # Starts PostgreSQL 16 + MinIO

# 4. Set up database
npx prisma migrate dev   # Apply migrations
npx prisma db seed       # Seed initial data (if available)

# 5. Set up git hooks
npx husky install

# 6. Run development server
npm run dev

# 7. Run tests
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:e2e      # E2E tests (requires running server)
```

---

## 16. Development Workflow & Standards

### 16.1 Git Workflow

1. Create feature branch from `main`: `feat/FR-USER-002-audio-player`
2. Write tests first (TDD)
3. Implement feature
4. Run full test suite locally
5. Push and create PR
6. CI runs automatically
7. Code review (1 approval required)
8. Merge to `main` (squash merge preferred)
9. CD deploys automatically

### 16.2 Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add audio player volume control
fix: prevent bookmark duplication on rapid clicks
test: add integration tests for podcast API routes
refactor: extract pagination helper from API routes
docs: update API documentation with search endpoint
chore: upgrade Next.js to 16.2.0
```

### 16.3 Code Standards

| Standard | Tool | Config |
|----------|------|--------|
| Formatting | Prettier | `.prettierrc` — semi: false, singleQuote: true, trailingComma: 'es5' |
| Linting | ESLint 9 | Flat config, eslint-config-next, no-unused-vars as error |
| Types | TypeScript strict | No `any`, no implicit returns, strict null checks |
| Validation | Zod | Every API input validated, schemas in `lib/schemas/` |
| Imports | Absolute | `@/` alias for project root |

### 16.4 Pre-commit Hooks

```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,yml}": ["prettier --write"]
}
```

### 16.5 Code Review Standards

Reviewers check:
- [ ] Tests included for new functionality
- [ ] No `any` types or type assertions without justification
- [ ] API inputs validated with Zod
- [ ] Error handling follows established patterns
- [ ] No hardcoded secrets or configuration
- [ ] Accessible markup (semantic HTML, ARIA labels)
- [ ] No N+1 queries or unbounded data fetches

---

## 17. Migration Plan from v1

### 17.1 Data Migration

Since this is a fresh repo rebuild, data migration involves:

1. **Database schema:** Apply Prisma migrations to a new PostgreSQL 16 instance
2. **Existing podcasts:** Export from v1 database → transform to v2 schema → import via Prisma seed script
3. **Existing learning graphs:** Export and re-import (schema is largely unchanged)
4. **User accounts:** Create users table with bcrypt-hashed passwords; migrate existing user data
5. **Bookmarks & progress:** Export and re-import (schema unchanged)
6. **Storage files:** Migrate from v1 storage to MinIO (dev) or Azure Blob Storage (prod)

### 17.2 Migration Script

Create a `scripts/migrate-v1.ts` that:
1. Connects to v1 PostgreSQL database (read-only)
2. Reads all podcasts, learning graphs, episodes, edges
3. Transforms data if schema differs
4. Inserts into v2 database
5. Validates row counts match
6. Logs any discrepancies

### 17.3 Cutover Strategy

1. Deploy v2 to staging with migrated data
2. Run E2E tests against staging
3. Verify all content is accessible and playable
4. DNS switch to v2 (blue-green deployment)
5. Keep v1 running as fallback for 1 week
6. Decommission v1 after validation period

---

## 18. Feature Roadmap & Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Project scaffold with enterprise tooling, auth, and database

- [ ] Initialize Next.js project with TypeScript strict mode
- [ ] Configure ESLint 9, Prettier, Husky, lint-staged
- [ ] Set up Vitest with coverage thresholds
- [ ] Set up Playwright for E2E
- [ ] Configure CI/CD pipelines (GitHub Actions)
- [ ] Set up PostgreSQL + Prisma schema with all migrations
- [ ] Implement authentication (login, callback, middleware)
- [ ] Implement authorization (roles, RLS)
- [ ] Set up structured logging (Pino)
- [ ] Set up Sentry error tracking
- [ ] Create API error handling utilities with tests
- [ ] Create Zod schemas for all entities with tests
- [ ] Docker setup + health check endpoint
- [ ] Write tests for all foundation code

### Phase 2: Core Content (Weeks 3-4)
**Goal:** Podcast CRUD, upload, and basic library

- [ ] Podcast API routes (CRUD) with tests
- [ ] File upload (signed URLs) with validation and tests
- [ ] Admin upload form
- [ ] Admin podcast table with drag-and-drop ordering
- [ ] Admin edit podcast page
- [ ] Public library page with pagination and domain filtering
- [ ] Podcast card component
- [ ] Home page with recently added and categories
- [ ] Write integration tests for all API routes
- [ ] Write component tests for forms and cards

### Phase 3: Audio Experience (Weeks 5-6)
**Goal:** Full audio player, transcript, and bulletin viewer

- [ ] Audio player component (play, pause, seek, volume, speed)
- [ ] Duration toggle (short/long)
- [ ] PlayerContext for cross-component state
- [ ] Transcript viewer with audio sync
- [ ] Click-to-seek in transcript
- [ ] PDF bulletin viewer (react-pdf)
- [ ] Podcast detail page layout
- [ ] Write component tests for player interactions
- [ ] E2E test: browse → play → transcript sync

### Phase 4: User Features (Weeks 7-8)
**Goal:** Bookmarks, progress, profile, activity tracking

- [ ] Bookmark API (CRUD) with tests
- [ ] Bookmark panel UI with create/edit/delete
- [ ] Progress tracking API with tests
- [ ] Activity logging API with tests
- [ ] User profile page
- [ ] Progress page (completed, in-progress, history)
- [ ] Listen tracker hook
- [ ] Write tests for all user data APIs
- [ ] E2E test: bookmark flow, progress tracking

### Phase 5: Learning Paths (Weeks 9-10)
**Goal:** Learning path management and viewer

- [ ] Learning graph API routes with tests
- [ ] Bulk save (episodes + edges) API with tests
- [ ] Admin learning path list page
- [ ] Visual graph editor (XYFlow + Dagre)
- [ ] Linear path editor
- [ ] Episode sidebar with drag-and-drop
- [ ] Public learning path listing
- [ ] Learning path viewer (graph and linear modes)
- [ ] Episode playback within path context
- [ ] Progress tracking within paths
- [ ] Write integration and component tests
- [ ] E2E test: create path → add episodes → publish → view

### Phase 6: Analytics & Search (Weeks 11-12)
**Goal:** Admin analytics and search functionality

- [ ] Admin analytics API with aggregation queries
- [ ] Analytics dashboard (donut, bar, horizontal bar charts)
- [ ] Basic text search (title, description, tags)
- [ ] AI-powered semantic search (OpenAI embeddings + pgvector)
- [ ] Search results page with timestamp links
- [ ] User role management page
- [ ] Write tests for analytics and search APIs
- [ ] E2E test: search flow

### Phase 7: Hardening (Weeks 13-14)
**Goal:** Security, performance, and production readiness

- [ ] Rate limiting on all endpoints
- [ ] Security headers (CSP, HSTS, etc.)
- [ ] Performance audit (Lighthouse, bundle analysis)
- [ ] Accessibility audit (axe-core, keyboard navigation)
- [ ] Load testing (k6 or similar)
- [ ] Data migration from v1
- [ ] Staging deployment and validation
- [ ] Documentation (README, API docs, deployment guide)
- [ ] Final E2E test suite run
- [ ] Production deployment

---

## 19. Appendix: Lessons from v1

These are the specific issues identified in v1 that v2 must address:

### 19.1 What Went Wrong

| Issue | v1 Problem | v2 Solution |
|-------|-----------|-------------|
| **No testing from day 1** | Tests were bolted on late with only 3 test files | TDD from the start; tests written before implementation |
| **No pre-commit hooks** | Formatting/lint issues made it to PRs | Husky + lint-staged from project initialization |
| **No structured logging** | Only `console.error()` — impossible to debug in production | Pino with JSON output, request IDs, log levels |
| **No pagination** | All list endpoints returned unlimited rows | Every list endpoint paginated from day 1 |
| **No rate limiting** | Upload and write endpoints vulnerable to abuse | Rate limiting middleware on all endpoints |
| **No error boundaries** | Client-side crashes showed white screens | React ErrorBoundary in root layout + per-route error.tsx |
| **No monitoring** | No visibility into production errors | Sentry from day 1 with alerting |
| **CI didn't run tests** | CI only checked lint + types + build | CI runs full test suite with coverage thresholds |
| **No code formatter** | Inconsistent code style | Prettier enforced via pre-commit hook |
| **Minimal documentation** | README was boilerplate | Comprehensive README, API docs, setup guide |
| **No coverage thresholds** | No minimum test coverage enforced | 80% line coverage required to merge |
| **Console-only error reporting** | Server errors logged to stdout only | Structured logging + Sentry + request tracing |

### 19.2 What Worked Well (Keep in v2)

| Strength | Details |
|----------|---------|
| TypeScript strict mode | No `any` types, full type safety — continue this |
| Zod runtime validation | Schema-first approach for forms and APIs — expand it |
| Application-level auth | Role-based access control — expand with Prisma query filters |
| Centralized error handling | `error-response.ts` pattern — expand with request IDs |
| App Router architecture | Route groups, server/client component split — same approach |
| shadcn/ui components | Copy-paste ownership, accessible by default — keep it |
| Database migrations | Schema-driven migrations — continue with Prisma Migrate |

### 19.3 Architecture Decisions to Revisit

| Decision | v1 Approach | v2 Recommendation |
|----------|-------------|-------------------|
| State management | React Context only | Use Zustand for PlayerContext and other cross-cutting state |
| API layer | Direct database calls in components | Use Prisma in API routes with service layer for business logic |
| File storage | Supabase Storage only | MinIO (dev) → Azure Blob Storage (prod) with presigned URLs |
| Search | Placeholder with pgvector schema | Implement fully with Azure OpenAI embeddings via Prisma raw queries |
| PDF rendering | react-pdf (canvas polyfill needed) | Keep react-pdf but evaluate iframe/embed fallback for simpler implementation |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2026-03-15 | Generated from v1 analysis | Initial PRD for complete rebuild |
