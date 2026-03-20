# The Audit Brief — Architecture Diagrams

Each diagram is a separate `.mmd` file that can be opened in any Mermaid renderer (VS Code Mermaid extension, mermaid.live, GitHub, etc.).

| #   | Diagram               | File                                                       | Description                                                |
| --- | --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| 0   | Architecture Overview | [0-architecture-overview.mmd](0-architecture-overview.mmd) | Simplified view — containers, data flow, external services |
| 1   | System Context        | [1-system-context.mmd](1-system-context.mmd)               | C4 Level 1 — actors and external systems                   |
| 2   | Container Diagram     | [2-container-diagram.mmd](2-container-diagram.mmd)         | C4 Level 2 — browser, server, libraries, infra             |
| 3   | Authentication Flow   | [3-auth-flow.mmd](3-auth-flow.mmd)                         | JWT login, middleware verification, token refresh          |
| 4   | Audio Pipeline        | [4-audio-pipeline.mmd](4-audio-pipeline.mmd)               | Upload, HLS transcoding, streaming playback                |
| 5   | Semantic Search       | [5-semantic-search.mmd](5-semantic-search.mmd)             | Azure OpenAI embeddings + pgvector similarity              |
| 6   | Learning Path Model   | [6-learning-path-model.mmd](6-learning-path-model.mmd)     | DAG structure — graphs, episodes, edges, progress          |
| 7   | Request Lifecycle     | [7-request-lifecycle.mmd](7-request-lifecycle.mmd)         | Full request flow through middleware, auth, handlers       |

---

## Rendered Diagrams

### 0. Architecture Overview

```mermaid
graph TB
    %% ── Actors ──
    Listener(["👤 Audit Professional"])
    Admin(["👤 Admin"])

    %% ── Browser ──
    subgraph client ["🖥️ Browser"]
        direction LR
        UI["React 19 + shadcn/ui\nServer & Client Components"]
        Player["Audio Player\nHLS.js streaming"]
        Editor["Learning Path Editor\nxyflow + Dagre"]
    end

    %% ── Next.js Container ──
    subgraph nextjs ["⚡ Next.js 16 Container"]
        direction TB
        Middleware["Edge Middleware\nJWT auth · Route protection\nToken refresh"]

        subgraph app ["Application Layer"]
            direction LR
            Pages["Server Pages\nPublic · Auth · Admin"]
            API["API Routes\nPodcasts · Search · Auth\nBookmarks · Progress\nMedia · Upload"]
        end

        subgraph libs ["Core Libraries"]
            direction LR
            Auth["Auth\nJWT · bcrypt\nRBAC"]
            Validation["Validation\nZod schemas"]
            Embed["Embeddings\nAzure OpenAI\nclient"]
            Storage["Storage\nS3 client\npresigned URLs"]
            Log["Logger\nPino JSON"]
        end
    end

    %% ── Data Stores ──
    subgraph data ["🗄️ Data Layer"]
        direction LR
        PG[("PostgreSQL 16\n+ pgvector\n\nUsers · Podcasts\nTranscripts · Graphs\nBookmarks · Progress")]
        S3[("Object Storage\nMinIO → Azure Blob\n\nAudio · Images\nPDFs · HLS segments")]
    end

    %% ── External Services ──
    subgraph external ["☁️ External Services"]
        direction LR
        OpenAI["Azure OpenAI\ntext-embedding-3-large\nSemantic search"]
        Sentry["Sentry\nError tracking\nPerformance"]
    end

    %% ── Connections ──
    Listener --> client
    Admin --> client

    client -->|"HTTPS"| Middleware
    Middleware -->|"Authenticated\nrequests"| app

    Pages --> libs
    API --> libs

    Auth -->|"Prisma ORM"| PG
    Validation --> API
    Embed -->|"REST API"| OpenAI
    Storage -->|"S3 protocol"| S3
    API -->|"Prisma ORM\n+ pgvector"| PG
    Log -->|"Telemetry"| Sentry
    Player -->|"Range requests\nmedia proxy"| API

    %% ── Styles ──
    classDef actor fill:#1e3a5f,color:#fff,stroke:#1e3a5f,stroke-width:2px
    classDef clientBox fill:#3b82f6,color:#fff,stroke:#2563eb,stroke-width:1px
    classDef serverBox fill:#1d4ed8,color:#fff,stroke:#1e40af,stroke-width:1px
    classDef libBox fill:#0891b2,color:#fff,stroke:#0e7490,stroke-width:1px
    classDef dataStore fill:#4b5563,color:#fff,stroke:#374151,stroke-width:2px
    classDef extService fill:#6b7280,color:#fff,stroke:#4b5563,stroke-width:1px

    class Listener,Admin actor
    class UI,Player,Editor clientBox
    class Middleware,Pages,API serverBox
    class Auth,Validation,Embed,Storage,Log libBox
    class PG,S3 dataStore
    class OpenAI,Sentry extService
```

