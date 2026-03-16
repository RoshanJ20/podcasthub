# Stage 4: User Features — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build bookmark CRUD, progress tracking, activity logging, user profile, and progress dashboard.

**Architecture:** API routes with Prisma, Zustand stores for client state, server-rendered pages with client interactive panels.

**Tech Stack:** Next.js 16, Prisma, Zustand, shadcn/ui, React Hook Form + Zod.

**Prerequisite:** Stage 3 (Audio Experience) is complete — audio player, transcript viewer, bulletin viewer, and mini player are functional.

---

## Task 1: Bookmark API Routes — TDD

**Files:**

- `app/api/bookmarks/route.ts` — GET (paginated + filtered), POST
- `app/api/bookmarks/[id]/route.ts` — PUT, DELETE
- `lib/validations/bookmark.ts` — Zod schemas
- `app/api/bookmarks/__tests__/bookmarks.test.ts` — integration tests

### Steps

- [ ] **1.1 — Define Zod schemas**
      Create `lib/validations/bookmark.ts`:

  ```typescript
  import { z } from 'zod';

  export const bookmarkCreateSchema = z.object({
    podcast_id: z.string().uuid(),
    timestamp_seconds: z.number().min(0),
    note: z.string().max(1000).optional(),
  });

  export const bookmarkUpdateSchema = z.object({
    note: z.string().max(1000).optional().nullable(),
  });

  export const bookmarkQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    podcast_id: z.string().uuid().optional(),
    sort: z.enum(['newest', 'oldest', 'timestamp']).default('newest'),
  });

  export type BookmarkCreate = z.infer<typeof bookmarkCreateSchema>;
  export type BookmarkUpdate = z.infer<typeof bookmarkUpdateSchema>;
  export type BookmarkQuery = z.infer<typeof bookmarkQuerySchema>;
  ```

- [ ] **1.2 — Write failing integration tests**
      Create `app/api/bookmarks/__tests__/bookmarks.test.ts`:

  ```typescript
  import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

  describe('GET /api/bookmarks', () => {
    it('returns paginated bookmarks for the authenticated user', async () => {
      // Seed: create user, create podcast, create 3 bookmarks
      // Assert: response has data array with 3 items, correct pagination metadata
    });

    it('filters bookmarks by podcast_id', async () => {
      // Seed: user with bookmarks on 2 different podcasts
      // Assert: only bookmarks for specified podcast returned
    });

    it('does not return other users bookmarks', async () => {
      // Seed: user A has bookmarks, user B has bookmarks
      // Auth as user A -> only sees user A bookmarks
    });

    it('returns 401 for unauthenticated request', async () => {
      // No auth header -> 401
    });

    it('sorts by newest (default)', async () => {
      /* ... */
    });
    it('sorts by timestamp_seconds ascending', async () => {
      /* ... */
    });
    it('paginates correctly', async () => {
      /* ... */
    });
  });

  describe('POST /api/bookmarks', () => {
    it('creates a bookmark at the given timestamp', async () => {
      // Auth as user, POST with valid body
      // Assert: 201, bookmark returned with correct podcast_id and timestamp
    });

    it('creates a bookmark with a note', async () => {
      // Include note in body
      // Assert: bookmark has note
    });

    it('returns 400 for invalid podcast_id', async () => {
      /* ... */
    });
    it('returns 400 for negative timestamp', async () => {
      /* ... */
    });
    it('returns 401 for unauthenticated request', async () => {
      /* ... */
    });
    it('returns 404 if podcast does not exist', async () => {
      /* ... */
    });
  });

  describe('PUT /api/bookmarks/:id', () => {
    it('updates the bookmark note', async () => {
      // Create bookmark, then PUT with new note
      // Assert: updated note returned
    });

    it('clears the note when set to null', async () => {
      /* ... */
    });
    it('returns 404 for non-existent bookmark', async () => {
      /* ... */
    });
    it('returns 403 when trying to update another users bookmark', async () => {
      // Auth as user B, try to PUT user A's bookmark -> 403
    });
  });

  describe('DELETE /api/bookmarks/:id', () => {
    it('deletes the bookmark', async () => {
      // Create bookmark, DELETE it, GET -> not found
    });

    it('returns 404 for non-existent bookmark', async () => {
      /* ... */
    });
    it('returns 403 when trying to delete another users bookmark', async () => {
      /* ... */
    });
  });
  ```

