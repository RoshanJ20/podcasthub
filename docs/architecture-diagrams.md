# The Audit Brief — Architecture Diagrams

> The canonical entities in this project are **AuditBrief** (a piece of audio content with transcript + bulletins), **LearningGraph** (a sequence of episodes), and **Episode** (a node in a learning graph). Earlier iterations called the content "Podcast" — that name is gone from the code and from these diagrams. C4-style source diagrams live in [architecture/](architecture/).

## 1. Frontend Architecture

```mermaid
graph TB
    subgraph "Next.js App Router"
        direction TB
        RootLayout["Root Layout<br/>(SessionProvider, ThemeProvider,<br/>NonceProvider, AudioProvider)"]

        subgraph "Route Group: (auth)"
            Login["/login<br/>LoginForm + SSO Button"]
            Register["/register<br/>RegisterForm"]
            Unauthorized["/unauthorized<br/>403 Page"]
        end

        subgraph "Route Group: (public)"
            Home["/<br/>Home Card Grid"]
            Bulletins["/bulletins<br/>AuditBrief Grid + Filters"]
            AuditBriefDetail["/audit-brief/[id]<br/>AudioPlayer + Transcript + Bulletins"]
            Search["/search<br/>Keyword + Semantic Search"]
            LearningPaths["/learning-path<br/>Path List"]
            LearningPathDetail["/learning-path/[id]<br/>Linear Episode Viewer"]
            Progress["/progress<br/>User Progress Dashboard"]
        end

        subgraph "Route Group: (admin)"
            AdminDash["/admin<br/>AuditBrief Management"]
            Upload["/admin/upload<br/>AuditBriefUploadWizard"]
            EditBrief["/admin/edit/[id]<br/>EditAuditBriefClient"]
            EditTranscript["/admin/edit/[id]/transcript<br/>TranscriptEditor"]
            LearningGraphsMgmt["/admin/learning-graphs<br/>Path Management Table"]
            LearningGraphsNew["/admin/learning-graphs/new"]
            LearningGraphsEdit["/admin/learning-graphs/[id]<br/>Linear Editor"]
            Analytics["/admin/analytics<br/>Recharts Dashboard"]
            UserMgmt["/admin/users<br/>User Table + Role Assignment"]
            AuditLog["/admin/audit-log<br/>AdminAuditLog Viewer"]
        end
    end

    subgraph "Shared Components"
        direction LR
        ShadcnUI["shadcn/ui<br/>(Button, Card, Dialog,<br/>Table, Input, etc.)"]
        AudioStack["Audio Player Stack<br/>(GlobalAudioPlayer,<br/>CompactPlayer,<br/>TranscriptViewer,<br/>BulletinViewer,<br/>BookmarkPanel)"]
        LayoutComps["Layout<br/>(UnifiedSidebar,<br/>MobileTopBar,<br/>MobileBottomPlayer,<br/>CommandPalette)"]
    end

    subgraph "State Management (Zustand)"
        PlayerStore["PlayerStore<br/>currentAuditBrief, isPlaying,<br/>currentTime, volume,<br/>playbackRate, audioType"]
        GraphEditorStore["GraphEditorStore<br/>nodes, edges, selection,<br/>dirty flag, auto-save"]
    end

    subgraph "Custom Hooks"
        useHls["useHlsPlayer()<br/>HLS.js + native audio"]
        useUpload["useFileUpload()<br/>Presigned SAS + XHR progress"]
        useTracker["useListenTracker()<br/>30s activity log"]
        useSync["useTranscriptSync()<br/>segment highlighting"]
        useUnsaved["useUnsavedChangesWarning()"]
        useWizard["useWizardState()"]
        useFavorites["useFavorites() +<br/>useLearningGraphFavorites()"]
    end

    RootLayout --> Login & Register & Unauthorized
    RootLayout --> Home & Bulletins & AuditBriefDetail & Search & LearningPaths & LearningPathDetail & Progress
    RootLayout --> AdminDash & Upload & EditBrief & EditTranscript & LearningGraphsMgmt & LearningGraphsNew & LearningGraphsEdit & Analytics & UserMgmt & AuditLog

    AuditBriefDetail --> AudioStack
    AuditBriefDetail --> PlayerStore
    AudioStack --> useHls
    AudioStack --> useSync
    AudioStack --> useTracker
    Upload --> useUpload & useWizard
    LearningGraphsEdit --> GraphEditorStore
    LayoutComps --> PlayerStore

    style RootLayout fill:#1e293b,color:#fff
    style PlayerStore fill:#7c3aed,color:#fff
    style GraphEditorStore fill:#7c3aed,color:#fff
```

