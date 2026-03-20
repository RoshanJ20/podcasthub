# The Audit Brief — Architecture Diagrams

## 1. Frontend Architecture

```mermaid
graph TB
    subgraph "Next.js App Router"
        direction TB
        RootLayout["Root Layout<br/>(ThemeProvider, AudioProvider, Sidebar)"]

        subgraph "Route Group: (auth)"
            Login["/login<br/>LoginForm"]
            Register["/register<br/>RegisterForm"]
            Unauthorized["/unauthorized<br/>403 Page"]
        end

        subgraph "Route Group: (public)"
            Home["/ Home<br/>Server Component"]
            Bulletins["/bulletins<br/>PodcastGrid + Filters"]
            PodcastDetail["/podcast/[id]<br/>AudioPlayer + Transcript"]
            LearningPaths["/learning-path<br/>Series List"]
            LearningPathDetail["/learning-path/[id]<br/>Series Detail"]
            Progress["/progress<br/>Dashboard"]
            Profile["/profile<br/>Settings"]
        end

        subgraph "Route Group: (admin)"
            AdminDash["/admin<br/>Dashboard"]
            Upload["/admin/upload<br/>PodcastUploadWizard"]
            EditPodcast["/admin/edit/[id]<br/>EditPodcastClient"]
            LearningGraphsMgmt["/admin/learning-graphs<br/>Series Management"]
            LearningGraphsNew["/admin/learning-graphs/new<br/>Create Series"]
            Analytics["/admin/analytics<br/>Recharts Dashboard"]
            UserMgmt["/admin/users<br/>User Table"]
        end
    end

    subgraph "Shared Components"
        direction LR
        ShadcnUI["shadcn/ui<br/>(Button, Card, Dialog,<br/>Table, Input, etc.)"]
        AudioStack["Audio Player Stack<br/>(GlobalAudioPlayer,<br/>CompactPlayer,<br/>TranscriptViewer,<br/>BulletinViewer,<br/>BookmarkPanel)"]
        LayoutComps["Layout<br/>(UnifiedSidebar,<br/>MobileTopBar,<br/>MobileBottomPlayer,<br/>CommandPalette)"]
    end

    subgraph "State Management (Zustand)"
        PlayerStore["PlayerStore<br/>currentPodcast, isPlaying,<br/>currentTime, volume,<br/>playbackRate, audioType"]
    end

    subgraph "Custom Hooks"
        useHls["useHlsPlayer()<br/>HLS.js + native audio"]
        useUpload["useFileUpload()<br/>XHR + progress"]
        useTracker["useListenTracker()<br/>30s activity log"]
        useSync["useTranscriptSync()<br/>segment highlighting"]
        useUnsaved["useUnsavedChangesWarning()"]
        useWizard["useWizardState()"]
    end

    RootLayout --> Login & Register & Unauthorized
    RootLayout --> Home & Bulletins & PodcastDetail & LearningPaths & LearningPathDetail & Progress & Profile
    RootLayout --> AdminDash & Upload & EditPodcast & LearningGraphsMgmt & LearningGraphsNew & Analytics & UserMgmt

    PodcastDetail --> AudioStack
    PodcastDetail --> PlayerStore
    AudioStack --> useHls
    AudioStack --> useSync
    AudioStack --> useTracker
    Upload --> useUpload & useWizard
    LayoutComps --> PlayerStore

    style RootLayout fill:#1e293b,color:#fff
    style PlayerStore fill:#7c3aed,color:#fff
```

---

## 2. Backend Architecture