- [ ] **1.3 — Implement `app/api/bookmarks/route.ts`**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';
  import { bookmarkCreateSchema, bookmarkQuerySchema } from '@/lib/validations/bookmark';

  export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = bookmarkQuerySchema.safeParse(searchParams);
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

    const { page, limit, podcast_id, sort } = parsed.data;
    const where: any = { user_id: auth.userId }; // Scoped to authenticated user
    if (podcast_id) where.podcast_id = podcast_id;

    const orderBy =
      sort === 'timestamp'
        ? { timestamp_seconds: 'asc' as const }
        : sort === 'oldest'
          ? { created_at: 'asc' as const }
          : { created_at: 'desc' as const };

    const [data, total] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { podcast: { select: { id: true, title: true, thumbnail_url: true } } },
      }),
      prisma.bookmark.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  }

  export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const body = await request.json();
    const parsed = bookmarkCreateSchema.safeParse(body);
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

    // Verify podcast exists
    const podcast = await prisma.podcast.findFirst({
      where: { id: parsed.data.podcast_id, is_archived: false },
    });
    if (!podcast) {
      return NextResponse.json(
        { status: 404, error_code: 'NOT_FOUND', message: 'Podcast not found' },
        { status: 404 }
      );
    }

    const bookmark = await prisma.bookmark.create({
      data: { ...parsed.data, user_id: auth.userId },
    });

    return NextResponse.json({ data: bookmark }, { status: 201 });
  }
  ```

- [ ] **1.4 — Implement `app/api/bookmarks/[id]/route.ts`**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';
  import { bookmarkUpdateSchema } from '@/lib/validations/bookmark';

  // Helper: fetch bookmark and verify ownership
  async function getOwnedBookmark(id: string, userId: string) {
    const bookmark = await prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark) return { error: 'NOT_FOUND', status: 404 };
    if (bookmark.user_id !== userId) return { error: 'FORBIDDEN', status: 403 };
    return { bookmark };
  }

  export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const { id } = await params;
    const result = await getOwnedBookmark(id, auth.userId);
    if ('error' in result) {
      return NextResponse.json(
        {
          status: result.status,
          error_code: result.error,
          message: result.error === 'NOT_FOUND' ? 'Bookmark not found' : 'Access denied',
        },
        { status: result.status }
      );
    }

    const body = await request.json();
    const parsed = bookmarkUpdateSchema.safeParse(body);
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

    const updated = await prisma.bookmark.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ data: updated });
  }

  export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const { id } = await params;
    const result = await getOwnedBookmark(id, auth.userId);
    if ('error' in result) {
      return NextResponse.json(
        {
          status: result.status,
          error_code: result.error,
          message: result.error === 'NOT_FOUND' ? 'Bookmark not found' : 'Access denied',
        },
        { status: result.status }
      );
    }

    await prisma.bookmark.delete({ where: { id } });
    return NextResponse.json({ message: 'Bookmark deleted' });
  }
  ```

- [ ] **1.5 — Run tests, confirm green**
  ```bash
  npx vitest run app/api/bookmarks/__tests__/bookmarks.test.ts
  ```

---

## Task 2: Bookmark Panel Component

**Files:**

- `components/audio-player/bookmark-panel.tsx` — bookmark UI for podcast detail page
- `components/audio-player/__tests__/bookmark-panel.test.tsx` — component tests
- `stores/bookmark-store.ts` — Zustand store for bookmark state (optional, can also use SWR/React Query)

### Steps