### 1. System Context

```mermaid
graph TB
    User["Audit Professional\n(Listener)"]
    Admin["Admin\n(Content Manager)"]

    System["The Audit Brief\nNext.js Application\n\nAudio podcast platform with transcripts,\nbookmarks, learning paths, and AI search"]

    PG[("PostgreSQL 16\n+ pgvector\n\nPodcasts, users, transcripts,\nlearning graphs, embeddings")]
    S3["Object Storage\nMinIO dev / Azure Blob prod\n\nAudio files, images,\nPDF bulletins, HLS segments"]
    OpenAI["Azure OpenAI\ntext-embedding-3-large\n\n1536-dim embeddings\nfor semantic search"]

    User -->|"Browse bulletins, play audio,\nsearch, track learning progress"| System
    Admin -->|"Upload podcasts, manage users,\nbuild learning paths, view analytics"| System

    System -->|"Prisma ORM\n+ raw pgvector queries"| PG
    System -->|"S3 API\npresigned URLs, media proxy"| S3
    System -->|"REST API\nembedding generation"| OpenAI

    classDef person fill:#08427b,color:#fff,stroke:#08427b
    classDef system fill:#1168bd,color:#fff,stroke:#1168bd
    classDef external fill:#999,color:#fff,stroke:#999

    class User,Admin person
    class System system
    class PG,S3,OpenAI external
```

### 2. Container Diagram