---

## 2. Backend Architecture

```mermaid
graph TB
    subgraph "Client Request"
        Browser["Browser / Client"]
    end

    subgraph "Edge Middleware Layer"
        MW["middleware.ts<br/>(JWT verify via getToken,<br/>CSP nonce generation,<br/>request-id propagation)"]
        MW -->|"Set Headers"| Headers["x-request-id<br/>x-nonce<br/>x-user-id<br/>x-user-email<br/>x-user-role"]
        MW -->|"Auth check"| SessionCheck["NextAuth Session<br/>(encrypted JWT cookie)"]
    end

    subgraph "API Routes Layer"
        direction TB

        subgraph "Auth APIs"
            NextAuthAPI["GET/POST /api/auth/[...nextauth]"]
            AuthRegister["POST /api/auth/register"]
        end

        subgraph "Content APIs"
            AuditBriefsList["GET /api/audit-briefs"]
            AuditBriefCreate["POST /api/audit-briefs"]
            AuditBriefGet["GET /api/audit-briefs/[id]"]
            AuditBriefUpdate["PUT /api/audit-briefs/[id]"]
            AuditBriefDelete["DELETE /api/audit-briefs/[id]"]
            AuditBriefBatch["POST /api/audit-briefs/batch"]
            TranscriptGet["GET /api/audit-briefs/[id]/transcript"]
            TranscriptUpdate["PUT /api/audit-briefs/[id]/transcript"]
        end

        subgraph "Learning Graph APIs"
            GraphList["GET /api/learning-graphs"]
            GraphCreate["POST /api/learning-graphs"]
            GraphGet["GET /api/learning-graphs/[id]"]
            GraphUpdate["PUT /api/learning-graphs/[id]"]
            GraphDelete["DELETE /api/learning-graphs/[id]"]
            GraphDataSave["PUT /api/learning-graphs/[id]/data<br/>(bulk episode + edge upsert)"]
        end

        subgraph "Search APIs"
            SearchKeyword["GET /api/search?q=…"]
            SearchSemantic["POST /api/search<br/>(pgvector + Azure OpenAI)"]
        end

        subgraph "User Feature APIs"
            BookmarksCRUD["GET/POST /api/bookmarks +<br/>GET/PUT/DELETE /api/bookmarks/[id]"]
            FavoritesToggle["GET/POST /api/favorites"]
            GraphFavToggle["GET/POST /api/learning-graph-favorites"]
            ProgressCRUD["GET/POST /api/progress +<br/>GET/PUT /api/progress/[id]"]
            ActivityLog["POST /api/activity<br/>(fire-and-forget)"]
        end

        subgraph "Media + Upload APIs"
            UploadPresigned["POST /api/upload<br/>(presigned SAS URL)"]
            UploadMultipart["POST /api/upload/file<br/>(20 MB body cap)"]
            MediaProxy["GET /api/media?key=<br/>(streaming proxy w/ HTTP Range)"]
        end

        subgraph "Health"
            HealthAPI["GET /api/health (liveness)"]
            ReadyAPI["GET /api/ready (DB ping)"]
        end

        subgraph "Admin APIs"
            AdminAnalytics["POST /api/admin/analytics"]
            BlobSweep["POST /api/admin/blob-sweep<br/>(superadmin, dry-run by default)"]
            UsersList["GET /api/users"]
            UsersCreate["POST /api/users"]
            UserGet["GET /api/users/[id]"]
            UserRole["PUT /api/users/[id]/role<br/>(superadmin only)"]
        end
    end

    subgraph "Service Layer (lib/)"
        direction TB
        AuthService["lib/auth/<br/>next-auth-options.ts,<br/>password.ts,<br/>session-helpers.ts,<br/>prisma-adapter.ts,<br/>token-revocation.ts"]
        APIUtils["lib/api/<br/>errors.ts, pagination.ts,<br/>rate-limit.ts, cors.ts,<br/>request-context.ts, request-logging.ts"]
        Schemas["lib/schemas/<br/>Zod validation<br/>(audit-brief, learning-graph,<br/>bookmark, user, common, admin)"]
        Storage["lib/storage.ts + lib/storage-*.ts<br/>(Azure Blob ops, streaming)"]
        Embeddings["lib/embeddings.ts<br/>(Azure OpenAI, retry + backoff)"]
        AdminOps["lib/admin/<br/>audit-log, blob-sweep,<br/>concurrency, revalidate"]
        Security["lib/security/csp.ts<br/>(nonce + policy assembly)"]
        Logger["lib/logger.ts<br/>(Pino structured logging)"]
        Prisma["lib/db.ts +<br/>lib/db-instrumentation.ts<br/>(Prisma + slow-query logging)"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL 16<br/>(pgvector extension)"]
        AzureBlob["Azure Blob Storage<br/>(private container,<br/>SAS-signed access)"]
    end

    Browser --> MW
    MW --> Headers
    Headers -->|"Route to"| NextAuthAPI & AuditBriefsList & GraphList & BookmarksCRUD & AdminAnalytics & MediaProxy

    AuditBriefCreate --> Schemas --> APIUtils
    SearchSemantic --> Embeddings
    UploadPresigned --> Storage
    MediaProxy --> Storage
    AdminAnalytics --> AdminOps

    AuthService --> Prisma
    APIUtils --> Prisma
    AdminOps --> Prisma
    Prisma --> PG
    Storage --> AzureBlob
    Logger -.->|"All layers"| AuthService & APIUtils & AdminOps & Storage

    style MW fill:#f59e0b,color:#000
    style PG fill:#336791,color:#fff
    style AzureBlob fill:#0078d4,color:#fff
```