- [ ] **2.1 — Write failing component tests**
      Create `components/audio-player/__tests__/bookmark-panel.test.tsx`:

  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, waitFor } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { BookmarkPanel } from '../bookmark-panel';

  // Mock fetch
  global.fetch = vi.fn();

  const mockBookmarks = [
    { id: '1', timestamp_seconds: 30, note: 'Key point about methodology', created_at: '2026-03-10T00:00:00Z' },
    { id: '2', timestamp_seconds: 90, note: null, created_at: '2026-03-11T00:00:00Z' },
  ];

  describe('BookmarkPanel', () => {
    it('renders existing bookmarks for the podcast', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: mockBookmarks }) });
      render(<BookmarkPanel podcastId="podcast-1" />);
      await waitFor(() => {
        expect(screen.getByText('Key point about methodology')).toBeInTheDocument();
      });
    });

    it('displays timestamp for each bookmark', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: mockBookmarks }) });
      render(<BookmarkPanel podcastId="podcast-1" />);
      await waitFor(() => {
        expect(screen.getByText('0:30')).toBeInTheDocument();
        expect(screen.getByText('1:30')).toBeInTheDocument();
      });
    });

    it('creates a new bookmark at current timestamp', async () => {
      // Mock player store currentTime = 45
      // Fill note input, click Add Bookmark
      // Assert: POST /api/bookmarks called with correct body
    });

    it('calls onSeek when a bookmark is clicked', async () => {
      const onSeek = vi.fn();
      (global.fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: mockBookmarks }) });
      render(<BookmarkPanel podcastId="podcast-1" onSeek={onSeek} />);
      await waitFor(() => screen.getByText('0:30'));
      await userEvent.click(screen.getByText('0:30'));
      expect(onSeek).toHaveBeenCalledWith(30);
    });

    it('allows editing a bookmark note', async () => {
      // Click edit icon, change note text, save
      // Assert: PUT /api/bookmarks/:id called
    });

    it('allows deleting a bookmark', async () => {
      // Click delete icon, confirm
      // Assert: DELETE /api/bookmarks/:id called, bookmark removed from list
    });

    it('shows empty state when no bookmarks', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: [] }) });
      render(<BookmarkPanel podcastId="podcast-1" />);
      await waitFor(() => {
        expect(screen.getByText(/no bookmarks yet/i)).toBeInTheDocument();
      });
    });
  });
  ```

- [ ] **2.2 — Implement `components/audio-player/bookmark-panel.tsx`**

  ```typescript
  'use client';
  import { useState, useEffect, useCallback } from 'react';
  import { usePlayerStore } from '@/stores/player-store';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { ScrollArea } from '@/components/ui/scroll-area';
  import { Bookmark, Pencil, Trash2, Plus } from 'lucide-react';
  import { toast } from 'sonner';

  interface BookmarkData {
    id: string;
    timestamp_seconds: number;
    note: string | null;
    created_at: string;
  }

  interface BookmarkPanelProps {
    podcastId: string;
    onSeek?: (time: number) => void;
  }

  function formatTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  export function BookmarkPanel({ podcastId, onSeek }: BookmarkPanelProps) {
    const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
    const [newNote, setNewNote] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNote, setEditNote] = useState('');
    const currentTime = usePlayerStore((s) => s.currentTime);

    // Fetch bookmarks on mount
    useEffect(() => {
      fetch(`/api/bookmarks?podcast_id=${podcastId}`)
        .then(res => res.json())
        .then(({ data }) => setBookmarks(data || []))
        .catch(() => {});
    }, [podcastId]);

    const addBookmark = useCallback(async () => {
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ podcast_id: podcastId, timestamp_seconds: currentTime, note: newNote || undefined }),
        });
        if (!res.ok) throw new Error('Failed to create bookmark');
        const { data } = await res.json();
        setBookmarks(prev => [...prev, data].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
        setNewNote('');
        toast.success('Bookmark added');
      } catch {
        toast.error('Failed to add bookmark');
      }
    }, [podcastId, currentTime, newNote]);

    const updateBookmark = useCallback(async (id: string) => {
      try {
        const res = await fetch(`/api/bookmarks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: editNote || null }),
        });
        if (!res.ok) throw new Error('Failed to update bookmark');
        const { data } = await res.json();
        setBookmarks(prev => prev.map(b => b.id === id ? data : b));
        setEditingId(null);
        toast.success('Bookmark updated');
      } catch {
        toast.error('Failed to update bookmark');
      }
    }, [editNote]);

    const deleteBookmark = useCallback(async (id: string) => {
      try {
        const res = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete bookmark');
        setBookmarks(prev => prev.filter(b => b.id !== id));
        toast.success('Bookmark deleted');
      } catch {
        toast.error('Failed to delete bookmark');
      }
    }, []);

    return (
      <div className="space-y-4">
        {/* Add bookmark form */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a note (optional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addBookmark(); }}
          />
          <Button onClick={addBookmark} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Bookmark at {formatTimestamp(currentTime)}
          </Button>
        </div>

        {/* Bookmark list */}
        {bookmarks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No bookmarks yet. Add one above.</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="flex items-start gap-2 p-2 rounded-md border hover:bg-muted">
                  <button
                    className="text-xs font-mono text-primary hover:underline flex-shrink-0 pt-0.5"
                    onClick={() => onSeek?.(bookmark.timestamp_seconds)}
                  >
                    {formatTimestamp(bookmark.timestamp_seconds)}
                  </button>
                  <div className="flex-1 min-w-0">
                    {editingId === bookmark.id ? (
                      <div className="flex gap-1">
                        <Input size="sm" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                        <Button size="sm" variant="ghost" onClick={() => updateBookmark(bookmark.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <p className="text-sm truncate">{bookmark.note || <span className="text-muted-foreground italic">No note</span>}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(bookmark.id); setEditNote(bookmark.note || ''); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteBookmark(bookmark.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }
  ```

- [ ] **2.3 — Add Bookmark tab to podcast detail layout**
      In `components/audio-player/podcast-detail-layout.tsx`, add a "Bookmarks" tab alongside "Transcript" and "Bulletins":

  ```typescript
  <TabsContent value="bookmarks">
    <BookmarkPanel podcastId={podcast.id} onSeek={seekTo} />
  </TabsContent>
  ```

- [ ] **2.4 — Run tests, confirm green**
  ```bash
  npx vitest run components/audio-player/__tests__/bookmark-panel.test.tsx
  ```

---

## Task 3: Progress API Routes — TDD

**Files:**

- `app/api/progress/route.ts` — GET, POST
- `app/api/progress/[id]/route.ts` — DELETE
- `lib/validations/progress.ts` — Zod schemas
- `app/api/progress/__tests__/progress.test.ts` — integration tests

### Steps

- [ ] **3.1 — Define Zod schemas**
      Create `lib/validations/progress.ts`:

  ```typescript
  import { z } from 'zod';

  export const progressCreateSchema = z.object({
    graph_id: z.string().uuid(),
    episode_id: z.string().uuid(),
  });

  export const progressQuerySchema = z.object({
    graph_id: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  });

  export type ProgressCreate = z.infer<typeof progressCreateSchema>;
  export type ProgressQuery = z.infer<typeof progressQuerySchema>;
  ```

- [ ] **3.2 — Write failing integration tests**
      Create `app/api/progress/__tests__/progress.test.ts`:

  ```typescript
  import { describe, it, expect } from 'vitest';

  describe('GET /api/progress', () => {
    it('returns all progress records for the authenticated user', async () => {
      // Seed: user with progress on multiple episodes across graphs
      // Assert: all progress entries returned with graph and episode info
    });

    it('filters by graph_id', async () => {
      // Assert: only progress for specified graph returned
    });

    it('does not return other users progress', async () => {
      // Auth as user A -> only user A progress returned
    });

    it('returns 401 for unauthenticated request', async () => {
      /* ... */
    });

    it('includes completed_at timestamp', async () => {
      // Assert: each progress entry has completed_at
    });
  });

  describe('POST /api/progress', () => {
    it('marks an episode as complete', async () => {
      // POST with graph_id and episode_id
      // Assert: 201, progress record created
    });

    it('is idempotent (creating duplicate returns existing)', async () => {
      // POST twice with same episode_id -> second returns 200 (or 201), no duplicate
    });

    it('returns 400 for invalid episode_id', async () => {
      /* ... */
    });
    it('returns 404 if episode does not exist', async () => {
      /* ... */
    });
    it('returns 401 for unauthenticated request', async () => {
      /* ... */
    });
  });

  describe('DELETE /api/progress/:id', () => {
    it('removes the progress record', async () => {
      // Create progress, delete it, GET -> not found
    });

    it('returns 404 for non-existent progress', async () => {
      /* ... */
    });
    it('returns 403 for another users progress', async () => {
      /* ... */
    });
  });
  ```

- [ ] **3.3 — Implement `app/api/progress/route.ts`**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';
  import { progressCreateSchema, progressQuerySchema } from '@/lib/validations/progress';

  export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = progressQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: 400,
          error_code: 'VALIDATION_FAILED',
          message: 'Invalid query',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { graph_id, page, limit } = parsed.data;
    const where: any = { user_id: auth.userId };
    if (graph_id) where.graph_id = graph_id;

    const [data, total] = await Promise.all([
      prisma.userProgress.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          episode: { select: { id: true, title: true, sort_order: true } },
          graph: { select: { id: true, title: true } },
        },
        orderBy: { completed_at: 'desc' },
      }),
      prisma.userProgress.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  }

  export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const body = await request.json();
    const parsed = progressCreateSchema.safeParse(body);
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

    // Verify episode exists and belongs to the graph
    const episode = await prisma.episode.findFirst({
      where: { id: parsed.data.episode_id, graph_id: parsed.data.graph_id },
    });
    if (!episode) {
      return NextResponse.json(
        {
          status: 404,
          error_code: 'NOT_FOUND',
          message: 'Episode not found in the specified learning path',
        },
        { status: 404 }
      );
    }

    // Upsert to handle idempotency (unique constraint on user_id + episode_id)
    const progress = await prisma.userProgress.upsert({
      where: { user_id_episode_id: { user_id: auth.userId, episode_id: parsed.data.episode_id } },
      create: {
        user_id: auth.userId,
        graph_id: parsed.data.graph_id,
        episode_id: parsed.data.episode_id,
      },
      update: {}, // No-op if already exists
    });

    return NextResponse.json({ data: progress }, { status: 201 });
  }
  ```

- [ ] **3.4 — Implement `app/api/progress/[id]/route.ts`**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';

  export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const { id } = await params;
    const progress = await prisma.userProgress.findUnique({ where: { id } });
    if (!progress) {
      return NextResponse.json(
        { status: 404, error_code: 'NOT_FOUND', message: 'Progress record not found' },
        { status: 404 }
      );
    }
    if (progress.user_id !== auth.userId) {
      return NextResponse.json(
        { status: 403, error_code: 'FORBIDDEN', message: 'Access denied' },
        { status: 403 }
      );
    }

    await prisma.userProgress.delete({ where: { id } });
    return NextResponse.json({ message: 'Progress record deleted' });
  }
  ```

- [ ] **3.5 — Run tests, confirm green**
  ```bash
  npx vitest run app/api/progress/__tests__/progress.test.ts
  ```

---

## Task 4: Activity Logging API — TDD

**Files:**

- `app/api/activity/route.ts` — POST
- `lib/validations/activity.ts` — Zod schema
- `app/api/activity/__tests__/activity.test.ts` — integration tests

### Steps

- [ ] **4.1 — Define Zod schema**
      Create `lib/validations/activity.ts`:

  ```typescript
  import { z } from 'zod';

  export const ACTIVITY_TYPES = [
    'listen',
    'bookmark',
    'complete_episode',
    'view_path',
    'search',
  ] as const;

  export const activityCreateSchema = z.object({
    activity_type: z.enum(ACTIVITY_TYPES),
    podcast_id: z.string().uuid().optional(),
    episode_id: z.string().uuid().optional(),
    graph_id: z.string().uuid().optional(),
    metadata: z.record(z.unknown()).default({}),
  });

  export type ActivityCreate = z.infer<typeof activityCreateSchema>;
  ```

- [ ] **4.2 — Write failing tests**
      Create `app/api/activity/__tests__/activity.test.ts`:

  ```typescript
  import { describe, it, expect } from 'vitest';

  describe('POST /api/activity', () => {
    it('logs a listen activity', async () => {
      // POST with activity_type: 'listen', podcast_id, metadata: { duration: 120 }
      // Assert: 201, activity record created
    });

    it('logs a bookmark activity', async () => {
      /* ... */
    });
    it('logs a search activity with query metadata', async () => {
      /* ... */
    });

    it('returns 400 for invalid activity_type', async () => {
      // POST with activity_type: 'invalid'
      // Assert: 400
    });

    it('returns 401 for unauthenticated request', async () => {
      /* ... */
    });

    it('does not block on database write (responds quickly)', async () => {
      // Measure response time — should be fast since we fire-and-forget
    });
  });
  ```

- [ ] **4.3 — Implement `app/api/activity/route.ts`**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';
  import { activityCreateSchema } from '@/lib/validations/activity';

  export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth)
      return NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );

    const body = await request.json();
    const parsed = activityCreateSchema.safeParse(body);
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

    // Fire-and-forget: don't await the database write
    // Use waitUntil if available (Vercel), otherwise just don't block
    const writePromise = prisma.userActivity
      .create({
        data: {
          user_id: auth.userId,
          ...parsed.data,
        },
      })
      .catch((err) => {
        console.error('Failed to log activity:', err);
      });

    // In environments that support it, use waitUntil
    // Otherwise, we accept that the write may not complete if the process exits
    // For reliability, a production system would use a message queue
    void writePromise;

    return NextResponse.json({ message: 'Activity logged' }, { status: 201 });
  }
  ```

- [ ] **4.4 — Run tests, confirm green**
  ```bash
  npx vitest run app/api/activity/__tests__/activity.test.ts
  ```

---

## Task 5: Listen Tracker Hook

**Files:**

- `hooks/use-listen-tracker.ts` — debounced activity logging during playback
- `hooks/__tests__/use-listen-tracker.test.ts` — hook tests

### Steps

- [ ] **5.1 — Write failing tests**
      Create `hooks/__tests__/use-listen-tracker.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
  import { renderHook, act } from '@testing-library/react';
  import { useListenTracker } from '../use-listen-tracker';
  import { usePlayerStore } from '@/stores/player-store';

  // Mock fetch
  global.fetch = vi.fn(() => Promise.resolve({ ok: true })) as any;

  beforeEach(() => {
    vi.useFakeTimers();
    usePlayerStore.setState(usePlayerStore.getInitialState());
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useListenTracker', () => {
    it('does not log activity when not playing', () => {
      renderHook(() => useListenTracker());
      vi.advanceTimersByTime(30000);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('logs a listen activity after 30 seconds of playback', () => {
      usePlayerStore.setState({
        isPlaying: true,
        currentPodcast: { id: 'pod-1', title: 'Test', audioShortUrl: '/test.mp3' },
      });
      renderHook(() => useListenTracker());
      vi.advanceTimersByTime(30000);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/activity',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('listen'),
        })
      );
    });

    it('includes podcast_id and listen duration in metadata', () => {
      usePlayerStore.setState({
        isPlaying: true,
        currentPodcast: { id: 'pod-1', title: 'Test', audioShortUrl: '/test.mp3' },
      });
      renderHook(() => useListenTracker());
      vi.advanceTimersByTime(30000);
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.podcast_id).toBe('pod-1');
      expect(callBody.metadata.duration).toBeGreaterThan(0);
    });

    it('debounces activity logging (does not fire every second)', () => {
      usePlayerStore.setState({
        isPlaying: true,
        currentPodcast: { id: 'pod-1', title: 'Test', audioShortUrl: '/test.mp3' },
      });
      renderHook(() => useListenTracker());
      vi.advanceTimersByTime(60000); // 60 seconds
      // Should fire at most 2 times (every 30s), not 60 times
      expect((global.fetch as any).mock.calls.length).toBeLessThanOrEqual(2);
    });

    it('stops logging when paused', () => {
      usePlayerStore.setState({
        isPlaying: true,
        currentPodcast: { id: 'pod-1', title: 'Test', audioShortUrl: '/test.mp3' },
      });
      renderHook(() => useListenTracker());
      vi.advanceTimersByTime(15000);
      usePlayerStore.setState({ isPlaying: false });
      vi.advanceTimersByTime(30000);
      expect(global.fetch).not.toHaveBeenCalled(); // Paused before 30s threshold
    });
  });
  ```

- [ ] **5.2 — Implement `hooks/use-listen-tracker.ts`**

  ```typescript
  'use client';
  import { useEffect, useRef } from 'react';
  import { usePlayerStore } from '@/stores/player-store';

  const LOG_INTERVAL_MS = 30_000; // Log every 30 seconds of playback

  export function useListenTracker() {
    const isPlaying = usePlayerStore((s) => s.isPlaying);
    const currentPodcast = usePlayerStore((s) => s.currentPodcast);
    const listenStartRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      if (isPlaying && currentPodcast) {
        listenStartRef.current = Date.now();

        intervalRef.current = setInterval(() => {
          const duration = listenStartRef.current
            ? (Date.now() - listenStartRef.current) / 1000
            : 0;
          listenStartRef.current = Date.now(); // Reset for next interval

          fetch('/api/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_type: 'listen',
              podcast_id: currentPodcast.id,
              metadata: {
                duration: Math.round(duration),
                audio_type: usePlayerStore.getState().audioType,
              },
            }),
          }).catch(() => {}); // Fire and forget
        }, LOG_INTERVAL_MS);
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Log final listen duration on pause/unmount
        if (listenStartRef.current && currentPodcast) {
          const duration = (Date.now() - listenStartRef.current) / 1000;
          if (duration > 5) {
            // Only log if listened more than 5 seconds
            fetch('/api/activity', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                activity_type: 'listen',
                podcast_id: currentPodcast.id,
                metadata: { duration: Math.round(duration) },
              }),
            }).catch(() => {});
          }
          listenStartRef.current = null;
        }
      };
    }, [isPlaying, currentPodcast]);
  }
  ```

- [ ] **5.3 — Add hook to podcast detail layout**
      In `components/audio-player/podcast-detail-layout.tsx`:

  ```typescript
  import { useListenTracker } from '@/hooks/use-listen-tracker';

  // Inside the component:
  useListenTracker();
  ```

- [ ] **5.4 — Run tests, confirm green**
  ```bash
  npx vitest run hooks/__tests__/use-listen-tracker.test.ts
  ```

---

## Task 6: User Profile Page

**Files:**

- `app/(public)/profile/page.tsx` — profile page (Server Component wrapper)
- `components/profile/profile-form.tsx` — display name edit form (Client Component)
- `components/profile/listening-stats.tsx` — stats summary
- `components/profile/__tests__/profile-form.test.tsx` — component tests

### Steps

- [ ] **6.1 — Install next-themes (if not already)**

  ```bash
  npm install next-themes
  ```

  Add `<ThemeProvider>` to root layout:

  ```typescript
  import { ThemeProvider } from 'next-themes';

  // Wrap children:
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    {children}
  </ThemeProvider>
  ```

- [ ] **6.2 — Write failing component tests for profile form**
      Create `components/profile/__tests__/profile-form.test.tsx`:

  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, waitFor } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { ProfileForm } from '../profile-form';

  describe('ProfileForm', () => {
    it('renders display name input with current value', () => {
      render(<ProfileForm user={{ id: '1', name: 'Rosh', email: 'rosh@example.com' }} />);
      expect(screen.getByLabelText(/display name/i)).toHaveValue('Rosh');
    });

    it('renders email as read-only', () => {
      render(<ProfileForm user={{ id: '1', name: 'Rosh', email: 'rosh@example.com' }} />);
      expect(screen.getByText('rosh@example.com')).toBeInTheDocument();
    });

    it('submits updated display name', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as any;
      render(<ProfileForm user={{ id: '1', name: 'Rosh', email: 'rosh@example.com' }} />);
      const input = screen.getByLabelText(/display name/i);
      await userEvent.clear(input);
      await userEvent.type(input, 'New Name');
      await userEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('shows validation error for empty name', async () => {
      render(<ProfileForm user={{ id: '1', name: 'Rosh', email: 'rosh@example.com' }} />);
      const input = screen.getByLabelText(/display name/i);
      await userEvent.clear(input);
      await userEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('renders theme toggle', () => {
      render(<ProfileForm user={{ id: '1', name: 'Rosh', email: 'rosh@example.com' }} />);
      expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
    });
  });
  ```