```mermaid
graph TB
    subgraph Browser
        SPA["React 19 SPA\nshadcn/ui + Tailwind 4\nServer Components + Client Components"]
        PlayerUI["Audio Player\nHLS.js adaptive streaming\nZustand player store"]
        GraphUI["Graph Viewer and Editor\nxyflow/react + Dagre\nZustand editor store"]
    end

    subgraph NextServer["Next.js 16 Server"]
        MW["Edge Middleware\njose JWT verification\nRoute protection + token refresh\nHeader injection: x-user-*"]

        subgraph Pages["Server Components"]
            PubPages["Public Pages\nHome, Bulletins, Podcast Detail,\nLearning Paths, Search, Profile"]
            AuthPages["Auth Pages\nLogin, Register"]
            AdminPages["Admin Pages\nDashboard, Upload, Edit,\nUsers, Analytics, Graph Editor"]
        end

        subgraph APILayer["API Route Handlers"]
            AuthAPI["/api/auth/*\nlogin, register, logout,\nrefresh, me"]
            PodcastAPI["/api/podcasts/*\nCRUD, batch, transcript"]
            GraphAPI["/api/learning-graphs/*\nCRUD, bulk episode+edge save"]
            SearchAPI["/api/search\ntext search + semantic search"]
            MediaAPI["/api/media\nS3 proxy with range requests"]
            UploadAPI["/api/upload\npresigned URLs, file upload"]
            BookmarkAPI["/api/bookmarks/*\nCRUD per user"]
            ProgressAPI["/api/progress/*\nepisode completion tracking"]
            AdminAPI["/api/admin/analytics\n/api/users management"]
        end

        subgraph LibLayer["Shared Libraries"]
            AuthLib["lib/auth\nJWT sign/verify, bcrypt,\nHttpOnly cookies, RBAC helpers"]
            APILib["lib/api\nApiError, ErrorCode enum,\npagination, rate limiting"]
            Schemas["lib/schemas\nZod: user, podcast,\nlearning-graph, bookmark"]
            EmbedLib["lib/embeddings\nAzure OpenAI client\nretry with backoff"]
            StorageLib["lib/storage\nS3Client, presigned URLs,\nfile validation"]
            DB["lib/db\nPrisma + pg.Pool singleton"]
            Logger["lib/logger\nPino structured JSON"]
        end
    end

    PG[("PostgreSQL 16\npgvector extension\n\n10 models:\nUser, Podcast, Transcript,\nLearningGraph, Episode,\nEdge, Bookmark, Role,\nProgress, Activity")]
    S3["MinIO / Azure Blob\nS3-compatible\n\nBuckets:\naudio, images, PDFs,\nHLS segments"]
    AzureOAI["Azure OpenAI\ntext-embedding-3-large\n1536 dimensions"]

    SPA -->|"HTTP requests"| MW
    PlayerUI -->|"GET with Range header"| MediaAPI
    GraphUI -->|"PUT bulk save"| GraphAPI

    MW -->|"JWT valid"| Pages
    MW -->|"JWT valid + headers"| APILayer

    AuthAPI --> AuthLib
    PodcastAPI --> DB
    GraphAPI --> DB
    SearchAPI --> EmbedLib
    SearchAPI --> DB
    MediaAPI --> StorageLib
    UploadAPI --> StorageLib
    BookmarkAPI --> DB
    ProgressAPI --> DB
    AdminAPI --> DB

    APILayer --> APILib
    APILayer --> Schemas
    APILayer --> Logger

    DB -->|"Prisma queries\n+ raw pgvector SQL"| PG
    StorageLib -->|"S3 protocol"| S3
    EmbedLib -->|"POST /embeddings"| AzureOAI

    classDef browser fill:#438dd5,color:#fff,stroke:#438dd5
    classDef server fill:#1168bd,color:#fff,stroke:#1168bd
    classDef lib fill:#2694ab,color:#fff,stroke:#2694ab
    classDef infra fill:#999,color:#fff,stroke:#999
    classDef mw fill:#d4456e,color:#fff,stroke:#d4456e

    class SPA,PlayerUI,GraphUI browser
    class PubPages,AuthPages,AdminPages,AuthAPI,PodcastAPI,GraphAPI,SearchAPI,MediaAPI,UploadAPI,BookmarkAPI,ProgressAPI,AdminAPI server
    class AuthLib,APILib,Schemas,EmbedLib,StorageLib,DB,Logger lib
    class PG,S3,AzureOAI infra
    class MW mw
```

### 3. Authentication Flow

```mermaid
sequenceDiagram
    actor U as User
    participant B as Browser
    participant MW as Edge Middleware
    participant API as /api/auth/login
    participant Auth as lib/auth
    participant DB as PostgreSQL

    U->>B: Navigate to /admin
    B->>MW: GET /admin
    MW->>MW: Extract access_token cookie
    MW->>MW: Verify JWT (jose library)
    alt No valid token
        MW-->>B: 302 Redirect /login?redirectTo=/admin
    end

    U->>B: Submit email + password
    B->>API: POST /api/auth/login
    API->>Auth: Validate loginSchema (Zod)
    API->>DB: findUnique(email) + include UserRole
    DB-->>API: User record
    API->>Auth: verifyPassword(input, hash) via bcrypt
    API->>Auth: signAccessToken({userId, email, role})
    API->>Auth: signRefreshToken({userId, email, role})
    Auth-->>API: JWT strings (HS256)
    API-->>B: 200 + Set-Cookie access_token 15m and refresh_token 7d

    B->>MW: GET /admin (with cookies)
    MW->>MW: Verify access_token
    MW->>MW: Check role in admin or superadmin
    MW->>MW: Set headers x-user-id x-user-email x-user-role
    MW-->>B: 200 Admin page

    Note over MW: On expired access_token
    MW->>MW: Verify refresh_token
    MW->>Auth: signAccessToken(payload)
    MW-->>B: Response + new access_token cookie
```

