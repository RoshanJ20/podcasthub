# Contributing to The Audit Brief

Thank you for working on The Audit Brief. This guide covers everything you need from cloning the repo to merging a pull request. It intentionally points at the existing rule files instead of restating them — `.claude/rules/` is the single source of truth for coding standards.

## Table of Contents

1. [Quick start](#1-quick-start)
2. [Branching](#2-branching)
3. [Commit messages](#3-commit-messages)
4. [Pre-commit hooks](#4-pre-commit-hooks)
5. [Test-Driven Development (mandatory)](#5-test-driven-development-mandatory)
6. [Coding standards](#6-coding-standards)
7. [Pull request process](#7-pull-request-process)
8. [Test commands cheatsheet](#8-test-commands-cheatsheet)
9. [Reporting issues](#9-reporting-issues)
10. [Changelog discipline](#10-changelog-discipline)

---

## 1. Quick start

```bash
git clone <repo-url> the-audit-brief
cd the-audit-brief
npm install                # `prepare` script installs Husky v9 git hooks
cp .env.example .env       # fill in DATABASE_URL, NEXTAUTH_SECRET, AZURE_BLOB_*, …
docker compose up -d       # PostgreSQL 16 (pgvector) + Azurite blob emulator
npx prisma migrate dev     # apply migrations to local DB
npm run db:seed            # seed initial data (runs prisma/seed.ts)
npm run dev                # http://localhost:3000/auditbrief
```

If you intend to touch authentication, set `AZURE_AD_*` and follow [README.md → Authentication & SSO](README.md#authentication--sso). For semantic search work, set `AZURE_OPENAI_*` per [.env.example](.env.example).

## 2. Branching

Branch from `main`. Use the following prefixes — the type should match the eventual commit type (see §3):

| Prefix      | When to use                                                      |
| ----------- | ---------------------------------------------------------------- |
| `feat/`     | New user-facing feature                                          |
| `fix/`      | Bug fix                                                          |
| `chore/`    | Build / tooling / dependency changes (no user-visible behaviour) |
| `docs/`     | Documentation only                                               |
| `refactor/` | Code restructuring without behaviour change                      |
| `test/`     | Test-only changes                                                |
| `perf/`     | Performance optimisation                                         |
| `security/` | Security hardening (CSP, auth, dependency vulnerabilities, etc.) |
| `revert/`   | Reverting a previous commit                                      |

Branch names should be short and descriptive: `feat/streaming-media-proxy`, `fix/upload-body-truncation`, `security/nonce-csp`.

## 3. Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Subject line ≤72 characters, imperative mood, no trailing period.

```text
<type>(<scope>): <subject>

<body>            <-- optional, wrap at 100 chars, explain WHY

<footer>          <-- optional (BREAKING CHANGE, Closes #123)
```

Approved types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `security`, `revert`, `build`, `ci`.

Recent examples (from `git log`):

```text
feat(ui): editorial refresh for home, library, detail, search, login
fix(security): relax CSP in dev mode to unblock HMR and Fast Refresh
fix(security): nonce-based CSP to satisfy strict VAPT nginx policy
feat: add structured Azure Blob Storage logging for VM terminal debugging
fix: render image in thumbnail crop dialog and unblock Crop button
```

## 4. Pre-commit hooks

The repo uses [Husky v9](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged). The `prepare` script in [package.json](package.json) installs hooks on `npm install`; no manual `husky install` step is needed.

On every `git commit`:

- **ESLint** runs on staged `*.{ts,tsx,js,jsx}` files (auto-fix where possible).
- **Prettier** runs on staged files (auto-format where possible).

`npm run typecheck` is **not** part of the pre-commit hook (it would slow commits down materially) but **is** enforced in CI. Run it locally before opening a PR.

If a hook fails:

1. Read the message.
2. Fix the issue at its root (don't `--no-verify`).
3. Re-stage and re-commit.

## 5. Test-Driven Development (mandatory)

TDD is a hard requirement per [.claude/rules/checklist.md](.claude/rules/checklist.md). The cycle:

1. **Red** — write a failing test that describes the new behaviour.
2. **Green** — write the minimum implementation to make it pass.
3. **Refactor** — clean up with the tests green.

Test stack:

- **Vitest 4** + **React Testing Library** + **MSW** (mock service worker) for unit and integration tests under `__tests__/unit/` and `__tests__/integration/`.
- **Playwright** (Chromium) for end-to-end tests under `__tests__/e2e/`.
- CSP-specific E2E tests run via the separate [playwright.csp.config.ts](playwright.csp.config.ts) suite.

Test file naming mirrors source layout (`__tests__/unit/lib/storage.test.ts` covers `lib/storage.ts`).

## 6. Coding standards

All code must adhere to the eight rule files in [.claude/rules/](.claude/rules/). Before opening a PR, walk through [.claude/rules/checklist.md](.claude/rules/checklist.md).

| Rule                                                                       | Summary                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [SOLID Principles](.claude/rules/solid-principles.md)                      | Single responsibility, open/closed, Liskov, ISP, DIP          |
| [Naming Conventions](.claude/rules/naming-conventions.md)                  | Casing per layer, intention-revealing names, no abbreviations |
| [README & Deployment Documentation](.claude/rules/readme-documentation.md) | Every project doc must follow the 13-section structure        |
| [Code Documentation](.claude/rules/code-documentation.md)                  | Module + class + function docstrings; comment WHY, not WHAT   |
| [Project Structure](.claude/rules/project-structure.md)                    | Layered architecture, ≤300 lines/file, ≤50 lines/function     |
| [Error Handling & Resilience](.claude/rules/error-handling.md)             | Specific errors, fail fast, idempotency, timeouts + retries   |
| [Logging & Observability](.claude/rules/logging-observability.md)          | Structured Pino logs, correlation IDs, no PII, RED metrics    |
| [Quick-Reference Checklist](.claude/rules/checklist.md)                    | Run this before every PR                                      |

**Hard rules worth re-stating here:**

- TypeScript strict mode — no `any`. Path alias `@/*` maps to project root.
- No `console.log` in production code; use `lib/logger.ts`.
- No inline `<style>…</style>` JSX nodes (CSP forbids them). Inline `style={{}}` attributes are fine.
- No external CDNs for scripts/styles/fonts — see [README → Content Security Policy](README.md#content-security-policy).
- All external input validated at the API boundary with Zod schemas from [lib/schemas/](lib/schemas/).
- Database access only via [lib/db.ts](lib/db.ts) (the Prisma client singleton).

## 7. Pull request process

1. Branch from `main`, push to your fork or feature branch.
2. Make changes with TDD. Keep commits atomic and conventional.
3. Run the full local pipeline before opening:
   ```bash
   npm run lint
   npm run format:check
   npm run typecheck
   npm test
   ```
4. Open a PR against `main`. The PR description should explain **why** the change is needed — link to the relevant issue, plan in [docs/superpowers/plans/](docs/superpowers/plans/), or design in [docs/superpowers/specs/](docs/superpowers/specs/).
5. CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs lint, format check, typecheck, Prisma migrations, Vitest with coverage, and `next build`. All must be green.
6. Require at least one reviewer approval.
7. Squash-merge into `main`. Conventional Commits formatting in the squash message.
8. Add a `## [Unreleased]` entry to [CHANGELOG.md](CHANGELOG.md) (see §10).

### When NOT to skip CI

Never use `--no-verify` to bypass pre-commit hooks. Never bypass branch protection. If a hook or CI step is flaky, fix the root cause; don't paper over it.

## 8. Test commands cheatsheet

```bash
npm test                    # Vitest run (unit + integration)
npm run test:watch          # Vitest watch mode
npm run test:coverage       # Vitest + v8 coverage report

npm run test:e2e            # Playwright (Chromium)
npm run test:e2e:ui         # Playwright UI mode

npm run lint                # ESLint
npm run lint:fix            # ESLint --fix
npm run format              # Prettier write
npm run format:check        # Prettier verify
npm run typecheck           # tsc --noEmit

npm run db:seed             # prisma/seed.ts
npx prisma migrate dev      # Apply migrations in dev
npx prisma migrate status   # Check migration state
```

## 9. Reporting issues

- **Bugs:** open a GitHub issue with reproduction steps, expected vs actual behaviour, and environment details (browser, OS, deployment).
- **Security vulnerabilities:** do **not** open a public issue. Email the maintainer or use GitHub's "Report a vulnerability" private disclosure.
- **Feature requests:** open a GitHub issue tagged `enhancement`. For larger changes, consider drafting a plan in `docs/superpowers/plans/YYYY-MM-DD-<slug>.md` first.

## 10. Changelog discipline

Every user-facing change adds an entry to [CHANGELOG.md](CHANGELOG.md) under the `## [Unreleased]` heading, using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) sub-headings:

- **Added** — new features
- **Changed** — non-breaking modifications to existing behaviour
- **Deprecated** — soon-to-be-removed features
- **Removed** — features removed in this release
- **Fixed** — bug fixes
- **Security** — security-relevant changes

Internal-only refactors, test additions, and CI tweaks don't need a CHANGELOG entry unless they have user-facing implications.