- [ ] **6.3 — Implement `components/profile/profile-form.tsx`**
  - `'use client'` component
  - React Hook Form with Zod validation (name required, max 100 chars)
  - Display name input, email (read-only text), theme toggle (using `useTheme` from next-themes)
  - Submit: PUT to a user profile endpoint (or PATCH)
  - Toast on success/failure

- [ ] **6.4 — Implement `components/profile/listening-stats.tsx`**
  - Server Component (or client with data fetching)
  - Stats: total listening time, podcasts listened, bookmarks created, learning paths completed
  - Fetches aggregated data from activity logs
  - Clean card layout with icons

- [ ] **6.5 — Create `app/(public)/profile/page.tsx`**

  ```typescript
  import { redirect } from 'next/navigation';
  import { getServerSession } from '@/lib/auth'; // From Stage 1
  import { prisma } from '@/lib/prisma';
  import { ProfileForm } from '@/components/profile/profile-form';
  import { ListeningStats } from '@/components/profile/listening-stats';

  export default async function ProfilePage() {
    const session = await getServerSession();
    if (!session) redirect('/login?redirectTo=/profile');

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) redirect('/login');

    // Aggregate stats
    const [listenCount, bookmarkCount, completedCount] = await Promise.all([
      prisma.userActivity.count({ where: { user_id: user.id, activity_type: 'listen' } }),
      prisma.bookmark.count({ where: { user_id: user.id } }),
      prisma.userProgress.count({ where: { user_id: user.id } }),
    ]);

    return (
      <div className="container mx-auto py-8 max-w-2xl space-y-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <ProfileForm user={{ id: user.id, name: user.name || '', email: user.email }} />
        <ListeningStats listenCount={listenCount} bookmarkCount={bookmarkCount} completedCount={completedCount} />
      </div>
    );
  }
  ```