### 4. Audio Streaming Pipeline

```mermaid
sequenceDiagram
    actor A as Admin
    participant Upload as /api/upload
    participant S3 as MinIO / Azure Blob
    participant FFmpeg as FFmpeg

    A->>Upload: POST filename, content_type, category audio
    Upload->>Upload: Validate MIME type mp3/m4a/wav/ogg
    Upload->>Upload: Check size under 500MB
    Upload->>Upload: Generate key audio/uuid/filename
    Upload->>S3: Generate presigned PUT URL 1hr
    S3-->>Upload: Signed URL
    Upload-->>A: upload_url, key, bucket
    A->>S3: PUT raw audio file via presigned URL
    Note over S3,FFmpeg: FFmpeg transcodes to HLS segments .m3u8 + .ts

    actor U as Listener
    participant Player as Audio Player
    participant Hook as useHlsPlayer
    participant Media as /api/media
    participant Store as Player Store Zustand

    U->>Player: Click play on podcast
    Player->>Store: loadPodcast with id, title, audioShortUrl, audioLongUrl
    Store-->>Hook: currentPodcast changed
    Hook->>Hook: Resolve URL via /api/media?key=encoded
    alt HLS stream .m3u8
        Hook->>Hook: new Hls loadSource attachMedia
    else Direct file
        Hook->>Hook: audio.src = url
    end

    Hook->>Media: GET /api/media?key=audio/uuid/file.mp3
    Media->>S3: GetObject with Range header if seeking
    S3-->>Media: Audio bytes + Content-Range
    Media-->>Hook: 206 Partial Content

    Hook->>Store: setDuration
    loop Every timeupdate event
        Hook->>Store: setCurrentTime
    end

    U->>Player: Toggle Short/Long audio
    Player->>Store: toggleAudioType
    Store-->>Hook: audioType changed, new URL loaded
```

### 5. Semantic Search Flow

```mermaid
sequenceDiagram
    actor U as User
    participant Search as Search Page
    participant API as /api/search
    participant Embed as lib/embeddings
    participant Azure as Azure OpenAI
    participant DB as PostgreSQL + pgvector

    U->>Search: Enter query revenue recognition standards
    Search->>API: POST /api/search with query
    API->>Embed: generateEmbedding query
    Embed->>Azure: POST /openai/deployments/text-embedding-3-large/embeddings
    Note over Embed,Azure: Retry up to 3x with exponential backoff on 429/5xx
    Azure-->>Embed: float array 1536 dims
    Embed-->>API: embedding vector

    API->>DB: Raw SQL with pgvector
    Note over API,DB: SELECT p.*, t.fullText,<br/>1 - (t.embedding <=> query::vector) AS similarity<br/>FROM transcripts t JOIN podcasts p<br/>WHERE similarity > 0.7<br/>ORDER BY similarity DESC LIMIT 10
    DB-->>API: Matching transcripts + podcasts

    API-->>Search: podcast, transcript, similarity_score array
    Search-->>U: Ranked results with similarity scores
```

### 6. Learning Path Data Model