```mermaid
graph TB
    subgraph "Client Request"
        Browser["Browser / Client"]
    end

    subgraph "Edge Middleware Layer"
        MW["middleware.ts<br/>(JWT verify via jose)"]
        MW -->|"Set Headers"| Headers["x-user-id<br/>x-user-email<br/>x-user-role"]
        MW -->|"Auto-refresh"| TokenRefresh["Silent Token<br/>Refresh"]
    end

    subgraph "API Routes Layer"
        direction TB

        subgraph "Auth APIs"
            AuthLogin["POST /api/auth/login"]
            AuthRegister["POST /api/auth/register"]
            AuthRefresh["POST /api/auth/refresh"]
            AuthLogout["POST /api/auth/logout"]
            AuthMe["GET /api/auth/me"]
        end

        subgraph "Content APIs"
            PodcastsList["GET /api/podcasts"]
            PodcastCreate["POST /api/podcasts"]
            PodcastGet["GET /api/podcasts/[id]"]
            PodcastUpdate["PUT /api/podcasts/[id]"]
            PodcastDelete["DELETE /api/podcasts/[id]"]
            PodcastBatch["POST /api/podcasts/batch"]
            Transcript["GET /api/podcasts/[id]/transcript"]
        end

        subgraph "Learning Series APIs"
            GraphList["GET /api/learning-graphs"]
            GraphCreate["POST /api/learning-graphs"]
            GraphGet["GET /api/learning-graphs/[id]"]
            GraphUpdate["PUT /api/learning-graphs/[id]"]
            GraphDelete["DELETE /api/learning-graphs/[id]"]
        end

        subgraph "User Feature APIs"
            BookmarksCRUD["GET/POST/DELETE<br/>/api/bookmarks"]
            ProgressCRUD["GET/POST<br/>/api/progress"]
            ActivityLog["POST /api/activity"]
        end

        subgraph "Utility APIs"
            UploadAPI["POST /api/upload/file"]
            MediaProxy["GET /api/media"]
            HealthAPI["GET /api/health"]
        end

        subgraph "Admin APIs"
            AdminAnalytics["GET /api/admin/analytics"]
            UsersList["GET /api/users"]
            UsersCreate["POST /api/users"]
            UserRole["PUT /api/users/[id]/role"]
        end
    end

    subgraph "Service Layer (lib/)"
        direction TB
        AuthService["lib/auth/<br/>jwt.ts, password.ts,<br/>cookies.ts,<br/>api-helpers.ts"]
        APIUtils["lib/api/<br/>errors.ts, pagination.ts,<br/>rate-limit.ts, cors.ts"]
        Schemas["lib/schemas/<br/>Zod validation<br/>(user, podcast, learning-graph,<br/>bookmark, common)"]
        Storage["lib/storage.ts<br/>S3 presigned URLs<br/>(AWS SDK v3)"]
        Logger["lib/logger.ts<br/>Pino structured logging"]
        Prisma["lib/db.ts<br/>Prisma client singleton"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL 16"]
        S3["MinIO / Azure Blob<br/>(S3-compatible)"]
    end

    Browser --> MW
    MW --> Headers
    Headers -->|"Route to"| AuthLogin & PodcastsList & GraphList & BookmarksCRUD & AdminAnalytics

    AuthLogin --> AuthService
    PodcastCreate --> Schemas --> APIUtils
    UploadAPI --> Storage

    AuthService --> Prisma
    APIUtils --> Prisma
    Prisma --> PG
    Storage --> S3
    Logger -.->|"All layers"| AuthService & APIUtils

    style MW fill:#f59e0b,color:#000
    style PG fill:#336791,color:#fff
    style S3 fill:#c41d15,color:#fff
```

---

## 3. Database Schema (Entity Relationship)

