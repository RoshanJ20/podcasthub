# The Audit Brief — Architecture Diagrams

Each diagram is a separate `.mmd` file that can be opened in any Mermaid renderer (VS Code Mermaid extension, mermaid.live, GitHub, etc.). For a single document that embeds rendered versions of the top-level system diagrams, see [`../architecture-diagrams.md`](../architecture-diagrams.md).

| #   | Diagram               | File                                                       | Description                                                                    |
| --- | --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 0   | Architecture Overview | [0-architecture-overview.mmd](0-architecture-overview.mmd) | Simplified view — containers, data flow, external services                     |
| 1   | System Context        | [1-system-context.mmd](1-system-context.mmd)               | C4 Level 1 — actors and external systems                                       |
| 2   | Container Diagram     | [2-container-diagram.mmd](2-container-diagram.mmd)         | C4 Level 2 — browser, Next.js server, libraries, infra                         |
| 3   | Authentication Flow   | [3-auth-flow.mmd](3-auth-flow.mmd)                         | NextAuth session cookie flow (Credentials + Azure AD SSO)                      |
| 4   | Audio Pipeline        | [4-audio-pipeline.mmd](4-audio-pipeline.mmd)               | Upload → Azure Blob → `/api/media` streaming proxy → HLS.js / HTML5 playback   |
| 5   | Semantic Search       | [5-semantic-search.mmd](5-semantic-search.mmd)             | Azure OpenAI embeddings + pgvector cosine similarity                           |
| 6   | Learning Path Model   | [6-learning-path-model.mmd](6-learning-path-model.mmd)     | Linear path structure — LearningGraph, Episode, LearningPathEdge, UserProgress |
| 7   | Request Lifecycle     | [7-request-lifecycle.mmd](7-request-lifecycle.mmd)         | Full request flow through middleware (auth, CSP nonce, request-id) → handler   |

---

## Conventions

- **Source of truth:** the application code under `app/`, `lib/`, `components/`, and `prisma/schema.prisma`. Diagrams document the system; they don't define it.
- **Naming:** the canonical content entity is **AuditBrief** (the codebase no longer uses "Podcast"). Diagrams use AuditBrief / LearningGraph / Episode consistently.
- **Auth:** NextAuth v4 with an encrypted JWT session cookie. There is no separate `/api/auth/login`, `/api/auth/logout`, or `/api/auth/refresh` route — all NextAuth flows go through `/api/auth/[...nextauth]`.
- **Storage:** Azure Blob Storage (Azurite locally) with a private container, accessed via presigned SAS URLs for uploads and through the `/api/media` streaming proxy for downloads.
- **Sentry:** environment placeholders exist but the SDK is **not currently initialized**. Diagrams label it accordingly.
- **Versions:** Next.js 15.3.x, React 19.2, PostgreSQL 16 + pgvector, Node.js 20 LTS.

## How to update

1. Edit the relevant `.mmd` file in this directory.
2. If the change is structurally significant, also update the corresponding embedded diagram in [`../architecture-diagrams.md`](../architecture-diagrams.md) so the two stay in sync.
3. Render locally (VS Code Mermaid preview or `npx @mermaid-js/mermaid-cli`) to confirm the diagram parses.
4. Cross-check that no labels mention features or services the code no longer has (run a grep for terms like `Podcast`, `xyflow`, `MinIO`, `S3 client`, `JWT cookies` (without "NextAuth"), `Next.js 16`).
