# Stage 2: Core Content — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build podcast CRUD APIs, file upload, admin dashboard, and public library.

**Architecture:** Next.js API routes with Prisma for data access, MinIO/Azure Blob for file storage, shadcn/ui admin forms, server-side rendered library with pagination.

**Tech Stack:** Next.js 16, Prisma, MinIO (@aws-sdk/client-s3), shadcn/ui, @dnd-kit, React Hook Form + Zod, Sonner.

**Prerequisite:** Stage 1 (Foundation) is complete — auth (JWT + middleware), database (Prisma + PostgreSQL), error handling (ApiErrorResponse shape), pagination utility, and testing infra (Vitest + RTL + MSW) are all in place.

---

## Task 1: MinIO/S3 Storage Client

**Files:**

- `lib/storage.ts` — S3-compatible client
- `lib/__tests__/storage.test.ts` — unit tests

### Steps

- [ ] **1.1 — Write failing tests first**
      Create `lib/__tests__/storage.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import {
    generatePresignedUploadUrl,
    generatePresignedDownloadUrl,
    deleteObject,
  } from '../storage';

  // Mock @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
  vi.mock('@aws-sdk/client-s3');
  vi.mock('@aws-sdk/s3-request-presigner');

  describe('storage', () => {
    describe('generatePresignedUploadUrl', () => {
      it('returns a signed URL with correct bucket and key', async () => {
        const url = await generatePresignedUploadUrl('audio', 'podcasts/abc.mp3', 'audio/mpeg');
        expect(url).toBeDefined();
        expect(typeof url).toBe('string');
      });

      it('sets correct content-type header in presigned request', async () => {
        /* ... */
      });
      it('uses configured expiry time (default 1 hour)', async () => {
        /* ... */
      });
    });

    describe('generatePresignedDownloadUrl', () => {
      it('returns a signed download URL', async () => {
        /* ... */
      });
      it('uses configured expiry time (default 1 hour)', async () => {
        /* ... */
      });
    });

    describe('deleteObject', () => {
      it('calls DeleteObjectCommand with correct bucket and key', async () => {
        /* ... */
      });
      it('throws StorageError on failure', async () => {
        /* ... */
      });
    });
  });
  ```

- [ ] **1.2 — Install dependencies**

  ```bash
  npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  ```

- [ ] **1.3 — Implement `lib/storage.ts`**

  ```typescript
  import {
    S3Client,
    DeleteObjectCommand,
    PutObjectCommand,
    GetObjectCommand,
  } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

  const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT, // MinIO in dev, Azure Blob gateway in prod
    forcePathStyle: true, // Required for MinIO
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });

  const PRESIGNED_EXPIRY = 3600; // 1 hour

  export async function generatePresignedUploadUrl(
    bucket: string,
    key: string,
    contentType: string
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_EXPIRY });
  }

  export async function generatePresignedDownloadUrl(bucket: string, key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_EXPIRY });
  }

  export async function deleteObject(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await s3Client.send(command);
  }
  ```

- [ ] **1.4 — Add env vars to `.env.example`**

  ```
  S3_ENDPOINT=http://localhost:9000
  S3_REGION=us-east-1
  S3_ACCESS_KEY_ID=minioadmin
  S3_SECRET_ACCESS_KEY=minioadmin
  ```

- [ ] **1.5 — Run tests, confirm green**
  ```bash
  npx vitest run lib/__tests__/storage.test.ts
  ```

---

## Task 2: File Upload Utilities

**Files:**

- `lib/upload.ts` — MIME validation, filename sanitization, size formatting
- `lib/__tests__/upload.test.ts` — unit tests

### Steps

