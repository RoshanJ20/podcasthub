# Stage 6: Analytics & Search — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build admin analytics dashboard, basic text search, AI-powered semantic search, and user role management.

**Architecture:** Prisma aggregation queries for analytics, Recharts for visualizations, pgvector + Azure OpenAI embeddings for semantic search. Server Components for data fetching, Client Components for charts.

**Tech Stack:** Recharts, Azure OpenAI (text-embedding-3-large), pgvector, Prisma $queryRaw, shadcn/ui.

**Prerequisites:** Stages 1-5 complete (auth, database, podcast CRUD, audio player, bookmarks, progress tracking, learning paths).

---

## Task 1: Analytics API Route — TDD

**Files:**
- `app/api/admin/analytics/route.ts`
- `__tests__/api/admin/analytics.test.ts`

### Steps

- [ ] **1.1 — Write integration tests for `GET /api/admin/analytics`**
  - Test: returns 401 for unauthenticated users
  - Test: returns 403 for non-admin users
  - Test: returns analytics object with all expected fields for admin
  - Test: supports `?from=2026-01-01&to=2026-03-15` date range filtering
  - Test: returns correct aggregation values
  ```ts
  // __tests__/api/admin/analytics.test.ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import { GET } from '@/app/api/admin/analytics/route';
  import { prisma } from '@/lib/prisma';
  import { createMockRequest } from '@/test-utils/request';

  describe('GET /api/admin/analytics', () => {
    beforeEach(async () => {
      // Seed test data: podcasts across domains, listen events, learning paths
      await seedAnalyticsData();
    });

    it('returns 401 for unauthenticated', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/admin/analytics' });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/admin/analytics',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('returns analytics summary for admin', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/admin/analytics',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const res = await GET(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toHaveProperty('totalPodcasts');
      expect(body).toHaveProperty('totalPaths');
      expect(body).toHaveProperty('listensByDomain');
      expect(body).toHaveProperty('monthlyTrends');
      expect(body).toHaveProperty('topTopics');
      expect(typeof body.totalPodcasts).toBe('number');
      expect(Array.isArray(body.listensByDomain)).toBe(true);
    });

    it('filters by date range', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/admin/analytics?from=2026-01-01&to=2026-01-31',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const res = await GET(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      // Monthly trends should only include January data
      expect(body.monthlyTrends.every((t: any) => t.month.startsWith('2026-01'))).toBe(true);
    });
  });
  ```