- [ ] **6.6 — Run tests, confirm green**

---

## Task 7: Progress Dashboard Page

**Files:**

- `app/(public)/progress/page.tsx` — progress dashboard (Server Component wrapper)
- `components/progress/progress-tabs.tsx` — tabbed view (Client Component)
- `components/progress/in-progress-list.tsx` — learning paths in progress
- `components/progress/completed-list.tsx` — completed episodes
- `components/progress/bookmark-list.tsx` — all bookmarks across podcasts
- `components/progress/listening-history.tsx` — recent listening activity

### Steps

- [ ] **7.1 — Create `app/(public)/progress/page.tsx`**

  ```typescript
  import { redirect } from 'next/navigation';
  import { getServerSession } from '@/lib/auth';
  import { prisma } from '@/lib/prisma';
  import { ProgressTabs } from '@/components/progress/progress-tabs';

  export default async function ProgressPage() {
    const session = await getServerSession();
    if (!session) redirect('/login?redirectTo=/progress');

    // Fetch all data for the tabs
    const [progress, bookmarks, recentActivity] = await Promise.all([
      prisma.userProgress.findMany({
        where: { user_id: session.userId },
        include: {
          episode: { select: { id: true, title: true, sort_order: true } },
          graph: { select: { id: true, title: true, domain: true } },
        },
        orderBy: { completed_at: 'desc' },
      }),
      prisma.bookmark.findMany({
        where: { user_id: session.userId },
        include: { podcast: { select: { id: true, title: true, thumbnail_url: true } } },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.userActivity.findMany({
        where: { user_id: session.userId, activity_type: 'listen' },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
    ]);

    // Group progress by graph to determine in-progress vs completed paths
    const graphProgress = new Map<string, { graph: any; completed: number; total: number }>();
    for (const p of progress) {
      const key = p.graph_id;
      if (!graphProgress.has(key)) {
        // Count total episodes in the graph
        const totalEpisodes = await prisma.episode.count({ where: { graph_id: key } });
        graphProgress.set(key, { graph: p.graph, completed: 0, total: totalEpisodes });
      }
      graphProgress.get(key)!.completed++;
    }

    const inProgress = Array.from(graphProgress.values()).filter(g => g.completed < g.total);
    const completedPaths = Array.from(graphProgress.values()).filter(g => g.completed >= g.total);

    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Your Progress</h1>
        <ProgressTabs
          inProgress={inProgress}
          completedPaths={completedPaths}
          bookmarks={bookmarks}
          recentActivity={recentActivity}
        />
      </div>
    );
  }
  ```