- [ ] **2.1 — Write failing tests first**
      Create `lib/__tests__/upload.test.ts`:

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { validateFileType, sanitizeFilename, formatFileSize, generateUniqueKey } from '../upload';

  describe('validateFileType', () => {
    it('returns true for allowed MIME types', () => {
      expect(validateFileType('audio/mpeg', ['audio/mpeg', 'audio/wav'])).toBe(true);
    });
    it('returns false for disallowed MIME types', () => {
      expect(validateFileType('application/exe', ['audio/mpeg'])).toBe(false);
    });
    it('is case-insensitive', () => {
      expect(validateFileType('Audio/MPEG', ['audio/mpeg'])).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('removes special characters', () => {
      expect(sanitizeFilename('my podcast (1).mp3')).toBe('my-podcast-1.mp3');
    });
    it('converts to lowercase', () => {
      expect(sanitizeFilename('MyFile.MP3')).toBe('myfile.mp3');
    });
    it('replaces spaces with hyphens', () => {
      expect(sanitizeFilename('my file name.mp3')).toBe('my-file-name.mp3');
    });
    it('handles multiple consecutive special characters', () => {
      expect(sanitizeFilename('file---name...mp3')).toMatch(/^file-name\.mp3$/);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });
    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
    });
    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
    });
    it('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });
  });

  describe('generateUniqueKey', () => {
    it('generates a key with bucket prefix and UUID', () => {
      const key = generateUniqueKey('audio', 'my-podcast.mp3');
      expect(key).toMatch(/^audio\/[a-f0-9-]+\/my-podcast\.mp3$/);
    });
  });
  ```

- [ ] **2.2 — Implement `lib/upload.ts`**

  ```typescript
  import { randomUUID } from 'crypto';

  const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const ALLOWED_PDF_TYPES = ['application/pdf'];

  export const FILE_TYPE_GROUPS = {
    audio: ALLOWED_AUDIO_TYPES,
    image: ALLOWED_IMAGE_TYPES,
    pdf: ALLOWED_PDF_TYPES,
  } as const;

  export const MAX_FILE_SIZES = {
    audio: 500 * 1024 * 1024, // 500 MB
    image: 5 * 1024 * 1024, // 5 MB
    pdf: 50 * 1024 * 1024, // 50 MB
  } as const;

  export function validateFileType(mime: string, allowed: string[]): boolean {
    return allowed.map((t) => t.toLowerCase()).includes(mime.toLowerCase());
  }

  export function sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9.\-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/\.+/g, '.')
      .replace(/^-|-$/g, '');
  }

  export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  export function generateUniqueKey(prefix: string, filename: string): string {
    const sanitized = sanitizeFilename(filename);
    return `${prefix}/${randomUUID()}/${sanitized}`;
  }
  ```

- [ ] **2.3 — Run tests, confirm green**
  ```bash
  npx vitest run lib/__tests__/upload.test.ts
  ```

---

## Task 3: Podcast API Routes — GET (List + Single)

**Files:**

- `app/api/podcasts/route.ts` — GET (paginated, filterable)
- `app/api/podcasts/[id]/route.ts` — GET (single with transcript)
- `lib/validations/podcast.ts` — Zod schemas for query params
- `app/api/podcasts/__tests__/get-podcasts.test.ts` — integration tests

### Steps

- [ ] **3.1 — Define Zod schemas for query params**
      Create `lib/validations/podcast.ts`:

  ```typescript
  import { z } from 'zod';

  export const DOMAINS = [
    'Audit Methodology',
    'Accounting and Reporting',
    'Audit Technology',
    'Quality and Risk',
    'LEAP',
    'Auditing',
  ] as const;

  export const podcastQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    domain: z.enum(DOMAINS).optional(),
    year: z.coerce.number().int().min(2020).max(2099).optional(),
    tags: z.string().optional(), // comma-separated
    sort: z.enum(['newest', 'oldest', 'title']).default('newest'),
  });

  export const podcastCreateSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    domain: z.enum(DOMAINS),
    year: z.number().int().min(2020).max(2099),
    tags: z.array(z.string()).default([]),
    thumbnail_url: z.string().url(),
    audio_short_url: z.string().url(),
    audio_long_url: z.string().url().optional(),
    bulletin_urls: z.array(z.string().url()).default([]),
    sort_order: z.number().int().default(0),
  });

  export const podcastUpdateSchema = podcastCreateSchema.partial();

  export const batchSortOrderSchema = z.object({
    items: z.array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int(),
      })
    ),
  });

  export type PodcastQuery = z.infer<typeof podcastQuerySchema>;
  export type PodcastCreate = z.infer<typeof podcastCreateSchema>;
  export type PodcastUpdate = z.infer<typeof podcastUpdateSchema>;
  ```

- [ ] **3.2 — Write failing integration tests**
      Create `app/api/podcasts/__tests__/get-podcasts.test.ts`:

  ```typescript
  import { describe, it, expect, beforeAll, afterAll } from 'vitest';
  // Use test helpers from Stage 1 for seeding DB and making requests

  describe('GET /api/podcasts', () => {
    it('returns paginated list of non-archived podcasts', async () => {
      /* ... */
    });
    it('filters by domain', async () => {
      /* ... */
    });
    it('filters by year', async () => {
      /* ... */
    });
    it('filters by tags (comma-separated)', async () => {
      /* ... */
    });
    it('sorts by newest (default)', async () => {
      /* ... */
    });
    it('sorts by title A-Z', async () => {
      /* ... */
    });
    it('returns correct pagination metadata', async () => {
      /* ... */
    });
    it('excludes archived podcasts', async () => {
      /* ... */
    });
    it('returns 400 for invalid query params', async () => {
      /* ... */
    });
  });

  describe('GET /api/podcasts/:id', () => {
    it('returns podcast with transcript', async () => {
      /* ... */
    });
    it('returns 404 for non-existent podcast', async () => {
      /* ... */
    });
    it('returns 404 for archived podcast', async () => {
      /* ... */
    });
  });
  ```

- [ ] **3.3 — Implement `app/api/podcasts/route.ts` (GET)**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { podcastQuerySchema } from '@/lib/validations/podcast';
  import { paginate } from '@/lib/pagination'; // from Stage 1

  export async function GET(request: NextRequest) {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = podcastQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: 400,
          error_code: 'VALIDATION_FAILED',
          message: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const { page, limit, domain, year, tags, sort } = parsed.data;

    const where: any = { is_archived: false };
    if (domain) where.domain = domain;
    if (year) where.year = year;
    if (tags) where.tags = { hasSome: tags.split(',').map((t) => t.trim()) };

    const orderBy =
      sort === 'newest'
        ? { created_at: 'desc' }
        : sort === 'oldest'
          ? { created_at: 'asc' }
          : { title: 'asc' };

    const [data, total] = await Promise.all([
      prisma.podcast.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      prisma.podcast.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  }
  ```