```mermaid
erDiagram
    User {
        UUID id PK
        String email UK "unique"
        String password_hash
        String displayName
        DateTime createdAt
        DateTime updatedAt
    }

    UserRole {
        UUID id PK
        UUID userId FK
        String role "public | admin | superadmin"
        DateTime createdAt
    }

    Podcast {
        UUID id PK
        String title
        String description
        String domain "e.g. audit, tax, advisory"
        Int year
        String[] tags
        String audioShortUrl "storage key"
        String audioLongUrl "storage key"
        String thumbnailUrl "storage key"
        String[] bulletinUrls "PDF storage keys"
        Int sortOrder
        Boolean archived
        DateTime createdAt
        DateTime updatedAt
    }

    Transcript {
        UUID id PK
        UUID podcastId FK
        String type "short | long"
        Json content "timestamped segments"
        DateTime createdAt
    }

    LearningGraph {
        UUID id PK
        String title
        String description
        String domain
        String pathType
        UUID createdBy FK
        Boolean published
        DateTime createdAt
        DateTime updatedAt
    }

    Episode {
        UUID id PK
        UUID graphId FK
        String title
        String description
        String audioUrl "storage key"
        String transcriptUrl
        String nodeType "start | default | milestone | end"
        DateTime createdAt
    }

    LearningPathEdge {
        UUID id PK
        UUID graphId FK
        UUID sourceId FK "Episode"
        UUID targetId FK "Episode"
        DateTime createdAt
    }

    Bookmark {
        UUID id PK
        UUID userId FK
        UUID podcastId FK
        Int timestampSeconds
        String note
        DateTime createdAt
    }

    UserProgress {
        UUID id PK
        UUID userId FK
        UUID episodeId FK
        DateTime completedAt
    }

    UserActivity {
        UUID id PK
        UUID userId FK
        String activityType "listen | view | complete | search"
        UUID podcastId FK "nullable"
        UUID episodeId FK "nullable"
        UUID graphId FK "nullable"
        Json metadata
        DateTime createdAt
    }

    User ||--o{ UserRole : "has roles"
    User ||--o{ Bookmark : "creates"
    User ||--o{ UserProgress : "tracks"
    User ||--o{ UserActivity : "logs"
    User ||--o{ LearningGraph : "creates"

    Podcast ||--o{ Transcript : "has transcripts"
    Podcast ||--o{ Bookmark : "bookmarked in"

    LearningGraph ||--o{ Episode : "contains"
    LearningGraph ||--o{ LearningPathEdge : "has edges"

    Episode ||--o{ UserProgress : "tracked"
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

    subgraph "CDN / Edge"
        FrontDoor["Azure Front Door<br/>(CDN + WAF)"]
    end

    subgraph "Application Tier"
        subgraph "Azure Container Apps"
            NextJS["Next.js 16<br/>Standalone Server<br/>(Node.js 20 LTS)"]
            EdgeMW["Edge Middleware<br/>(JWT + Route Protection)"]
        end
    end

    subgraph "Data Tier"
        subgraph "Primary Database"
            PostgreSQL["PostgreSQL 16"]
        end
        subgraph "Object Storage"
            BlobStorage["Azure Blob Storage<br/>(S3-compatible)<br/>Audio, PDFs, Thumbnails"]
        end
    end

    subgraph "DevOps"
        ACR["Azure Container<br/>Registry"]
        GitHub["GitHub Actions<br/>(CI/CD)"]
        AzureMonitor["Azure Monitor<br/>(Metrics + Logs)"]
    end

    subgraph "Local Dev"
        DockerCompose["Docker Compose"]
        PGLocal["PostgreSQL 16"]
        MinIO["MinIO<br/>(S3-compatible)"]
    end

    WebApp -->|"HTTPS"| FrontDoor
    HLS -->|"HLS streams"| FrontDoor
    FrontDoor -->|"Proxy"| NextJS
    NextJS --> EdgeMW
    EdgeMW -->|"Prisma ORM"| PostgreSQL
    EdgeMW -->|"Presigned URLs"| BlobStorage

    GitHub -->|"Build + Push"| ACR
    ACR -->|"Deploy"| NextJS
    NextJS -.->|"Logs + Metrics"| AzureMonitor

    DockerCompose --> PGLocal & MinIO

    style FrontDoor fill:#0078d4,color:#fff
    style PostgreSQL fill:#336791,color:#fff
    style BlobStorage fill:#0078d4,color:#fff
    style ACR fill:#0078d4,color:#fff
    style MinIO fill:#c41d15,color:#fff
```

---

## 5. End-to-End Product Flow

```mermaid
flowchart TB
    subgraph "Admin Content Ingestion"
        A1["Admin logs in"] --> A2["Navigate to /admin/upload"]
        A2 --> A3["PodcastUploadWizard<br/>Step 1: Details<br/>(title, domain, year, tags)"]
        A3 --> A4["Step 2: Files<br/>(audio short/long, thumbnail,<br/>bulletin PDFs)"]
        A4 --> A5["Step 3: Metadata<br/>(description, sort order)"]
        A5 --> A6["Step 4: Review & Submit"]
        A6 -->|"POST /api/podcasts"| A7["Server validates (Zod)<br/>Stores metadata in PostgreSQL"]
        A4 -->|"POST /api/upload/file"| A8["Files uploaded to<br/>MinIO/Azure Blob"]
    end

    subgraph "User Entry"
        U1["User logs in<br/>(/login → JWT cookies)"] --> U2["Home page"]
        U2 --> U3{"Two main features"}
    end

    subgraph "Feature 1: Technical Content (Bulletins)"
        U3 -->|"Technical Content"| TC1["/bulletins<br/>Browse all bulletins"]
        TC1 --> TC2["Filter by domain, year, tags<br/>+ inline search bar"]
        TC2 --> TC3["Select a bulletin"]
        TC3 --> TC4["/podcast/[id]<br/>Podcast Detail Page"]
        TC4 --> TC5["AudioPlayer<br/>(HLS.js adaptive streaming)"]
        TC5 --> TC6["TranscriptViewer<br/>(auto-synced highlighting)"]
        TC5 --> TC7["BulletinViewer<br/>(react-pdf)"]
        TC5 --> TC8["BookmarkPanel<br/>(save timestamp + note)"]
        TC5 -->|"Every 30s"| TC9["useListenTracker<br/>POST /api/activity"]
    end

    subgraph "Feature 2: Learning Series"
        U3 -->|"Learning Series"| LS1["/learning-path<br/>Browse all learning series"]
        LS1 --> LS2["Filter by domain<br/>+ inline search bar"]
        LS2 --> LS3["Select a series"]
        LS3 --> LS4["/learning-path/[id]<br/>Series Detail Page"]
        LS4 --> LS5["View episodes in order"]
        LS5 --> LS6["Play episode audio"]
        LS6 --> LS7["Mark complete<br/>POST /api/progress"]
        LS7 --> LS8["/progress<br/>Track completion %"]
    end

    subgraph "Admin Analytics"
        TC9 --> AN1["Activity data<br/>aggregated"]
        AN1 --> AN2["/admin/analytics<br/>Recharts dashboard<br/>(listens, users, trends)"]
    end

    style A1 fill:#f59e0b,color:#000
    style U1 fill:#3b82f6,color:#fff
    style AN2 fill:#8b5cf6,color:#fff
    style TC1 fill:#0d9488,color:#fff
    style LS1 fill:#2563eb,color:#fff
```