- [ ] **7.2 — Implement `components/progress/progress-tabs.tsx`**

  ```typescript
  'use client';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import { InProgressList } from './in-progress-list';
  import { CompletedList } from './completed-list';
  import { BookmarkList } from './bookmark-list';
  import { ListeningHistory } from './listening-history';

  interface ProgressTabsProps {
    inProgress: any[];
    completedPaths: any[];
    bookmarks: any[];
    recentActivity: any[];
  }

  export function ProgressTabs({ inProgress, completedPaths, bookmarks, recentActivity }: ProgressTabsProps) {
    return (
      <Tabs defaultValue="in-progress">
        <TabsList>
          <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedPaths.length})</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks ({bookmarks.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="in-progress"><InProgressList paths={inProgress} /></TabsContent>
        <TabsContent value="completed"><CompletedList paths={completedPaths} /></TabsContent>
        <TabsContent value="bookmarks"><BookmarkList bookmarks={bookmarks} /></TabsContent>
        <TabsContent value="history"><ListeningHistory activities={recentActivity} /></TabsContent>
      </Tabs>
    );
  }
  ```

- [ ] **7.3 — Implement tab content components**
  - `in-progress-list.tsx`: Cards showing learning path title, domain, progress bar (completed/total), "Continue" link
  - `completed-list.tsx`: Cards with checkmark, title, domain, completed date
  - `bookmark-list.tsx`: List with podcast title, timestamp, note, click to navigate to podcast at that timestamp
  - `listening-history.tsx`: Timeline of recent listening activity with podcast names and durations