- [ ] **3.4 — Implement `app/api/podcasts/[id]/route.ts` (GET)**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';

  export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const podcast = await prisma.podcast.findFirst({
      where: { id, is_archived: false },
      include: { transcripts: true },
    });
    if (!podcast) {
      return NextResponse.json(
        { status: 404, error_code: 'NOT_FOUND', message: 'Podcast not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: podcast });
  }
  ```

- [ ] **3.5 — Run tests, confirm green**
  ```bash
  npx vitest run app/api/podcasts/__tests__/get-podcasts.test.ts
  ```

---

## Task 4: Podcast API Routes — Create / Update / Delete

**Files:**

- `app/api/podcasts/route.ts` — add POST handler
- `app/api/podcasts/[id]/route.ts` — add PUT, DELETE handlers
- `app/api/podcasts/batch/route.ts` — PATCH batch sort order
- `app/api/podcasts/__tests__/mutate-podcasts.test.ts` — integration tests

### Steps

- [ ] **4.1 — Write failing tests first**
      Create `app/api/podcasts/__tests__/mutate-podcasts.test.ts`:

  ```typescript
  describe('POST /api/podcasts', () => {
    it('creates a podcast when user is admin', async () => {
      /* ... */
    });
    it('returns 401 when unauthenticated', async () => {
      /* ... */
    });
    it('returns 403 when user is not admin', async () => {
      /* ... */
    });
    it('returns 400 for invalid body', async () => {
      /* ... */
    });
    it('validates domain enum', async () => {
      /* ... */
    });
  });

  describe('PUT /api/podcasts/:id', () => {
    it('updates podcast metadata', async () => {
      /* ... */
    });
    it('returns 404 for non-existent podcast', async () => {
      /* ... */
    });
    it('returns 403 for non-admin user', async () => {
      /* ... */
    });
    it('allows partial updates', async () => {
      /* ... */
    });
  });

  describe('DELETE /api/podcasts/:id', () => {
    it('soft-deletes (archives) podcast for superadmin', async () => {
      /* ... */
    });
    it('returns 403 for admin (not superadmin)', async () => {
      /* ... */
    });
    it('returns 404 for non-existent podcast', async () => {
      /* ... */
    });
  });

  describe('PATCH /api/podcasts/batch', () => {
    it('updates sort order for multiple podcasts', async () => {
      /* ... */
    });
    it('returns 403 for non-admin user', async () => {
      /* ... */
    });
    it('validates batch payload', async () => {
      /* ... */
    });
  });
  ```

- [ ] **4.2 — Implement POST in `app/api/podcasts/route.ts`**
      Add to the existing route file:

  ```typescript
  import { verifyAuth, requireRole } from '@/lib/auth'; // from Stage 1
  import { podcastCreateSchema } from '@/lib/validations/podcast';

  export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const roleCheck = requireRole(auth, ['admin', 'superadmin']);
    if (!roleCheck.authorized)
      return NextResponse.json(
        { status: 403, error_code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      );

    const body = await request.json();
    const parsed = podcastCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: 400,
          error_code: 'VALIDATION_FAILED',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const podcast = await prisma.podcast.create({ data: parsed.data });
    return NextResponse.json({ data: podcast }, { status: 201 });
  }
  ```

- [ ] **4.3 — Implement PUT and DELETE in `app/api/podcasts/[id]/route.ts`**
      PUT: admin/superadmin can update. DELETE: superadmin only, sets `is_archived: true`.

- [ ] **4.4 — Implement `app/api/podcasts/batch/route.ts` (PATCH)**

  ```typescript
  export async function PATCH(request: NextRequest) {
    // Auth check — admin required
    const { items } = batchSortOrderSchema.parse(await request.json());
    await prisma.$transaction(
      items.map(({ id, sort_order }) =>
        prisma.podcast.update({ where: { id }, data: { sort_order } })
      )
    );
    return NextResponse.json({ message: 'Sort order updated' });
  }
  ```

- [ ] **4.5 — Run tests, confirm green**
  ```bash
  npx vitest run app/api/podcasts/__tests__/mutate-podcasts.test.ts
  ```

---

## Task 5: Transcript API Routes

**Files:**

- `app/api/podcasts/[id]/transcript/route.ts` — GET, PUT
- `lib/validations/transcript.ts` — Zod schema
- `app/api/podcasts/[id]/transcript/__tests__/transcript.test.ts` — integration tests

### Steps

- [ ] **5.1 — Define Zod schema for transcript**
      Create `lib/validations/transcript.ts`:

  ```typescript
  import { z } from 'zod';

  export const transcriptSegmentSchema = z.object({
    start: z.number().min(0),
    end: z.number().min(0),
    text: z.string().min(1),
  });

  export const transcriptUpdateSchema = z.object({
    full_text: z.string().min(1),
    segments: z.array(transcriptSegmentSchema).min(1),
    transcript_type: z.enum(['short', 'long']).default('short'),
  });
  ```

- [ ] **5.2 — Write failing tests**

  ```typescript
  describe('GET /api/podcasts/:id/transcript', () => {
    it('returns transcript with segments', async () => {
      /* ... */
    });
    it('returns 404 if podcast has no transcript', async () => {
      /* ... */
    });
  });

  describe('PUT /api/podcasts/:id/transcript', () => {
    it('creates or updates transcript (admin)', async () => {
      /* ... */
    });
    it('returns 403 for non-admin', async () => {
      /* ... */
    });
    it('validates segment format', async () => {
      /* ... */
    });
  });
  ```

- [ ] **5.3 — Implement GET and PUT handlers**
      GET: Returns transcript(s) for the podcast.
      PUT: Upserts transcript using `prisma.transcript.upsert` with `(podcast_id, transcript_type)` as unique constraint.

- [ ] **5.4 — Run tests, confirm green**

---

## Task 6: Upload API Route

**Files:**

- `app/api/upload/route.ts` — POST (returns presigned URL)
- `app/api/upload/__tests__/upload.test.ts` — integration tests

### Steps

- [ ] **6.1 — Write failing tests**

  ```typescript
  describe('POST /api/upload', () => {
    it('returns presigned URL for valid audio upload request', async () => {
      /* ... */
    });
    it('returns presigned URL for valid image upload request', async () => {
      /* ... */
    });
    it('returns presigned URL for valid PDF upload request', async () => {
      /* ... */
    });
    it('returns 400 for unsupported file type', async () => {
      /* ... */
    });
    it('returns 400 for file exceeding size limit', async () => {
      /* ... */
    });
    it('returns 401 for unauthenticated user', async () => {
      /* ... */
    });
    it('returns 403 for non-admin user', async () => {
      /* ... */
    });
  });
  ```

- [ ] **6.2 — Implement `app/api/upload/route.ts`**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { verifyAuth, requireRole } from '@/lib/auth';
  import { generatePresignedUploadUrl } from '@/lib/storage';
  import {
    validateFileType,
    generateUniqueKey,
    FILE_TYPE_GROUPS,
    MAX_FILE_SIZES,
  } from '@/lib/upload';
  import { z } from 'zod';

  const uploadRequestSchema = z.object({
    filename: z.string().min(1),
    content_type: z.string().min(1),
    file_size: z.number().int().positive(),
    category: z.enum(['audio', 'image', 'pdf']),
  });

  const BUCKET_MAP = { audio: 'audio', image: 'thumbnails', pdf: 'bulletins' } as const;

  export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    const roleCheck = requireRole(auth, ['admin', 'superadmin']);
    if (!roleCheck.authorized)
      return NextResponse.json(
        { status: 403, error_code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      );

    const body = await request.json();
    const parsed = uploadRequestSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          status: 400,
          error_code: 'VALIDATION_FAILED',
          message: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );

    const { filename, content_type, file_size, category } = parsed.data;

    if (!validateFileType(content_type, FILE_TYPE_GROUPS[category])) {
      return NextResponse.json(
        {
          status: 400,
          error_code: 'VALIDATION_FAILED',
          message: `Invalid file type for ${category}`,
        },
        { status: 400 }
      );
    }
    if (file_size > MAX_FILE_SIZES[category]) {
      return NextResponse.json(
        {
          status: 400,
          error_code: 'VALIDATION_FAILED',
          message: `File exceeds maximum size for ${category}`,
        },
        { status: 400 }
      );
    }

    const bucket = BUCKET_MAP[category];
    const key = generateUniqueKey(category, filename);
    const upload_url = await generatePresignedUploadUrl(bucket, key, content_type);

    return NextResponse.json({ data: { upload_url, key, bucket } });
  }
  ```

- [ ] **6.3 — Run tests, confirm green**

---

## Task 7: shadcn/ui Component Installation

**Files:**

- `components/ui/*.tsx` — all installed shadcn components
- `components.json` — shadcn config
- `lib/utils.ts` — cn utility (if not already from Stage 1)

### Steps

- [ ] **7.1 — Initialize shadcn/ui (if not already done)**

  ```bash
  npx shadcn@latest init
  ```

  Select: New York style, Tailwind CSS, CSS variables for colors.

- [ ] **7.2 — Install required components**

  ```bash
  npx shadcn@latest add button input textarea select label card table badge dialog dropdown-menu skeleton separator tabs tooltip sheet scroll-area
  ```

- [ ] **7.3 — Install toast library (Sonner)**

  ```bash
  npm install sonner
  ```

  Add `<Toaster />` to root layout if not already present.

- [ ] **7.4 — Verify all components render without errors**
      Quick smoke test: create a temporary page that imports each component and verify `npm run build` succeeds.

---

## Task 8: Admin Upload Form

**Files:**

- `components/admin/podcast-upload-form.tsx` — full upload form
- `components/admin/__tests__/podcast-upload-form.test.tsx` — component tests
- `hooks/use-file-upload.ts` — file upload hook with progress tracking

### Steps

- [ ] **8.1 — Write failing component tests**
      Create `components/admin/__tests__/podcast-upload-form.test.tsx`:

  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, waitFor } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { PodcastUploadForm } from '../podcast-upload-form';

  describe('PodcastUploadForm', () => {
    it('renders all required form fields', () => {
      render(<PodcastUploadForm />);
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/audio/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/thumbnail/i)).toBeInTheDocument();
    });

    it('shows validation errors for empty submission', async () => {
      render(<PodcastUploadForm />);
      await userEvent.click(screen.getByRole('button', { name: /upload|submit/i }));
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it('displays file upload progress', async () => { /* ... */ });
    it('calls onSuccess callback after successful submission', async () => { /* ... */ });
    it('handles upload failure gracefully', async () => { /* ... */ });
    it('allows adding and removing tags', async () => { /* ... */ });
  });
  ```

- [ ] **8.2 — Create `hooks/use-file-upload.ts`**

  ```typescript
  'use client';
  import { useState, useCallback } from 'react';

  interface UploadState {
    progress: number;
    isUploading: boolean;
    error: string | null;
    uploadedKey: string | null;
  }

  export function useFileUpload() {
    const [state, setState] = useState<UploadState>({
      progress: 0,
      isUploading: false,
      error: null,
      uploadedKey: null,
    });

    const upload = useCallback(async (file: File, category: 'audio' | 'image' | 'pdf') => {
      setState({ progress: 0, isUploading: true, error: null, uploadedKey: null });
      try {
        // Step 1: Get presigned URL from our API
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type,
            file_size: file.size,
            category,
          }),
        });
        if (!res.ok) throw new Error('Failed to get upload URL');
        const { data } = await res.json();

        // Step 2: Upload directly to S3/MinIO with progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setState((s) => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed'));
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.open('PUT', data.upload_url);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        setState({ progress: 100, isUploading: false, error: null, uploadedKey: data.key });
        return data.key;
      } catch (err: any) {
        setState((s) => ({ ...s, isUploading: false, error: err.message }));
        throw err;
      }
    }, []);

    return { ...state, upload };
  }
  ```

- [ ] **8.3 — Implement `components/admin/podcast-upload-form.tsx`**
  - Uses React Hook Form with `podcastCreateSchema` as Zod resolver
  - File inputs for audio (short required, long optional), thumbnail, bulletins
  - Domain select dropdown with the 6 audit domains
  - Year number input
  - Tag input (type and press Enter to add, click X to remove)
  - Submit: uploads files first (getting keys), then POSTs to `/api/podcasts`
  - Shows toast on success/failure via Sonner

- [ ] **8.4 — Run tests, confirm green**

---

## Task 9: Admin Podcast Table

**Files:**

- `components/admin/podcast-table.tsx` — sortable data table
- `components/admin/__tests__/podcast-table.test.tsx` — component tests
- `components/admin/podcast-table-actions.tsx` — row action dropdown

### Steps

- [ ] **9.1 — Install @dnd-kit**

  ```bash
  npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  ```

- [ ] **9.2 — Write failing component tests**

  ```typescript
  describe('PodcastTable', () => {
    it('renders podcast rows with title, domain, year, status', () => {
      /* ... */
    });
    it('shows archived badge for archived podcasts', () => {
      /* ... */
    });
    it('renders action dropdown with Edit and Archive buttons', () => {
      /* ... */
    });
    it('calls onSortOrderChange when rows are dragged', () => {
      /* ... */
    });
    it('renders pagination controls', () => {
      /* ... */
    });
    it('calls onPageChange when pagination buttons are clicked', () => {
      /* ... */
    });
    it('shows empty state when no podcasts', () => {
      /* ... */
    });
  });
  ```

- [ ] **9.3 — Implement `components/admin/podcast-table.tsx`**
  - `'use client'` component
  - Uses shadcn Table component
  - Columns: drag handle, title, domain (badge), year, tags, status, actions
  - @dnd-kit/sortable for drag-to-reorder rows
  - On reorder: calls `PATCH /api/podcasts/batch` with new sort orders
  - Pagination: page number, previous/next, total count

- [ ] **9.4 — Implement `components/admin/podcast-table-actions.tsx`**
  - DropdownMenu with: Edit (navigates to `/admin/edit/[id]`), Archive/Unarchive toggle, View (opens in new tab)

- [ ] **9.5 — Run tests, confirm green**

---

## Task 10: Admin Pages

**Files:**

- `app/(admin)/layout.tsx` — admin layout with sidebar
- `app/(admin)/admin/page.tsx` — dashboard (podcast table)
- `app/(admin)/admin/upload/page.tsx` — upload form
- `app/(admin)/admin/edit/[id]/page.tsx` — edit podcast
- `components/admin/admin-sidebar.tsx` — sidebar navigation

### Steps

- [ ] **10.1 — Create `components/admin/admin-sidebar.tsx`**
  - Links: Dashboard, Upload, Learning Paths (future), Users (future), Analytics (future)
  - Active link highlighting based on current route
  - Responsive: collapsed on mobile (sheet/drawer)

- [ ] **10.2 — Create `app/(admin)/layout.tsx`**

  ```typescript
  import { AdminSidebar } from '@/components/admin/admin-sidebar';

  export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    );
  }
  ```

- [ ] **10.3 — Create `app/(admin)/admin/page.tsx` (Dashboard)**
  - Server Component that fetches podcasts (paginated)
  - Renders `<PodcastTable>` with fetched data
  - Includes link to upload page

- [ ] **10.4 — Create `app/(admin)/admin/upload/page.tsx`**
  - Renders `<PodcastUploadForm />`
  - On success: redirect to dashboard with success toast

- [ ] **10.5 — Create `app/(admin)/admin/edit/[id]/page.tsx`**
  - Server Component: fetch podcast by ID
  - Renders `<PodcastUploadForm initialData={podcast} mode="edit" />`
  - On success: redirect to dashboard

- [ ] **10.6 — Verify pages render correctly**
  ```bash
  npm run build
  ```

---

## Task 11: Podcast Card Component

**Files:**

- `components/library/podcast-card.tsx` — card for library grid
- `components/library/__tests__/podcast-card.test.tsx` — component tests

### Steps

- [ ] **11.1 — Write failing tests**

  ```typescript
  describe('PodcastCard', () => {
    const mockPodcast = {
      id: '123',
      title: 'Audit Methodology Update Q1',
      description: 'Latest updates to the audit methodology framework...',
      domain: 'Audit Methodology',
      year: 2026,
      tags: ['methodology', 'update'],
      thumbnail_url: '/thumbnails/amg-q1.jpg',
    };

    it('renders podcast title', () => {
      /* ... */
    });
    it('renders domain as a badge', () => {
      /* ... */
    });
    it('renders year', () => {
      /* ... */
    });
    it('truncates long descriptions', () => {
      /* ... */
    });
    it('renders thumbnail image', () => {
      /* ... */
    });
    it('links to podcast detail page', () => {
      /* ... */
    });
    it('renders tags as badges', () => {
      /* ... */
    });
  });
  ```

- [ ] **11.2 — Implement `components/library/podcast-card.tsx`**

  ```typescript
  import Image from 'next/image';
  import Link from 'next/link';
  import { Badge } from '@/components/ui/badge';
  import { Card, CardContent, CardHeader } from '@/components/ui/card';

  interface PodcastCardProps {
    id: string;
    title: string;
    description: string;
    domain: string;
    year: number;
    tags: string[];
    thumbnail_url: string;
  }

  export function PodcastCard({ id, title, description, domain, year, tags, thumbnail_url }: PodcastCardProps) {
    return (
      <Link href={`/podcast/${id}`}>
        <Card className="hover:shadow-md transition-shadow h-full">
          <div className="relative aspect-video">
            <Image src={thumbnail_url} alt={title} fill className="object-cover rounded-t-lg" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{domain}</Badge>
              <span className="text-sm text-muted-foreground">{year}</span>
            </div>
            <h3 className="font-semibold line-clamp-2">{title}</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }
  ```

- [ ] **11.3 — Run tests, confirm green**

---

## Task 12: Public Library Page

**Files:**

- `app/(public)/layout.tsx` — public navigation layout
- `app/(public)/bulletins/page.tsx` — filterable podcast library
- `components/library/library-filters.tsx` — filter controls
- `components/library/podcast-grid.tsx` — responsive grid of PodcastCards

### Steps

- [ ] **12.1 — Create `components/library/library-filters.tsx`**
  - `'use client'` component
  - Domain filter (select dropdown with "All Domains" + 6 domains)
  - Sort selector (Newest, Oldest, Title A-Z)
  - Syncs with URL search params using `useSearchParams` and `useRouter`

- [ ] **12.2 — Create `components/library/podcast-grid.tsx`**
  - Renders array of `<PodcastCard>` in responsive CSS grid
  - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
  - Empty state: "No podcasts found. Try adjusting your filters."
  - Loading state: skeleton cards (using shadcn Skeleton)

- [ ] **12.3 — Create `app/(public)/layout.tsx`**
  - Top navigation bar: Home, Library (dropdown: Technical Content, Learning Series), Search
  - User menu (avatar, Profile, Progress, Theme Toggle, Logout)
  - `{children}` slot
  - Mini-player slot at bottom (placeholder for Stage 3)

- [ ] **12.4 — Create `app/(public)/bulletins/page.tsx`**

  ```typescript
  import { prisma } from '@/lib/prisma';
  import { PodcastGrid } from '@/components/library/podcast-grid';
  import { LibraryFilters } from '@/components/library/library-filters';

  interface Props {
    searchParams: Promise<{ domain?: string; sort?: string; page?: string }>;
  }

  export default async function BulletinsPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const limit = 20;
    const where: any = { is_archived: false };
    if (params.domain) where.domain = params.domain;

    const orderBy = params.sort === 'oldest' ? { created_at: 'asc' as const }
      : params.sort === 'title' ? { title: 'asc' as const }
      : { created_at: 'desc' as const };

    const [podcasts, total] = await Promise.all([
      prisma.podcast.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      prisma.podcast.count({ where }),
    ]);

    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Technical Content</h1>
        <LibraryFilters />
        <PodcastGrid podcasts={podcasts} />
        {/* Pagination component */}
      </div>
    );
  }
  ```

- [ ] **12.5 — Add pagination component to the page**
      Use a shared pagination component that updates URL search params.

---

## Task 13: Home Page

**Files:**

- `app/(public)/page.tsx` — home page

### Steps

- [ ] **13.1 — Create `app/(public)/page.tsx`**
  - Server Component
  - Hero section with app title and description
  - "Recently Added" section: fetch latest 4 podcasts, render as PodcastCards
  - "Browse by Category" section: 6 domain cards linking to `/bulletins?domain=<domain>`
  - Each category card shows domain name, abbreviation, podcast count

- [ ] **13.2 — Fetch data server-side**

  ```typescript
  const recentPodcasts = await prisma.podcast.findMany({
    where: { is_archived: false },
    orderBy: { created_at: 'desc' },
    take: 4,
  });

  const domainCounts = await prisma.podcast.groupBy({
    by: ['domain'],
    where: { is_archived: false },
    _count: true,
  });
  ```

- [ ] **13.3 — Verify page renders correctly**

---

## Task 14: Integration Tests for All API Routes

**Files:**

- `app/api/podcasts/__tests__/get-podcasts.test.ts` — (from Task 3)
- `app/api/podcasts/__tests__/mutate-podcasts.test.ts` — (from Task 4)
- `app/api/podcasts/[id]/transcript/__tests__/transcript.test.ts` — (from Task 5)
- `app/api/upload/__tests__/upload.test.ts` — (from Task 6)

### Steps

- [ ] **14.1 — Verify all test files exist and cover:**
  - Success cases for all CRUD operations
  - Validation error cases (bad input, missing fields)
  - Authentication failures (no token, expired token)
  - Authorization failures (wrong role)
  - Not found cases
  - Pagination edge cases (page 0, page beyond total)
  - Filtering combinations

- [ ] **14.2 — Run full test suite**

  ```bash
  npx vitest run --reporter=verbose
  ```

- [ ] **14.3 — Verify no failing tests, check coverage**
  ```bash
  npx vitest run --coverage
  ```
  Target: >80% line coverage for `lib/` and `app/api/` directories.

---

## Task 15: Commit and Verify

### Steps

- [ ] **15.1 — Run lint and type check**

  ```bash
  npm run lint
  npx tsc --noEmit
  ```

- [ ] **15.2 — Run full test suite one final time**

  ```bash
  npx vitest run
  ```

- [ ] **15.3 — Run build to verify no build errors**

  ```bash
  npm run build
  ```

- [ ] **15.4 — Commit with conventional commit message**
  ```bash
  git add -A
  git commit -m "feat: add core content APIs, admin dashboard, and public library (Stage 2)"
  ```

---

## Verification Checklist

After completing all tasks, confirm:

- [ ] All podcast CRUD API routes are functional with proper auth
- [ ] File upload via presigned URLs works end-to-end
- [ ] Admin dashboard shows podcast table with drag-to-reorder
- [ ] Upload form creates podcasts with file uploads
- [ ] Edit form updates podcast metadata
- [ ] Public library page shows filterable, paginated podcast grid
- [ ] Home page shows recent podcasts and category cards
- [ ] All tests pass with >80% coverage
- [ ] No TypeScript errors, no lint warnings
- [ ] Build succeeds without errors