---

## 3. Database Schema (Entity Relationship)

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). Field lists below are abbreviated; consult the schema for the authoritative shape.

```mermaid
erDiagram
    User {
        UUID id PK
        String email UK "unique"
        String passwordHash
        String displayName
        String entraId "Azure AD object id (nullable)"
        String authProvider "credentials | entra_id | both"
        String role "public | admin | superadmin"
        DateTime emailVerified
        DateTime createdAt
        DateTime updatedAt
    }

    Account {
        UUID id PK
        UUID userId FK
        String provider
        String providerAccountId
        String refresh_token
        String access_token
    }

    Session {
        UUID id PK
        String sessionToken UK
        UUID userId FK
        DateTime expires
    }

    AuditBrief {
        UUID id PK
        String title
        String description
        String domain "e.g. audit, tax, advisory"
        Int year
        StringArr tags
        String audioShortUrl "blob key"
        String audioLongUrl "blob key (nullable)"
        String thumbnailUrl "blob key"
        StringArr bulletinUrls "PDF blob keys"
        Int sortOrder
        Boolean isArchived
        DateTime createdAt
        DateTime updatedAt
    }

    Transcript {
        UUID id PK
        UUID auditBriefId FK
        String transcriptType "short | long"
        String fullText
        Json segments "timestamped"
        Vector embedding "pgvector(1536)"
        DateTime createdAt
        DateTime updatedAt
    }

    LearningGraph {
        UUID id PK
        String title
        String description
        String domain
        String pathType "linear"
        String thumbnailUrl
        UUID createdBy FK
        Boolean isPublished
        DateTime createdAt
        DateTime updatedAt
    }

    Episode {
        UUID id PK
        UUID graphId FK
        String title
        String description
        String thumbnailUrl
        String audioUrl "blob key"
        Json transcript
        Float positionX
        Float positionY
        String nodeType "start | default | milestone | end"
        Int sortOrder
        DateTime createdAt
        DateTime updatedAt
    }

    LearningPathEdge {
        UUID id PK
        UUID graphId FK
        UUID sourceEpisodeId FK
        UUID targetEpisodeId FK
        String label
        DateTime createdAt
    }

    Favorite {
        UUID id PK
        UUID userId FK
        UUID auditBriefId FK
        DateTime createdAt
    }

    LearningGraphFavorite {
        UUID id PK
        UUID userId FK
        UUID learningGraphId FK
        DateTime createdAt
    }

    Bookmark {
        UUID id PK
        UUID userId FK
        UUID auditBriefId FK "nullable"
        UUID episodeId FK "nullable"
        Int timestampSeconds
        String note
        DateTime createdAt
        DateTime updatedAt
    }

    UserProgress {
        UUID id PK
        UUID userId FK
        UUID graphId FK
        UUID episodeId FK
        DateTime completedAt
    }

    UserActivity {
        UUID id PK
        UUID userId FK
        String activityType "listen | bookmark | complete_episode | view_path | search"
        UUID auditBriefId FK "nullable"
        UUID episodeId FK "nullable"
        UUID graphId FK "nullable"
        Json metadata
        DateTime createdAt
    }

    AdminAuditLog {
        UUID id PK
        UUID actorId FK "nullable"
        String actorEmail
        String action "create | update | archive | hard_delete | …"
        String entityType "audit_brief | learning_graph | transcript | episode | blob_storage"
        String entityId
        Json before
        Json after
        String requestId
        DateTime createdAt
    }

    User ||--o{ Account : "OAuth accounts"
    User ||--o{ Session : "NextAuth sessions"
    User ||--o{ Bookmark : "creates"
    User ||--o{ Favorite : "favorites"
    User ||--o{ LearningGraphFavorite : "favorites path"
    User ||--o{ UserProgress : "tracks"
    User ||--o{ UserActivity : "logs"
    User ||--o{ LearningGraph : "creates"
    User ||--o{ AdminAuditLog : "actor"

    AuditBrief ||--o{ Transcript : "has transcripts"
    AuditBrief ||--o{ Bookmark : "bookmarked in"
    AuditBrief ||--o{ Favorite : "favorited"

    LearningGraph ||--o{ Episode : "contains"
    LearningGraph ||--o{ LearningPathEdge : "has edges"
    LearningGraph ||--o{ LearningGraphFavorite : "favorited"

    Episode ||--o{ UserProgress : "tracked"
    Episode ||--o{ Bookmark : "bookmarked in"
    Episode ||--o| LearningPathEdge : "source of"
    Episode ||--o| LearningPathEdge : "target of"
```