- [ ] **7.4 — Write component tests for each tab**

  ```typescript
  describe('InProgressList', () => {
    it('renders learning path cards with progress bars', () => {
      /* ... */
    });
    it('shows correct completion percentage', () => {
      /* ... */
    });
    it('links to learning path page', () => {
      /* ... */
    });
    it('shows empty state', () => {
      /* ... */
    });
  });

  describe('BookmarkList', () => {
    it('renders bookmarks with podcast title and timestamp', () => {
      /* ... */
    });
    it('links to podcast at the bookmarked timestamp', () => {
      /* ... */
    });
    it('shows empty state', () => {
      /* ... */
    });
  });
  ```

- [ ] **7.5 — Run all component tests**
  ```bash
  npx vitest run components/progress/
  ```

---

## Task 8: Integration + E2E Tests

**Files:**

- `app/api/bookmarks/__tests__/bookmarks.test.ts` — (from Task 1)
- `app/api/progress/__tests__/progress.test.ts` — (from Task 3)
- `app/api/activity/__tests__/activity.test.ts` — (from Task 4)
- `e2e/user-features.spec.ts` — Playwright E2E test

### Steps

- [ ] **8.1 — Verify all API integration tests pass**

  ```bash
  npx vitest run app/api/bookmarks/__tests__/ app/api/progress/__tests__/ app/api/activity/__tests__/
  ```