- [ ] **1.2 — Implement the analytics route**
  ```ts
  // app/api/admin/analytics/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';

  export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter = {
      ...(from ? { createdAt: { gte: new Date(from) } } : {}),
      ...(to ? { createdAt: { lte: new Date(to) } } : {}),
    };

    const [totalPodcasts, totalPaths, listensByDomain, monthlyTrends, topTopics] = await Promise.all([
      prisma.podcast.count({ where: dateFilter }),
      prisma.learningGraph.count({ where: dateFilter }),
      prisma.podcast.groupBy({
        by: ['domain'],
        _count: { id: true },
        where: dateFilter,
      }),
      // Monthly trends: group podcast creation by month
      prisma.$queryRaw`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*)::int as count
        FROM "Podcast"
        ${from ? prisma.$queryRaw`WHERE "createdAt" >= ${new Date(from)}` : prisma.$queryRaw``}
        ${to ? prisma.$queryRaw`AND "createdAt" <= ${new Date(to)}` : prisma.$queryRaw``}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `,
      // Top topics by tag frequency
      prisma.$queryRaw`
        SELECT unnest(tags) as topic, COUNT(*)::int as count
        FROM "Podcast"
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    return NextResponse.json({
      totalPodcasts,
      totalPaths,
      listensByDomain: listensByDomain.map((d) => ({ domain: d.domain, count: d._count.id })),
      monthlyTrends,
      topTopics,
    });
  }
  ```

- [ ] **1.3 — Run tests, verify green**
- [ ] **1.4 — Commit:** `feat(api): add admin analytics endpoint with date filtering`

---

## Task 2: Azure OpenAI Embeddings Client

**Files:**
- `lib/embeddings.ts`
- `__tests__/lib/embeddings.test.ts`

### Steps

- [ ] **2.1 — Write unit tests with mocked Azure OpenAI API**
  ```ts
  // __tests__/lib/embeddings.test.ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { generateEmbedding } from '@/lib/embeddings';

  // Mock global fetch
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  describe('generateEmbedding', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns embedding vector for valid text', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ embedding: mockEmbedding }] }),
      });

      const result = await generateEmbedding('hello world');
      expect(result).toHaveLength(1536);
      expect(result[0]).toBe(0.1);
    });

    it('calls Azure OpenAI endpoint with correct params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ embedding: Array(1536).fill(0) }] }),
      });

      await generateEmbedding('test input');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('openai.azure.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'api-key': expect.any(String),
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('test input'),
        })
      );
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' });
      await expect(generateEmbedding('test')).rejects.toThrow('Embedding API error: 429');
    });

    it('retries on transient failure (429/500)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ embedding: Array(1536).fill(0) }] }),
        });

      const result = await generateEmbedding('test', { maxRetries: 2 });
      expect(result).toHaveLength(1536);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws for empty input', async () => {
      await expect(generateEmbedding('')).rejects.toThrow('Input text cannot be empty');
    });
  });
  ```

- [ ] **2.2 — Implement `lib/embeddings.ts`**
  ```ts
  // lib/embeddings.ts
  const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
  const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
  const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? 'text-embedding-3-large';
  const API_VERSION = '2024-02-01';

  interface EmbeddingOptions {
    maxRetries?: number;
    retryDelayMs?: number;
  }

  export async function generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    if (!text.trim()) throw new Error('Input text cannot be empty');

    const { maxRetries = 3, retryDelayMs = 1000 } = options;
    const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/embeddings?api-version=${API_VERSION}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: text }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data[0].embedding;
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
          continue;
        }
      }

      throw new Error(`Embedding API error: ${response.status}`);
    }

    throw new Error('Embedding generation failed after retries');
  }
  ```

- [ ] **2.3 — Add environment variables to `.env.example`**
  ```
  AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
  AZURE_OPENAI_API_KEY=your-key
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
  ```

- [ ] **2.4 — Run tests, verify green**
- [ ] **2.5 — Commit:** `feat(lib): add Azure OpenAI embeddings client with retry logic`

---

## Task 3: Search API Routes — TDD

**Files:**
- `app/api/search/route.ts`
- `prisma/migrations/XXXXXXXX_add_pgvector/migration.sql`
- `lib/search.ts`
- `__tests__/api/search.test.ts`
- `__tests__/lib/search.test.ts`

### Steps

- [ ] **3.1 — Create pgvector Prisma migration**
  ```sql
  -- prisma/migrations/XXXXXXXX_add_pgvector/migration.sql

  -- Enable pgvector extension
  CREATE EXTENSION IF NOT EXISTS vector;

  -- Add embedding column to transcript segments
  ALTER TABLE "TranscriptSegment" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

  -- Create index for similarity search
  CREATE INDEX IF NOT EXISTS "transcript_embedding_idx"
    ON "TranscriptSegment"
    USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 100);

  -- Function to match transcript segments by embedding similarity
  CREATE OR REPLACE FUNCTION match_transcripts(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
  )
  RETURNS TABLE (
    id TEXT,
    "podcastId" TEXT,
    "podcastTitle" TEXT,
    content TEXT,
    "startTime" FLOAT,
    "endTime" FLOAT,
    similarity FLOAT
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      ts.id,
      ts."podcastId",
      p.title AS "podcastTitle",
      ts.content,
      ts."startTime",
      ts."endTime",
      1 - (ts.embedding <=> query_embedding) AS similarity
    FROM "TranscriptSegment" ts
    JOIN "Podcast" p ON p.id = ts."podcastId"
    WHERE 1 - (ts.embedding <=> query_embedding) > match_threshold
    ORDER BY ts.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;
  ```

- [ ] **3.2 — Write integration tests for basic text search**
  ```ts
  // __tests__/api/search.test.ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import { GET, POST } from '@/app/api/search/route';
  import { prisma } from '@/lib/prisma';
  import { createMockRequest } from '@/test-utils/request';

  describe('GET /api/search (basic text search)', () => {
    beforeEach(async () => {
      await prisma.podcast.deleteMany();
      await prisma.podcast.createMany({
        data: [
          { title: 'React Performance Tips', description: 'How to optimize React apps', tags: ['react', 'performance'] },
          { title: 'Node.js Best Practices', description: 'Server-side JavaScript patterns', tags: ['nodejs', 'backend'] },
          { title: 'CSS Grid Layout', description: 'Modern CSS layout techniques', tags: ['css', 'layout'] },
        ],
      });
    });

    it('searches by title', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/search?q=React' });
      const res = await GET(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.results).toHaveLength(1);
      expect(body.results[0].title).toBe('React Performance Tips');
    });

    it('searches by description', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/search?q=JavaScript' });
      const res = await GET(req);
      const body = await res.json();
      expect(body.results).toHaveLength(1);
      expect(body.results[0].title).toBe('Node.js Best Practices');
    });

    it('searches by tags', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/search?q=performance' });
      const res = await GET(req);
      const body = await res.json();
      expect(body.results.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for no matches', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/search?q=Python' });
      const res = await GET(req);
      const body = await res.json();
      expect(body.results).toHaveLength(0);
    });

    it('returns 400 for missing query', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/search' });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });
  ```

- [ ] **3.3 — Write integration tests for semantic search**
  ```ts
  describe('POST /api/search (semantic search)', () => {
    it('returns transcript segments with timestamps and similarity scores', async () => {
      // This test requires mocking generateEmbedding and having seeded transcript data with embeddings
      const req = createMockRequest({
        method: 'POST',
        url: '/api/search',
        body: { query: 'how to optimize database queries', mode: 'semantic' },
      });
      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.results).toBeDefined();
      expect(body.results[0]).toHaveProperty('podcastTitle');
      expect(body.results[0]).toHaveProperty('content');
      expect(body.results[0]).toHaveProperty('startTime');
      expect(body.results[0]).toHaveProperty('similarity');
    });

    it('returns 400 for missing query', async () => {
      const req = createMockRequest({ method: 'POST', url: '/api/search', body: {} });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
  ```

- [ ] **3.4 — Implement `app/api/search/route.ts`**
  ```ts
  // app/api/search/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { generateEmbedding } from '@/lib/embeddings';
  import { Prisma } from '@prisma/client';

  // Basic text search
  export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q) return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });

    const results = await prisma.podcast.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { has: q.toLowerCase() } },
        ],
      },
      select: { id: true, title: true, description: true, domain: true, tags: true, thumbnailUrl: true },
      take: 20,
    });

    return NextResponse.json({ results, query: q });
  }

  // Semantic search
  export async function POST(req: NextRequest) {
    const body = await req.json();
    const { query } = body;
    if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });

    const embedding = await generateEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    const results = await prisma.$queryRaw<Array<{
      id: string;
      podcastId: string;
      podcastTitle: string;
      content: string;
      startTime: number;
      endTime: number;
      similarity: number;
    }>>`
      SELECT * FROM match_transcripts(${embeddingStr}::vector, 0.7, 10)
    `;

    return NextResponse.json({ results, query });
  }
  ```

- [ ] **3.5 — Run tests, verify green**
- [ ] **3.6 — Commit:** `feat(api): add text and semantic search with pgvector`

---

## Task 4: Analytics Dashboard Page

**Files:**
- `app/(admin)/admin/analytics/page.tsx`
- `components/admin/analytics-charts.tsx`
- `components/admin/date-range-picker.tsx`
- `__tests__/components/admin/analytics-charts.test.tsx`

### Steps

- [ ] **4.1 — Install Recharts**
  ```bash
  npm install recharts
  ```

- [ ] **4.2 — Write component tests for `analytics-charts.tsx`**
  - Test: renders domain donut chart with correct segments
  - Test: renders monthly trends bar chart
  - Test: renders top topics horizontal bar chart
  - Test: shows "No data" message when analytics are empty
  - Test: date range picker emits `onDateChange` callback

- [ ] **4.3 — Implement `date-range-picker.tsx`**
  ```tsx
  // components/admin/date-range-picker.tsx
  'use client';

  import { useState } from 'react';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';

  interface DateRangePickerProps {
    onDateChange: (from: string, to: string) => void;
  }

  export function DateRangePicker({ onDateChange }: DateRangePickerProps) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    return (
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="date-from">From</Label>
          <Input id="date-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="date-to">To</Label>
          <Input id="date-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => onDateChange(from, to)}>Apply</Button>
      </div>
    );
  }
  ```

- [ ] **4.4 — Implement `analytics-charts.tsx`**
  ```tsx
  // components/admin/analytics-charts.tsx
  'use client';

  import { useState, useEffect } from 'react';
  import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    AreaChart, Area,
    ResponsiveContainer,
  } from 'recharts';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { DateRangePicker } from './date-range-picker';

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  interface AnalyticsData {
    totalPodcasts: number;
    totalPaths: number;
    listensByDomain: { domain: string; count: number }[];
    monthlyTrends: { month: string; count: number }[];
    topTopics: { topic: string; count: number }[];
  }

  export function AnalyticsCharts() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAnalytics = async (from?: string, to?: string) => {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/admin/analytics?${params}`);
      const json = await res.json();
      setData(json);
      setIsLoading(false);
    };

    useEffect(() => { fetchAnalytics(); }, []);

    if (isLoading) return <div>Loading analytics...</div>;
    if (!data) return <div>No data available</div>;

    return (
      <div className="space-y-6">
        <DateRangePicker onDateChange={fetchAnalytics} />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Total Podcasts</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{data.totalPodcasts}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Total Learning Paths</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{data.totalPaths}</p></CardContent>
          </Card>
        </div>

        {/* Domain Donut Chart */}
        <Card>
          <CardHeader><CardTitle>Podcasts by Domain</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.listensByDomain} dataKey="count" nameKey="domain" innerRadius={60} outerRadius={100} label>
                  {data.listensByDomain.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader><CardTitle>Monthly Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f680" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Topics */}
        <Card>
          <CardHeader><CardTitle>Top Topics</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topTopics} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="topic" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }
  ```

- [ ] **4.5 — Implement admin analytics page**
  ```tsx
  // app/(admin)/admin/analytics/page.tsx
  import { AnalyticsCharts } from '@/components/admin/analytics-charts';

  export default function AdminAnalyticsPage() {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
        <AnalyticsCharts />
      </div>
    );
  }
  ```

- [ ] **4.6 — Run tests, verify green**
- [ ] **4.7 — Commit:** `feat(admin): add analytics dashboard with Recharts visualizations`

---

## Task 5: Search Page

**Files:**
- `app/(public)/search/page.tsx`
- `components/search/search-results.tsx`
- `components/search/search-input.tsx`
- `__tests__/components/search/search-results.test.tsx`

### Steps

- [ ] **5.1 — Write component tests for search results**
  - Test: renders podcast results with title, description snippet, domain badge
  - Test: renders semantic results with transcript content, timestamp, similarity score
  - Test: clicking a basic result navigates to `/podcast/[id]`
  - Test: clicking a semantic result navigates to `/podcast/[id]?t=[startTime]`
  - Test: shows "No results found" for empty results array
  - Test: shows loading spinner during search

- [ ] **5.2 — Implement `search-input.tsx`**
  ```tsx
  // components/search/search-input.tsx
  'use client';

  import { useState } from 'react';
  import { Input } from '@/components/ui/input';
  import { Button } from '@/components/ui/button';
  import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
  import { Search, Sparkles } from 'lucide-react';

  interface SearchInputProps {
    onSearch: (query: string, mode: 'basic' | 'semantic') => void;
    isLoading?: boolean;
  }

  export function SearchInput({ onSearch, isLoading }: SearchInputProps) {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<'basic' | 'semantic'>('basic');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) onSearch(query.trim(), mode);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search podcasts..."
            className="flex-1"
            aria-label="Search query"
          />
          <Button type="submit" disabled={isLoading || !query.trim()}>
            <Search className="h-4 w-4 mr-1" /> Search
          </Button>
        </div>
        <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as 'basic' | 'semantic')}>
          <ToggleGroupItem value="basic" aria-label="Basic search">
            <Search className="h-4 w-4 mr-1" /> Basic
          </ToggleGroupItem>
          <ToggleGroupItem value="semantic" aria-label="Smart search">
            <Sparkles className="h-4 w-4 mr-1" /> Smart
          </ToggleGroupItem>
        </ToggleGroup>
      </form>
    );
  }
  ```

- [ ] **5.3 — Implement `search-results.tsx`**
  ```tsx
  // components/search/search-results.tsx
  'use client';

  import Link from 'next/link';
  import { Badge } from '@/components/ui/badge';
  import { Card, CardContent } from '@/components/ui/card';

  interface BasicResult {
    id: string;
    title: string;
    description: string | null;
    domain: string | null;
    tags: string[];
  }

  interface SemanticResult {
    id: string;
    podcastId: string;
    podcastTitle: string;
    content: string;
    startTime: number;
    endTime: number;
    similarity: number;
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  export function BasicResults({ results }: { results: BasicResult[] }) {
    if (results.length === 0) return <p className="text-muted-foreground text-center py-8">No results found</p>;

    return (
      <div className="space-y-3">
        {results.map((r) => (
          <Link key={r.id} href={`/podcast/${r.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{r.title}</h3>
                  {r.domain && <Badge variant="secondary">{r.domain}</Badge>}
                </div>
                {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  export function SemanticResults({ results }: { results: SemanticResult[] }) {
    if (results.length === 0) return <p className="text-muted-foreground text-center py-8">No results found</p>;

    return (
      <div className="space-y-3">
        {results.map((r) => (
          <Link key={r.id} href={`/podcast/${r.podcastId}?t=${Math.floor(r.startTime)}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{r.podcastTitle}</h3>
                  <Badge variant="outline">{Math.round(r.similarity * 100)}% match</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">"{r.content}"</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(r.startTime)} - {formatTime(r.endTime)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }
  ```

- [ ] **5.4 — Implement search page**
  ```tsx
  // app/(public)/search/page.tsx
  'use client';

  import { useState } from 'react';
  import { SearchInput } from '@/components/search/search-input';
  import { BasicResults, SemanticResults } from '@/components/search/search-results';

  export default function SearchPage() {
    const [results, setResults] = useState<any[]>([]);
    const [searchMode, setSearchMode] = useState<'basic' | 'semantic'>('basic');
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (query: string, mode: 'basic' | 'semantic') => {
      setIsLoading(true);
      setSearchMode(mode);

      if (mode === 'basic') {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results);
      } else {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        setResults(data.results);
      }

      setIsLoading(false);
    };

    return (
      <div className="container py-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Search</h1>
        <SearchInput onSearch={handleSearch} isLoading={isLoading} />
        <div className="mt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Searching...</div>
          ) : searchMode === 'basic' ? (
            <BasicResults results={results} />
          ) : (
            <SemanticResults results={results} />
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **5.5 — Run tests, verify green**
- [ ] **5.6 — Commit:** `feat(ui): add search page with basic and semantic modes`

---

## Task 6: User Role Management

**Files:**
- `app/api/users/route.ts`
- `app/api/users/[id]/role/route.ts`
- `app/(admin)/admin/users/page.tsx`
- `components/admin/users-table.tsx`
- `__tests__/api/users.test.ts`
- `__tests__/api/users-role.test.ts`

### Steps

- [ ] **6.1 — Write integration tests for `GET /api/users`**
  - Test: returns 401 for unauthenticated users
  - Test: returns 403 for admin (not superadmin) users
  - Test: returns paginated user list for superadmin with fields: id, name, email, role, createdAt
  - Test: supports `?search=` filter on name/email
  ```ts
  // __tests__/api/users.test.ts
  describe('GET /api/users', () => {
    it('returns 403 for regular admin', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/users',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('returns user list for superadmin', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/users',
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      const res = await GET(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data).toBeDefined();
      expect(body.data[0]).toHaveProperty('role');
      // Should NOT include password hash
      expect(body.data[0]).not.toHaveProperty('passwordHash');
    });
  });
  ```

- [ ] **6.2 — Write integration tests for `PUT /api/users/[id]/role`**
  - Test: superadmin can change user role to 'admin'
  - Test: superadmin can change admin role to 'user'
  - Test: returns 400 for invalid role value
  - Test: returns 403 for non-superadmin
  - Test: returns 404 for non-existent user ID
  - Test: cannot change own role (prevents lockout)
  ```ts
  describe('PUT /api/users/[id]/role', () => {
    it('updates user role', async () => {
      const req = createMockRequest({
        method: 'PUT',
        url: `/api/users/${regularUserId}/role`,
        headers: { Authorization: `Bearer ${superadminToken}` },
        body: { role: 'admin' },
      });
      const res = await PUT(req, { params: Promise.resolve({ id: regularUserId }) });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.role).toBe('admin');
    });

    it('prevents changing own role', async () => {
      const req = createMockRequest({
        method: 'PUT',
        url: `/api/users/${superadminId}/role`,
        headers: { Authorization: `Bearer ${superadminToken}` },
        body: { role: 'user' },
      });
      const res = await PUT(req, { params: Promise.resolve({ id: superadminId }) });
      expect(res.status).toBe(400);
    });
  });
  ```

- [ ] **6.3 — Implement `app/api/users/route.ts`**
  ```ts
  // app/api/users/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';

  export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const search = searchParams.get('search');

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
      : {};

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  }
  ```

- [ ] **6.4 — Implement `app/api/users/[id]/role/route.ts`**
  ```ts
  // app/api/users/[id]/role/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';

  const VALID_ROLES = ['user', 'admin', 'superadmin'];

  export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (user.id === id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const { role } = await req.json();
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, name: true, email: true, role: true },
      });
      return NextResponse.json(updated);
    } catch {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  }
  ```

- [ ] **6.5 — Implement admin users page and table**
  - `app/(admin)/admin/users/page.tsx` — Server Component that renders heading + client table
  - `components/admin/users-table.tsx` — Client Component with DataTable, search input, role dropdown per row, confirmation on role change
  ```tsx
  // components/admin/users-table.tsx (key parts)
  'use client';

  import { useState, useEffect } from 'react';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Input } from '@/components/ui/input';
  import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

  // Fetches users, renders table with role dropdown per row
  // Role change triggers AlertDialog confirmation -> PUT /api/users/[id]/role
  ```

- [ ] **6.6 — Run tests, verify green**
- [ ] **6.7 — Commit:** `feat(admin): add superadmin user role management`

---

## Task 7: Integration + E2E Tests

**Files:**
- `__tests__/integration/analytics-search.test.ts`
- `e2e/analytics-search.spec.ts`

### Steps

- [ ] **7.1 — Write API integration tests**
  - Test analytics: seed data -> fetch analytics -> verify aggregation accuracy
  - Test basic search: seed podcasts with known titles/descriptions -> search -> verify correct matches
  - Test semantic search: seed transcript segments with embeddings -> search -> verify similarity ranking
  - Test user management: superadmin updates role -> verify user role changed -> verify non-superadmin blocked

- [ ] **7.2 — Write E2E test for search flow**
  ```ts
  // e2e/analytics-search.spec.ts
  test('user searches and navigates to result', async ({ page }) => {
    // 1. Navigate to /search
    // 2. Type "React" in search input
    // 3. Click Search button (basic mode)
    // 4. Verify results contain "React Performance Tips"
    // 5. Click the result
    // 6. Verify navigation to /podcast/[id]
  });

  test('user performs semantic search', async ({ page }) => {
    // 1. Navigate to /search
    // 2. Toggle to "Smart" mode
    // 3. Type "how to make my app faster"
    // 4. Click Search
    // 5. Verify results show transcript snippets with timestamps
    // 6. Click a result
    // 7. Verify navigation to /podcast/[id]?t=[timestamp]
    // 8. Verify audio player seeks to correct position
  });

  test('admin views analytics dashboard', async ({ page }) => {
    // 1. Login as admin
    // 2. Navigate to /admin/analytics
    // 3. Verify summary cards show numbers
    // 4. Verify charts are rendered (check SVG elements)
    // 5. Select date range -> verify data updates
  });
  ```

- [ ] **7.3 — Run full test suite, verify green**
- [ ] **7.4 — Commit:** `test: add integration and E2E tests for analytics and search`