---

## 6. API Endpoint Map

```mermaid
graph LR
    subgraph "Authentication"
        direction TB
        POST_login["POST /api/auth/login<br/>📥 email, password<br/>📤 JWT cookies + user"]
        POST_register["POST /api/auth/register<br/>📥 email, password, displayName<br/>📤 user created"]
        POST_refresh["POST /api/auth/refresh<br/>📥 refresh_token cookie<br/>📤 new access_token"]
        POST_logout["POST /api/auth/logout<br/>📤 clear cookies"]
        GET_me["GET /api/auth/me<br/>🔒 Auth required<br/>📤 user profile"]
    end

    subgraph "Podcasts"
        direction TB
        GET_podcasts["GET /api/podcasts<br/>📥 ?page, limit, domain, year, tags, sort<br/>📤 paginated podcast list"]
        POST_podcasts["POST /api/podcasts<br/>🔒 Admin only<br/>📥 podcast data (Zod validated)<br/>📤 created podcast"]
        GET_podcast["GET /api/podcasts/[id]<br/>📤 podcast detail"]
        PUT_podcast["PUT /api/podcasts/[id]<br/>🔒 Admin only<br/>📥 updated fields<br/>📤 updated podcast"]
        DELETE_podcast["DELETE /api/podcasts/[id]<br/>🔒 Admin only<br/>📤 soft delete"]
        POST_batch["POST /api/podcasts/batch<br/>🔒 Admin only<br/>📥 sort order updates"]
        GET_transcript["GET /api/podcasts/[id]/transcript<br/>📥 ?type=short|long<br/>📤 transcript segments"]
    end

    subgraph "Learning Series"
        direction TB
        GET_graphs["GET /api/learning-graphs<br/>📥 ?page, limit, domain<br/>📤 paginated series"]
        POST_graphs["POST /api/learning-graphs<br/>🔒 Admin only<br/>📥 series metadata<br/>📤 created series"]
        GET_graph["GET /api/learning-graphs/[id]<br/>📤 series + episodes + edges"]
        PUT_graph["PUT /api/learning-graphs/[id]<br/>🔒 Admin only<br/>📥 updated fields<br/>📤 updated series"]
        DELETE_graph["DELETE /api/learning-graphs/[id]<br/>🔒 Admin only"]
    end

    subgraph "User Features"
        direction TB
        GET_bookmarks["GET /api/bookmarks<br/>🔒 Auth required<br/>📥 ?podcastId<br/>📤 user bookmarks"]
        POST_bookmarks["POST /api/bookmarks<br/>🔒 Auth required<br/>📥 podcastId, timestampSeconds, note<br/>📤 created bookmark"]
        DELETE_bookmark["DELETE /api/bookmarks/[id]<br/>🔒 Auth required"]
        GET_progress["GET /api/progress<br/>🔒 Auth required<br/>📤 completion records"]
        POST_progress["POST /api/progress<br/>🔒 Auth required<br/>📥 episodeId<br/>📤 completion recorded"]
        POST_activity["POST /api/activity<br/>🔒 Auth required<br/>📥 activityType, podcastId?, metadata"]
    end

    subgraph "Utility"
        direction TB
        POST_upload["POST /api/upload/file<br/>🔒 Admin only<br/>📥 multipart file<br/>📤 storage key"]
        GET_media["GET /api/media<br/>📥 ?key=storage-key<br/>📤 presigned URL redirect"]
        GET_health["GET /api/health<br/>📤 { status: ok, version: 2.0.0 }"]
    end

    subgraph "Admin"
        direction TB
        GET_analytics["GET /api/admin/analytics<br/>🔒 Admin only<br/>📤 aggregated activity data"]
        GET_users["GET /api/users<br/>🔒 Admin only<br/>📤 all users"]
        POST_users["POST /api/users<br/>🔒 Admin only<br/>📥 user data"]
        PUT_user_role["PUT /api/users/[id]/role<br/>🔒 Admin only<br/>📥 role<br/>📤 updated user"]
    end
```