---

## 4. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Tier"
        WebApp["Web Browser<br/>(React 19 + Next.js)"]
        HLS["HLS.js<br/>Adaptive Streaming"]
    end

    subgraph "Azure VM (Ubuntu 22.04)"
        Nginx["Nginx<br/>(SSL termination, :80/:443)"]
        PM2["pm2 Process Manager"]
        NextJS["Next.js 15.3 Standalone<br/>(Node.js 20 LTS, :3103)"]
        Middleware["NextAuth Middleware<br/>(JWT cookie + CSP nonce<br/>+ request-id)"]
    end

    subgraph "Azure Managed Services"
        PostgreSQL["Azure Database for<br/>PostgreSQL Flexible Server<br/>(16 + pgvector)"]
        BlobStorage["Azure Blob Storage<br/>Audio, PDFs, Thumbnails<br/>(private container,<br/>SAS-signed)"]
        OpenAI["Azure OpenAI<br/>(text-embedding-3-large)"]
        EntraID["Microsoft Entra ID<br/>(SSO, optional)"]
    end

    subgraph "Local Dev"
        DockerCompose["Docker Compose"]
        PGLocal["PostgreSQL 16<br/>(pgvector)"]
        Azurite["Azurite<br/>(Blob Storage Emulator)"]
    end

    WebApp -->|"HTTPS :443"| Nginx
    HLS -->|"HLS streams via /api/media"| Nginx
    Nginx -->|"proxy_pass :3103"| PM2
    PM2 --> NextJS
    NextJS --> Middleware
    Middleware -->|"Prisma ORM"| PostgreSQL
    Middleware -->|"Streaming proxy +<br/>presigned SAS"| BlobStorage
    NextJS -.->|"Embeddings (semantic search)"| OpenAI
    NextJS -.->|"OAuth2 / OIDC"| EntraID

    DockerCompose --> PGLocal & Azurite

    style Nginx fill:#009639,color:#fff
    style PostgreSQL fill:#336791,color:#fff
    style BlobStorage fill:#0078d4,color:#fff
    style Azurite fill:#0078d4,color:#fff
    style NextJS fill:#000,color:#fff
