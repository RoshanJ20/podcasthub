# Podcast Hub v2 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement each stage. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete enterprise audio podcast platform with transcripts, bookmarks, learning paths, and AI-powered semantic search.

**Architecture:** Next.js 16 App Router with PostgreSQL + Prisma ORM, custom JWT auth, MinIO/Azure Blob file storage, FFmpeg HLS audio streaming, and Zustand state management. Server Components by default with Client Components for interactivity.

**Tech Stack:** Next.js 16, TypeScript 5 (strict), React 19, PostgreSQL 16, Prisma, Tailwind 4, shadcn/ui, Zustand, Vitest, Playwright, Pino, Sentry.

---

## Stage Dependency Graph

```
Stage 1: Foundation
    ↓
Stage 2: Core Content ──→ Stage 3: Audio Experience
    ↓                          ↓
Stage 4: User Features ←───────┘
    ↓
Stage 5: Learning Paths
    ↓
Stage 6: Analytics & Search
    ↓
Stage 7: Hardening & Deployment
```

## Stages Overview

| Stage | Name                                              | Goal                                      | Key Deliverables                                             |
| ----- | ------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| 1     | [Foundation](stage-1-foundation.md)               | Project scaffold, tooling, auth, database | Next.js app, Prisma schema, JWT auth, CI/CD, testing infra   |
| 2     | [Core Content](stage-2-core-content.md)           | Podcast CRUD, upload, library             | Podcast API, admin upload/edit, public library, file upload  |
| 3     | [Audio Experience](stage-3-audio-experience.md)   | Audio player, transcript, PDF viewer      | HLS player, synced transcript, bulletin viewer, podcast page |
| 4     | [User Features](stage-4-user-features.md)         | Bookmarks, progress, profile              | Bookmark CRUD, progress tracking, activity logging, profile  |
| 5     | [Learning Paths](stage-5-learning-paths.md)       | Learning path management & viewer         | Graph/linear editors, path viewer, episode playback          |
| 6     | [Analytics & Search](stage-6-analytics-search.md) | Analytics dashboard, AI search            | Recharts dashboard, pgvector search, role management         |
| 7     | [Hardening](stage-7-hardening.md)                 | Security, performance, production         | Rate limiting, security headers, a11y, migration, deploy     |

## How to Use These Plans

1. **Start with Stage 1** — it creates the foundation everything depends on
2. **Each stage produces working, testable software** — commit and verify before moving on
3. **TDD is mandatory** — every task starts with a failing test
4. **Each task is ~2-15 minutes** — step-by-step with exact commands
5. **Detailed plans for later stages** should be reviewed and updated before starting them, as earlier work may shift requirements

## Reference Documents

- [CLAUDE.md](../CLAUDE.md) — Tech stack, architecture, coding standards
- [PRD](../PRD_PODCAST_HUB_V2.md) — Full product requirements
- [Code Rules](../.claude/rules/) — SOLID, naming, docs, structure, errors, logging, checklist