```mermaid
graph LR
    subgraph LearningGraph
        LG["LearningGraph\nid, title, domain\npathType: linear or graph\nisPublished, createdBy"]
    end

    subgraph Episodes
        E1["Episode start\nid, title, sortOrder=0\nnodeType: start\npositionX, positionY"]
        E2["Episode default\nnodeType: default\nsortOrder=1"]
        E3["Episode milestone\nnodeType: milestone\nsortOrder=2"]
        E4["Episode end\nnodeType: end\nsortOrder=3"]
    end

    subgraph Tracking
        UP["UserProgress\nuserId + episodeId\ncompletedAt"]
    end

    LG -->|"has many"| E1
    LG -->|"has many"| E2
    LG -->|"has many"| E3
    LG -->|"has many"| E4

    E1 -->|"Edge"| E2
    E1 -->|"Edge"| E3
    E2 -->|"Edge"| E4
    E3 -->|"Edge"| E4

    E1 -.->|"tracked by"| UP
    E2 -.->|"tracked by"| UP
    E3 -.->|"tracked by"| UP
    E4 -.->|"tracked by"| UP

    classDef graphNode fill:#7c3aed,color:#fff
    classDef episode fill:#2563eb,color:#fff
    classDef tracking fill:#059669,color:#fff

    class LG graphNode
    class E1,E2,E3,E4 episode
    class UP tracking
```

### 7. Request Lifecycle

```mermaid
graph TD
    Req["Incoming Request"] --> MW["Edge Middleware\nmiddleware.ts"]

    MW --> ClassifyRoute{"Route\nClassification"}

    ClassifyRoute -->|"/ /login /register\n/bulletins /podcast/*"| Public["Allow Through\nNo Auth"]
    ClassifyRoute -->|"/api/auth/*"| AuthRoute["Allow Through\nAuth Endpoints"]
    ClassifyRoute -->|"/api/health\n/api/media"| Utility["Allow Through\nUtility"]
    ClassifyRoute -->|"/admin/*"| AdminCheck{"JWT Valid?\nRole admin or superadmin?"}
    ClassifyRoute -->|"Everything else"| AuthCheck{"JWT Valid?"}
    ClassifyRoute -->|"GET /api/podcasts\nGET /api/search\nGET /api/learning-graphs"| PublicAPI["Allow Through\nPublic API"]

    AuthCheck -->|"Valid"| InjectHeaders["Inject Headers\nx-user-id\nx-user-email\nx-user-role"]
    AuthCheck -->|"Expired"| TryRefresh{"Refresh\nToken Valid?"}
    AuthCheck -->|"Missing"| Redirect302["302 to /login?redirectTo=..."]

    TryRefresh -->|"Yes"| SignNew["Sign New Access Token\nSet Cookie\nContinue Request"]
    TryRefresh -->|"No"| Redirect302

    AdminCheck -->|"Valid + Correct Role"| InjectHeaders
    AdminCheck -->|"Wrong Role"| Forbidden["302 to /unauthorized"]
    AdminCheck -->|"No Token"| Redirect302

    InjectHeaders --> Handler["API Route Handler\nor Page Component"]

    Handler --> ValidateInput["Zod Schema\nValidation"]
    ValidateInput -->|"Invalid"| Error422["422 Validation Failed"]
    ValidateInput -->|"Valid"| BusinessLogic["Business Logic\nPrisma queries,\nembeddings, storage"]

    BusinessLogic -->|"Success"| Response200["200/201 JSON Response"]
    BusinessLogic -->|"Not Found"| Error404["404 Not Found"]
    BusinessLogic -->|"Error"| Error500["500 Internal Error"]

    Error422 --> ErrorFormat["Consistent Error Schema\nstatus, error_code,\nmessage, details, request_id"]
    Error404 --> ErrorFormat
    Error500 --> ErrorFormat

    classDef mw fill:#d4456e,color:#fff
    classDef allow fill:#059669,color:#fff
    classDef deny fill:#dc2626,color:#fff
    classDef logic fill:#2563eb,color:#fff
    classDef check fill:#d97706,color:#fff

    class MW mw
    class Public,AuthRoute,Utility,PublicAPI,InjectHeaders,SignNew allow
    class Redirect302,Forbidden,Error422,Error404,Error500 deny
    class Handler,ValidateInput,BusinessLogic,Response200 logic
    class ClassifyRoute,AuthCheck,AdminCheck,TryRefresh check
```
