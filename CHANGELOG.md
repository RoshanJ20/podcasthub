# Changelog

All notable changes to The Audit Brief are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The project is **pre-1.0**; semver guarantees do not yet apply, and breaking changes may land in any release.

Every user-facing PR adds an entry under `## [Unreleased]`. Internal-only refactors / test-only / CI-only changes do not require an entry unless they have user-facing implications.

---

## [Unreleased]

### Added

- **Streaming media proxy** — `GET /api/media?key=` now streams blobs from Azure Blob Storage without buffering into memory, with full HTTP Range support for seek-friendly audio playback. (`c80a406`, `cd6eaae`)
- **Orphan blob sweep** — `POST /api/admin/blob-sweep` (superadmin, dry-run by default) detects and deletes Azure Blob objects no longer referenced by any database row. Includes audit-log integration. (`fc00346`, `1c0f986`, `5aa9553`, `e0fff62`)
- **Admin audit log** — every mutating admin action records before/after JSON snapshots in `AdminAuditLog`, viewable at `/admin/audit-log`. (`3afd1b4`)
- **Learning-graph favorites** — new `LearningGraphFavorite` model + `GET/POST /api/learning-graph-favorites` + `useLearningGraphFavorites` hook for path favoriting in the UI. (`691b36e`)
- **Episode bookmarks** — `Bookmark` now supports timestamped notes on `Episode`s in addition to `AuditBrief`s. (`a950d61`)
- **Playback mutex** — episode player and global audio player coordinate to prevent simultaneous playback. (`b259885`)
- **Domain-aware design tokens** — card gradients, domain colors, sidebar tokens, content-width constraint for the editorial refresh. (`9dbd742`, `32e483f`)
- **Structured Azure Blob logging** — Pino logs around blob ops for easier VM-terminal debugging. (`4fd3908`)
- **basePath `/auditbrief`** — full subpath deployment support across middleware, Next.js config, and helpers. (`ab775c0`)
- **Transcript editor** — dedicated `/admin/edit/[id]/transcript` page bundled with audit-log + sidebar fixes. (`3afd1b4`)

### Changed

- **Editorial UI refresh** — home, library, detail, search, and login pages restyled. (`68cc25d`, `33ce86c`)
- **Auth migration** — replaced custom JWT auth with NextAuth v4 (Credentials + Azure AD, encrypted JWT session cookie). (`b328587`)
- **Production hardening** — SSO enforcement, security fixes, infra and deployment improvements. (`83988f4`)
- **NPM dependencies aligned** with the sibling Uno app for deployment consistency. (`5bce0b7`)

### Fixed

- **Dev-mode CSP** relaxed to unblock HMR and Fast Refresh; production CSP remains strict and nonce-based. (`f271a98`)
- **Thumbnail crop dialog** — image now renders and the Crop button is unblocked. (`4492e92`)
- **Production thumbnail rendering** — uploaded thumbnails now render correctly through the Next.js image optimizer. (`c04f6d0`)
- **basePath in middleware exclusion** — `/api/upload/file` exclusion now accounts for the `/auditbrief` prefix. (`62be2e9`)
- **Large-upload truncation** — `/api/upload/file` is excluded from edge middleware to prevent the 10 MB Edge body cap from truncating audio uploads. (`a890be3`)
- **UUID validation on graph route params** — invalid path segments are rejected before reaching Prisma. (`b493a51`)
- **SSO callback basePath** — prepends `/auditbrief` to `callbackUrl` after Azure AD login, preventing redirects to the wrong sibling app. (`1583c9c`)
- **Prisma adapter compatibility** — removed `@prisma/adapter-pg` in favor of plain `PrismaClient` for Azure PostgreSQL compatibility. (`7e43bca`)
- **Favorites migration order** — reordered to run after the rename migration. (`0df2eb8`)

### Security

- **Nonce-based CSP** — middleware generates a per-request CSP nonce, Next.js stamps it on framework scripts, and the layout injects a bootstrap script that auto-nonces runtime `<style>` elements from sonner/motion/recharts/@dnd-kit. Resolves a strict VAPT nginx policy conflict. (`f1ad4dd`)
- **Credentials login restricted in production** — only Azure AD SSO is permitted in non-dev environments. Local credentials remain available for development. (`2149589`)
- **npm audit fixes** — resolved 15 dependency vulnerabilities. (`e59f29f`)

### Removed

- **`@prisma/adapter-pg` dependency** — replaced with plain `PrismaClient`. (`7e43bca`)

### Infrastructure / CI

- **Azure Pipelines CI** scaffold added (`4e3d347`); GitHub Actions remains the primary CI for now.
- **`.worktrees/` ignored** for parallel local checkouts. (`ec75c0a`)

---

## How to read this changelog

- Entries are grouped by Keep-a-Changelog categories (Added / Changed / Fixed / Security / Removed / Deprecated).
- Commit SHAs in parentheses link to the merge or feature commit on `main`.
- Once we ship a tagged release, the `[Unreleased]` block becomes `[X.Y.Z] — YYYY-MM-DD` and a fresh `[Unreleased]` is created above it.