```

---

## 5. End-to-End Product Flow

```mermaid
flowchart TB
    subgraph "Admin Content Ingestion"
        A1["Admin logs in"] --> A2["Navigate to /admin/upload"]
        A2 --> A3["AuditBriefUploadWizard<br/>Step 1: Details<br/>(title, domain, year, tags)"]
        A3 --> A4["Step 2: Files<br/>(audio short/long, thumbnail,<br/>bulletin PDFs)"]
        A4 --> A5["Step 3: Metadata<br/>(description, sort order)"]
        A5 --> A6["Step 4: Review & Submit"]
        A4 -->|"POST /api/upload<br/>(presigned SAS)"| A8["Client PUT direct to<br/>Azure Blob (private container)"]
        A6 -->|"POST /api/audit-briefs"| A7["Server validates (Zod)<br/>Stores blob keys in PostgreSQL<br/>AdminAuditLog records before/after"]
    end

    subgraph "Transcript Pipeline"
        T1["PUT /api/audit-briefs/[id]/transcript"] -->|"Triggered on transcript edit"| T2["lib/embeddings.ts<br/>Azure OpenAI<br/>(text-embedding-3-large)"]
        T2 --> T3["pgvector(1536) embedding<br/>persisted on Transcript row"]
    end

    subgraph "User Entry"
        U1["User logs in<br/>(/login → NextAuth session cookie)"] --> U2["Home page"]
        U2 --> U3{"Three main features"}
    end

    subgraph "Feature 1: Audit Briefs"
        U3 -->|"Audit Briefs"| TC1["/bulletins<br/>Browse AuditBriefs"]
        TC1 --> TC2["Filter by domain, year, tags<br/>+ inline search bar"]
        TC2 --> TC3["Select a brief"]
        TC3 --> TC4["/audit-brief/[id]<br/>Detail Page"]
        TC4 --> TC5["AudioPlayer<br/>(HTML5 + HLS.js,<br/>/api/media streaming proxy)"]
        TC5 --> TC6["TranscriptViewer<br/>(auto-synced highlighting)"]
        TC5 --> TC7["BulletinViewer<br/>(react-pdf)"]
        TC5 --> TC8["BookmarkPanel<br/>(POST /api/bookmarks)"]
        TC5 -->|"Every 30s"| TC9["useListenTracker<br/>POST /api/activity"]
        TC4 --> TC10["Favorite toggle<br/>POST /api/favorites"]
    end

    subgraph "Feature 2: Learning Paths"
        U3 -->|"Learning Paths"| LS1["/learning-path<br/>Browse all paths"]
        LS1 --> LS2["Filter by domain<br/>+ inline search bar"]
        LS2 --> LS3["Select a path"]
        LS3 --> LS4["/learning-path/[id]<br/>Linear Episode Viewer"]
        LS4 --> LS5["View episodes in order"]
        LS5 --> LS6["Play episode audio"]
        LS6 --> LS7["Mark complete<br/>POST /api/progress"]
        LS7 --> LS8["/progress<br/>Track completion %"]
        LS4 --> LS9["Favorite path<br/>POST /api/learning-graph-favorites"]
    end

    subgraph "Feature 3: Semantic Search"
        U3 -->|"Search"| SR1["/search"]
        SR1 -->|"keyword"| SR2["GET /api/search?q=…<br/>(case-insensitive title/desc/tags)"]
        SR1 -->|"semantic"| SR3["POST /api/search<br/>(embed query → pgvector cosine)"]
        SR3 --> SR4["Ranked transcript segments<br/>across all AuditBriefs"]
    end

    subgraph "Admin Operations"
        TC9 --> AN1["UserActivity rows<br/>aggregated"]
        AN1 --> AN2["/admin/analytics<br/>Recharts dashboard"]
        AdminOpsRoot["/admin"] --> AN3["/admin/audit-log<br/>AdminAuditLog viewer"]
        AdminOpsRoot --> AN4["/admin/users<br/>Role assignment (superadmin)"]
        AdminOpsRoot --> AN5["POST /api/admin/blob-sweep<br/>Orphan blob cleanup (superadmin)"]
    end

    style A1 fill:#f59e0b,color:#000
    style U1 fill:#3b82f6,color:#fff
    style AN2 fill:#8b5cf6,color:#fff
    style TC1 fill:#0d9488,color:#fff
    style LS1 fill:#2563eb,color:#fff
    style SR1 fill:#db2777,color:#fff