- [ ] **8.2 — Create `e2e/user-features.spec.ts`**

  ```typescript
  import { test, expect } from '@playwright/test';

  test.describe('User Features E2E', () => {
    test.beforeEach(async ({ page }) => {
      // Login as test user
      // Seed test data: podcasts, learning paths with episodes
    });

    test('create bookmark during playback and view in progress page', async ({ page }) => {
      // 1. Navigate to a podcast
      await page.goto('/podcast/test-podcast-id');

      // 2. Play audio
      await page.click('button[aria-label="Play"]');
      await page.waitForTimeout(2000);

      // 3. Switch to Bookmarks tab
      await page.click('text=Bookmarks');

      // 4. Add a bookmark
      await page.fill('input[placeholder*="note"]', 'Important section about risk');
      await page.click('button:has-text("Bookmark")');
      await expect(page.locator('text=Important section about risk')).toBeVisible();

      // 5. Navigate to progress page
      await page.goto('/progress');
      await page.click('text=Bookmarks');
      await expect(page.locator('text=Important section about risk')).toBeVisible();

      // 6. Click bookmark to navigate back to podcast
      await page.click('text=Important section about risk');
      await expect(page).toHaveURL(/\/podcast\/test-podcast-id/);
    });

    test('delete a bookmark', async ({ page }) => {
      // Pre-seed a bookmark
      await page.goto('/progress');
      await page.click('text=Bookmarks');

      // Delete the bookmark
      await page.click('button[aria-label*="delete"]');
      // Confirm deletion
      await expect(page.locator('text=Bookmark deleted')).toBeVisible();
    });

    test('mark episode as complete and see progress update', async ({ page }) => {
      // Navigate to learning path
      await page.goto('/learning-path/test-path-id');

      // Complete an episode (implementation depends on UI)
      // Navigate to progress page
      await page.goto('/progress');
      await expect(page.locator('text=In Progress')).toBeVisible();
      // Verify progress bar shows update
    });

    test('profile page displays and updates name', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('input[name="name"]')).toHaveValue(/\w+/);

      // Update name
      await page.fill('input[name="name"]', 'Updated Name');
      await page.click('button:has-text("Save")');
      await expect(page.locator('text=Profile updated')).toBeVisible();

      // Refresh and verify
      await page.reload();
      await expect(page.locator('input[name="name"]')).toHaveValue('Updated Name');
    });

    test('theme toggle switches between light and dark', async ({ page }) => {
      await page.goto('/profile');
      // Get current theme
      const htmlBefore = await page.locator('html').getAttribute('class');
      // Click theme toggle
      await page.click('button[aria-label*="theme"]');
      const htmlAfter = await page.locator('html').getAttribute('class');
      expect(htmlBefore).not.toBe(htmlAfter);
    });
  });
  ```

- [ ] **8.3 — Run E2E tests**
  ```bash
  npx playwright test e2e/user-features.spec.ts
  ```

---

## Task 9: Commit and Verify

### Steps

- [ ] **9.1 — Run lint and type check**

  ```bash
  npm run lint
  npx tsc --noEmit
  ```

- [ ] **9.2 — Run full test suite (unit + integration)**

  ```bash
  npx vitest run --reporter=verbose
  ```

- [ ] **9.3 — Check test coverage**

  ```bash
  npx vitest run --coverage
  ```

  Target: >80% line coverage for `lib/`, `app/api/`, `stores/`, `hooks/`.

- [ ] **9.4 — Run build**

  ```bash
  npm run build
  ```

- [ ] **9.5 — Commit**
  ```bash
  git add -A
  git commit -m "feat: add bookmarks, progress tracking, activity logging, profile, and dashboard (Stage 4)"
  ```

---

## Verification Checklist

After completing all tasks, confirm:

- [ ] Bookmark CRUD works end-to-end (create at timestamp, edit note, delete)
- [ ] Bookmarks are scoped to the authenticated user (cannot access others)
- [ ] Bookmark panel integrates with the audio player (seek on click)
- [ ] Progress tracking marks episodes as complete and is idempotent
- [ ] Progress API is user-scoped
- [ ] Activity logging is fire-and-forget (non-blocking responses)
- [ ] Listen tracker debounces and logs playback duration
- [ ] User profile page displays name, email, theme toggle, and listening stats
- [ ] Progress dashboard shows tabs: In Progress, Completed, Bookmarks, History
- [ ] Theme toggle works (light/dark/system)
- [ ] All unit, integration, and E2E tests pass
- [ ] Test coverage >80% for new code
- [ ] No TypeScript errors, no lint warnings
- [ ] Build succeeds without errors