---

## 7. Deployment & Infrastructure

```mermaid
flowchart TB
    subgraph "Developer Workflow"
        Dev["Developer<br/>Local Machine"]
        DevDocker["Docker Compose<br/>(Local Dev)"]
        PGLocal["PostgreSQL 16"]
        MinIOLocal["MinIO<br/>(S3-compat storage)"]

        Dev -->|"docker compose up"| DevDocker
        DevDocker --> PGLocal
        DevDocker --> MinIOLocal
        Dev -->|"npm run dev"| LocalNext["Next.js Dev Server<br/>localhost:3000"]
        LocalNext --> PGLocal
        LocalNext --> MinIOLocal
    end

    subgraph "CI Pipeline (GitHub Actions - ci.yml)"
        direction TB
        PR["Pull Request<br/>to main"] --> Lint["Prettier +<br/>ESLint Check"]
        Lint --> TypeCheck["TypeScript<br/>Type Check"]
        TypeCheck --> PrismaGen["Prisma Generate<br/>+ Migrate"]
        PrismaGen --> UnitTests["Vitest<br/>Unit + Integration<br/>Tests"]
        UnitTests --> BuildCheck["Next.js<br/>Build"]
        BuildCheck --> PRReady["PR Ready<br/>for Review"]
    end

    subgraph "CD Pipeline (GitHub Actions - cd.yml)"
        direction TB
        MergeMain["Push to main"] --> NpmBuild["npm run build"]
        NpmBuild --> DockerBuild["Docker Build<br/>(Multi-stage)"]
        DockerBuild --> PushACR["Push to Azure<br/>Container Registry"]
        PushACR --> DeployACA["Deploy to Azure<br/>Container Apps<br/>(az containerapp update)"]
    end

    subgraph "E2E Pipeline (GitHub Actions - e2e.yml)"
        direction TB
        CronTrigger["Daily 3 AM UTC<br/>+ Manual Trigger"] --> PlaywrightRun["Playwright<br/>E2E Tests"]
        PlaywrightRun -->|"Against"| StagingURL["Staging<br/>Environment"]
    end

    subgraph "Azure Production Infrastructure"
        direction TB

        AzureDNS["Azure DNS"]
        FrontDoor2["Azure Front Door<br/>(CDN + WAF + SSL)"]

        subgraph "Compute"
            ACA["Azure Container Apps<br/>(Next.js Standalone)"]
        end

        subgraph "Data"
            AzurePG["Azure Database<br/>for PostgreSQL<br/>Flexible Server"]
            AzureBlob["Azure Blob Storage<br/>(Audio, PDFs,<br/>Thumbnails)"]
        end

        subgraph "Security"
            KeyVault["Azure Key Vault<br/>(Secrets)"]
            GitHubSecrets["GitHub Secrets<br/>(CI/CD Vars)"]
        end

        subgraph "Observability"
            AzureMon["Azure Monitor<br/>(Logs + Metrics)"]
        end

        AzureDNS --> FrontDoor2
        FrontDoor2 --> ACA
        ACA -->|"Prisma"| AzurePG
        ACA -->|"AWS SDK v3"| AzureBlob
        ACA -.->|"stdout"| AzureMon
        KeyVault -.->|"Inject"| ACA
    end

    subgraph "Docker Build (Multi-stage)"
        direction TB
        Stage1["Stage 1: deps<br/>npm ci"]
        Stage2["Stage 2: builder<br/>prisma generate<br/>npm run build"]
        Stage3["Stage 3: runner<br/>Copy standalone +<br/>public + static<br/>Expose :3000"]
        Stage1 --> Stage2 --> Stage3
    end

    PRReady -->|"Merge"| MergeMain
    DeployACA -->|"Deploys to"| ACA

    style FrontDoor2 fill:#0078d4,color:#fff
    style ACA fill:#0078d4,color:#fff
    style AzurePG fill:#336791,color:#fff
    style AzureBlob fill:#0078d4,color:#fff
    style KeyVault fill:#0078d4,color:#fff
    style ACR fill:#0078d4,color:#fff
```