```

---

## 6. API Endpoint Map

```mermaid
graph LR
    subgraph "Authentication"
        direction TB
        NextAuth["GET\|POST /api/auth/[...nextauth]<br/>(NextAuth v4 routes:<br/>signin, callback/credentials,<br/>callback/azure-ad, signout,<br/>session, csrf)"]
        POST_register["POST /api/auth/register<br/>📥 email, password, displayName<br/>📤 user created"]
    end

    subgraph "Audit Briefs"
        direction TB
        GET_briefs["GET /api/audit-briefs<br/>📥 ?page, limit, domain, year, tags, sort<br/>📤 paginated audit-brief list"]
        POST_brief["POST /api/audit-briefs<br/>🔒 Admin only<br/>📥 Zod-validated payload<br/>📤 created brief + AuditLog entry"]
        GET_brief["GET /api/audit-briefs/[id]<br/>📤 brief + transcripts"]
        PUT_brief["PUT /api/audit-briefs/[id]<br/>🔒 Admin only<br/>📥 updated fields<br/>📤 updated brief"]
        DELETE_brief["DELETE /api/audit-briefs/[id]<br/>🔒 Admin only<br/>📤 archive or hard-delete<br/>(blobs cleaned on hard-delete)"]
        POST_batch["POST /api/audit-briefs/batch<br/>🔒 Admin only<br/>📥 batch op (archive/delete)"]
        GET_transcript["GET /api/audit-briefs/[id]/transcript<br/>📥 ?type=short\|long<br/>📤 transcript segments"]
        PUT_transcript["PUT /api/audit-briefs/[id]/transcript<br/>🔒 Admin only<br/>📥 fullText<br/>📤 regenerates pgvector embedding"]
    end

    subgraph "Learning Graphs"
        direction TB
        GET_graphs["GET /api/learning-graphs<br/>📥 ?page, limit, domain<br/>📤 paginated paths"]
        POST_graph["POST /api/learning-graphs<br/>🔒 Admin only"]
        GET_graph["GET /api/learning-graphs/[id]<br/>📤 path + episodes + edges"]
        PUT_graph["PUT /api/learning-graphs/[id]<br/>🔒 Admin only"]
        DELETE_graph["DELETE /api/learning-graphs/[id]<br/>🔒 Admin only"]
        PUT_data["PUT /api/learning-graphs/[id]/data<br/>🔒 Admin only<br/>📥 episodes + edges (with temp-IDs)<br/>📤 reconciled graph (real IDs)"]
    end

    subgraph "Search"
        direction TB
        GET_search["GET /api/search<br/>📥 ?q=…<br/>📤 keyword matches"]
        POST_search["POST /api/search<br/>📥 { query }<br/>📤 segments ranked by cosine similarity"]
    end

    subgraph "User Features"
        direction TB
        GET_bookmarks["GET /api/bookmarks<br/>🔒 Auth<br/>📥 ?auditBriefId or ?episodeId<br/>📤 user bookmarks"]
        POST_bookmark["POST /api/bookmarks<br/>🔒 Auth<br/>📥 { auditBriefId\|episodeId, timestampSeconds, note }"]
        CRUD_bookmark["GET/PUT/DELETE /api/bookmarks/[id]<br/>🔒 Auth"]
        GET_favs["GET /api/favorites<br/>🔒 Auth<br/>📤 string[] of favorited briefs"]
        POST_fav["POST /api/favorites<br/>🔒 Auth<br/>📥 { auditBriefId }<br/>📤 { favorited: boolean }"]
        GET_gfavs["GET /api/learning-graph-favorites<br/>🔒 Auth<br/>📤 string[] of favorited paths"]
        POST_gfav["POST /api/learning-graph-favorites<br/>🔒 Auth"]
        GET_progress["GET /api/progress<br/>🔒 Auth<br/>📤 completion records"]
        POST_progress["POST /api/progress<br/>🔒 Auth<br/>📥 { graphId, episodeId }"]
        POST_activity["POST /api/activity<br/>🔒 Auth<br/>📥 { activityType, … }<br/>(fire-and-forget)"]
    end

    subgraph "Media + Upload"
        direction TB
        POST_upload["POST /api/upload<br/>🔒 Admin<br/>📥 fileName, contentType, category<br/>📤 presigned SAS URL"]
        POST_upload_file["POST /api/upload/file<br/>🔒 Admin<br/>📥 multipart (20 MB cap)<br/>(excluded from edge middleware)"]
        GET_media["GET /api/media?key=…<br/>📤 streaming proxy from Azure Blob<br/>(HTTP Range support)"]
    end

    subgraph "Health"
        direction TB
        GET_health["GET /api/health<br/>📤 { status: ok, version }"]
        GET_ready["GET /api/ready<br/>📤 { status, checks: { database } }<br/>(503 if DB unreachable)"]
    end

    subgraph "Admin"
        direction TB
        POST_analytics["POST /api/admin/analytics<br/>🔒 Admin<br/>📤 aggregated metrics"]
        POST_sweep["POST /api/admin/blob-sweep<br/>🔒 Superadmin<br/>📥 ?dry-run=true (default)<br/>📤 orphan keys + delete counts"]
        GET_users["GET /api/users<br/>🔒 Admin"]
        POST_user["POST /api/users<br/>🔒 Admin"]
        GET_user["GET /api/users/[id]<br/>🔒 Admin"]
        PUT_role["PUT /api/users/[id]/role<br/>🔒 Superadmin<br/>📥 role"]
    end
```

---

## 7. Deployment & Infrastructure

> **Canonical deployment is the Azure VM + Nginx + pm2 path.** The `cd.yml` workflow targets Azure Container Apps but is out of sync with production — see [deployment-guide.md](deployment-guide.md).

```mermaid
flowchart TB
    subgraph "Developer Workflow"
        Dev["Developer<br/>Local Machine"]
        DevDocker["Docker Compose"]
        PGLocal["PostgreSQL 16 + pgvector"]
        AzuriteLocal["Azurite<br/>(Azure Blob emulator)"]

        Dev -->|"docker compose up -d"| DevDocker
        DevDocker --> PGLocal
        DevDocker --> AzuriteLocal
        Dev -->|"npm run dev"| LocalNext["Next.js Dev Server<br/>localhost:3000/auditbrief"]
        LocalNext --> PGLocal
        LocalNext --> AzuriteLocal
    end

    subgraph "CI Pipeline (GitHub Actions — ci.yml)"
        direction TB
        PR["Pull Request<br/>to main"] --> Lint["Prettier +<br/>ESLint Check"]
        Lint --> TypeCheck["TypeScript<br/>Type Check"]
        TypeCheck --> PrismaGen["Prisma Generate<br/>+ Migrate (test DB)"]
        PrismaGen --> UnitTests["Vitest<br/>Unit + Integration<br/>(with coverage)"]
        UnitTests --> BuildCheck["Next.js Build"]
        BuildCheck --> PRReady["PR Ready<br/>for Review"]
    end

    subgraph "Production Deploy (manual / on VM — canonical)"
        direction TB
        Merge["Merge to main"] --> SSH["SSH to Azure VM"]
        SSH --> Pull["git pull origin main"]
        Pull --> Install["npm install"]
        Install --> Migrate["npx prisma migrate deploy"]
        Migrate --> Build["npm run build"]
        Build --> Restart["pm2 restart auditbrief"]
    end

    subgraph "Aspirational Deploy (cd.yml — NOT current)"
        direction TB
        cdMerge["Push to main"] --> Docker["docker build + push to ACR"]
        Docker --> ACA["az containerapp update"]
    end

    subgraph "E2E Pipeline (GitHub Actions — e2e.yml)"
        direction TB
        CronTrigger["Daily 3 AM UTC<br/>+ Manual"] --> PlaywrightRun["Playwright<br/>Chromium E2E"]
        PlaywrightRun -->|"Against"| StagingURL["Staging<br/>Environment"]
    end

    subgraph "Azure VM Production Infrastructure"
        direction TB

        subgraph "Azure VM (Ubuntu 22.04 LTS)"
            NginxProd["Nginx<br/>(SSL + reverse proxy +<br/>basePath /auditbrief)"]
            PM2Prod["pm2 + Next.js 15.3 standalone<br/>(:3103)"]
        end

        subgraph "Data Plane"
            AzurePG["Azure Database<br/>for PostgreSQL<br/>Flexible Server"]
            AzureBlob["Azure Blob Storage<br/>(Audio, PDFs, Thumbnails)"]
        end

        subgraph "Observability"
            PinoLogs["Pino structured logs<br/>(stdout → pm2-logrotate)"]
            SentryRsv["Sentry (reserved —<br/>SDK not initialized)"]
        end

        NginxProd -->|":3103"| PM2Prod
        PM2Prod -->|"Prisma"| AzurePG
        PM2Prod -->|"Azure SDK"| AzureBlob
        PM2Prod -->|"stdout"| PinoLogs
        PM2Prod -.-> SentryRsv
    end

    PRReady -->|"Merge"| Merge
    Restart -->|"Deploys"| PM2Prod

    style NginxProd fill:#009639,color:#fff
    style PM2Prod fill:#000,color:#fff
    style AzurePG fill:#336791,color:#fff
    style AzureBlob fill:#0078d4,color:#fff
    style cdMerge fill:#9ca3af,color:#000
    style Docker fill:#9ca3af,color:#000
    style ACA fill:#9ca3af,color:#000
```
