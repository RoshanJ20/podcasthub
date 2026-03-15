# Stage 5: Learning Paths — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build learning path management (admin) and viewer (public) with graph and linear modes.

**Architecture:** @xyflow/react for graph editor, Dagre for auto-layout, @dnd-kit for episode ordering, Zustand for editor state. Admin creates/edits paths; public views published paths.

**Tech Stack:** @xyflow/react, dagre, @dnd-kit, Zustand, shadcn/ui, Prisma.

**Prerequisites:** Stages 1-4 complete (auth, database, podcast CRUD, audio player, bookmarks, progress tracking).

---

## Task 1: Learning Graph API Routes — TDD

**Files:**
- `app/api/learning-graphs/route.ts`
- `app/api/learning-graphs/[id]/route.ts`
- `app/api/learning-graphs/[id]/data/route.ts`
- `__tests__/api/learning-graphs.test.ts`
- `__tests__/api/learning-graphs-id.test.ts`
- `__tests__/api/learning-graphs-data.test.ts`

### Steps

- [ ] **1.1 — Write integration tests for `GET /api/learning-graphs`**
  - Test: returns paginated list of published paths for unauthenticated users
  - Test: returns all paths (published + unpublished) for admin users
  - Test: supports `?page=1&limit=10` query params
  - Test: supports `?domain=engineering` filter
  - Test: returns 200 with `{ data: LearningGraph[], total: number, page: number, limit: number }`
  ```ts
  // __tests__/api/learning-graphs.test.ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import { GET } from '@/app/api/learning-graphs/route';
  import { prisma } from '@/lib/prisma';
  import { createMockRequest } from '@/test-utils/request';

  describe('GET /api/learning-graphs', () => {
    beforeEach(async () => {
      await prisma.learningGraph.deleteMany();
      await prisma.learningGraph.createMany({
        data: [
          { title: 'Published Path', domain: 'engineering', isPublished: true, pathType: 'graph', createdById: adminId },
          { title: 'Draft Path', domain: 'design', isPublished: false, pathType: 'linear', createdById: adminId },
        ],
      });
    });

    it('returns only published paths for public users', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/learning-graphs' });
      const res = await GET(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Published Path');
    });

    it('returns all paths for admin users', async () => {
      const req = createMockRequest({ method: 'GET', url: '/api/learning-graphs', headers: { Authorization: `Bearer ${adminToken}` } });
      const res = await GET(req);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
    });
  });
  ```

- [ ] **1.2 — Write integration tests for `POST /api/learning-graphs`**
  - Test: admin can create a learning graph with `{ title, description, domain, pathType }` — returns 201
  - Test: returns 400 for missing required fields (title, pathType)
  - Test: returns 401 for unauthenticated users
  - Test: returns 403 for non-admin users
  ```ts
  describe('POST /api/learning-graphs', () => {
    it('creates a learning graph for admin', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/api/learning-graphs',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { title: 'New Path', description: 'A learning path', domain: 'engineering', pathType: 'graph' },
      });
      const res = await POST(req);
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.title).toBe('New Path');
    });

    it('returns 401 for unauthenticated', async () => {
      const req = createMockRequest({ method: 'POST', url: '/api/learning-graphs', body: { title: 'X', pathType: 'graph' } });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/api/learning-graphs',
        headers: { Authorization: `Bearer ${userToken}` },
        body: { title: 'X', pathType: 'graph' },
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });
  ```

- [ ] **1.3 — Implement `app/api/learning-graphs/route.ts`**
  ```ts
  // app/api/learning-graphs/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth, requireAdmin } from '@/lib/auth';

  export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '10');
    const domain = searchParams.get('domain');
    const user = await verifyAuth(req).catch(() => null);
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const where = {
      ...(isAdmin ? {} : { isPublished: true }),
      ...(domain ? { domain } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.learningGraph.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.learningGraph.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  }

  export async function POST(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, domain, pathType } = body;
    if (!title || !pathType) {
      return NextResponse.json({ error: 'title and pathType are required' }, { status: 400 });
    }

    const graph = await prisma.learningGraph.create({
      data: { title, description, domain, pathType, createdById: user.id },
    });

    return NextResponse.json(graph, { status: 201 });
  }
  ```

- [ ] **1.4 — Write integration tests for `GET/PUT/DELETE /api/learning-graphs/[id]`**
  - Test: GET returns graph with nested episodes and edges
  - Test: GET returns 404 for non-existent ID
  - Test: GET returns 404 for unpublished graph when user is not admin
  - Test: PUT updates title/description/domain/pathType/isPublished — admin only
  - Test: PUT returns 400 for invalid pathType
  - Test: DELETE removes graph and cascades to episodes/edges — admin only
  - Test: DELETE returns 404 for non-existent ID

- [ ] **1.5 — Implement `app/api/learning-graphs/[id]/route.ts`**
  ```ts
  // app/api/learning-graphs/[id]/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';

  export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await verifyAuth(req).catch(() => null);
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const graph = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: true, edges: true },
    });

    if (!graph) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!graph.isPublished && !isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(graph);
  }

  export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, domain, pathType, isPublished } = body;

    if (pathType && !['graph', 'linear'].includes(pathType)) {
      return NextResponse.json({ error: 'pathType must be graph or linear' }, { status: 400 });
    }

    const graph = await prisma.learningGraph.update({
      where: { id },
      data: { title, description, domain, pathType, isPublished },
    });

    return NextResponse.json(graph);
  }

  export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      await prisma.learningGraph.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }
  ```

- [ ] **1.6 — Write integration tests for `PUT /api/learning-graphs/[id]/data`**
  - Test: bulk saves episodes and edges in a transaction — returns 200
  - Test: replaces existing episodes/edges (delete all, then create)
  - Test: validates edge source/target reference valid episode IDs within the payload
  - Test: returns 400 if edge references non-existent episode
  - Test: admin only — 401/403 for unauthorized

- [ ] **1.7 — Implement `app/api/learning-graphs/[id]/data/route.ts`**
  ```ts
  // app/api/learning-graphs/[id]/data/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { prisma } from '@/lib/prisma';
  import { verifyAuth } from '@/lib/auth';

  export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await verifyAuth(req);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { episodes, edges } = await req.json();

    // Validate edge references
    const episodeIds = new Set(episodes.map((e: any) => e.tempId ?? e.id));
    for (const edge of edges ?? []) {
      if (!episodeIds.has(edge.source) || !episodeIds.has(edge.target)) {
        return NextResponse.json({ error: 'Edge references non-existent episode' }, { status: 400 });
      }
    }

    // Transaction: delete old data, insert new
    const result = await prisma.$transaction(async (tx) => {
      await tx.graphEdge.deleteMany({ where: { graphId: id } });
      await tx.graphEpisode.deleteMany({ where: { graphId: id } });

      const createdEpisodes = await Promise.all(
        episodes.map((ep: any) =>
          tx.graphEpisode.create({
            data: {
              graphId: id,
              podcastId: ep.podcastId,
              title: ep.title,
              nodeType: ep.nodeType ?? 'default',
              positionX: ep.positionX ?? 0,
              positionY: ep.positionY ?? 0,
              orderIndex: ep.orderIndex ?? 0,
            },
          })
        )
      );

      // Map tempIds to real IDs for edges
      const idMap = new Map<string, string>();
      episodes.forEach((ep: any, i: number) => {
        idMap.set(ep.tempId ?? ep.id, createdEpisodes[i].id);
      });

      if (edges?.length) {
        await tx.graphEdge.createMany({
          data: edges.map((e: any) => ({
            graphId: id,
            sourceId: idMap.get(e.source)!,
            targetId: idMap.get(e.target)!,
          })),
        });
      }

      return { episodes: createdEpisodes };
    });

    return NextResponse.json(result);
  }
  ```

- [ ] **1.8 — Run all tests, verify green**
- [ ] **1.9 — Commit:** `feat(api): add learning graph CRUD and bulk data endpoints with tests`

---

## Task 2: Graph Editor Store (Zustand)

**Files:**
- `stores/graph-editor-store.ts`
- `__tests__/stores/graph-editor-store.test.ts`

### Steps

- [ ] **2.1 — Write unit tests for graph editor store**
  ```ts
  // __tests__/stores/graph-editor-store.test.ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import { useGraphEditorStore } from '@/stores/graph-editor-store';

  describe('GraphEditorStore', () => {
    beforeEach(() => {
      useGraphEditorStore.getState().reset();
    });

    it('initializes with empty state', () => {
      const state = useGraphEditorStore.getState();
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.selectedNodeId).toBeNull();
      expect(state.isDirty).toBe(false);
    });

    it('adds a node and marks dirty', () => {
      const { addNode } = useGraphEditorStore.getState();
      addNode({ id: 'temp-1', title: 'Episode 1', nodeType: 'start', podcastId: 'p1', positionX: 0, positionY: 0 });
      const state = useGraphEditorStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].title).toBe('Episode 1');
      expect(state.isDirty).toBe(true);
    });

    it('removes a node and its connected edges', () => {
      const store = useGraphEditorStore.getState();
      store.addNode({ id: 'n1', title: 'A', nodeType: 'default', podcastId: 'p1', positionX: 0, positionY: 0 });
      store.addNode({ id: 'n2', title: 'B', nodeType: 'default', podcastId: 'p2', positionX: 100, positionY: 0 });
      store.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
      store.removeNode('n1');
      const state = useGraphEditorStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.edges).toHaveLength(0); // edge removed with node
    });

    it('updates a node', () => {
      const store = useGraphEditorStore.getState();
      store.addNode({ id: 'n1', title: 'Old', nodeType: 'default', podcastId: 'p1', positionX: 0, positionY: 0 });
      store.updateNode('n1', { title: 'New', nodeType: 'milestone' });
      expect(useGraphEditorStore.getState().nodes[0].title).toBe('New');
      expect(useGraphEditorStore.getState().nodes[0].nodeType).toBe('milestone');
    });

    it('adds and removes edges', () => {
      const store = useGraphEditorStore.getState();
      store.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
      expect(useGraphEditorStore.getState().edges).toHaveLength(1);
      store.removeEdge('e1');
      expect(useGraphEditorStore.getState().edges).toHaveLength(0);
    });

    it('applies dagre layout via setLayout', () => {
      const store = useGraphEditorStore.getState();
      store.addNode({ id: 'n1', title: 'A', nodeType: 'start', podcastId: 'p1', positionX: 0, positionY: 0 });
      store.addNode({ id: 'n2', title: 'B', nodeType: 'end', podcastId: 'p2', positionX: 0, positionY: 0 });
      store.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
      store.setLayout(); // runs dagre
      const state = useGraphEditorStore.getState();
      // After layout, positions should differ from (0,0)
      const positions = state.nodes.map((n) => ({ x: n.positionX, y: n.positionY }));
      expect(positions[0]).not.toEqual(positions[1]);
    });

    it('resets isDirty after save', async () => {
      const store = useGraphEditorStore.getState();
      store.addNode({ id: 'n1', title: 'A', nodeType: 'default', podcastId: 'p1', positionX: 0, positionY: 0 });
      expect(useGraphEditorStore.getState().isDirty).toBe(true);
      // Mock save — store.save() calls API and clears isDirty
      await store.save('graph-id-123');
      expect(useGraphEditorStore.getState().isDirty).toBe(false);
    });
  });
  ```

- [ ] **2.2 — Implement the store**
  ```ts
  // stores/graph-editor-store.ts
  import { create } from 'zustand';
  import dagre from 'dagre';

  export interface GraphNode {
    id: string;
    title: string;
    nodeType: 'start' | 'default' | 'milestone' | 'end';
    podcastId: string;
    positionX: number;
    positionY: number;
  }

  export interface GraphEdge {
    id: string;
    source: string;
    target: string;
  }

  interface GraphEditorState {
    nodes: GraphNode[];
    edges: GraphEdge[];
    selectedNodeId: string | null;
    isDirty: boolean;

    addNode: (node: GraphNode) => void;
    removeNode: (id: string) => void;
    updateNode: (id: string, updates: Partial<GraphNode>) => void;
    addEdge: (edge: GraphEdge) => void;
    removeEdge: (id: string) => void;
    setSelectedNode: (id: string | null) => void;
    setLayout: () => void;
    save: (graphId: string) => Promise<void>;
    loadFromApi: (nodes: GraphNode[], edges: GraphEdge[]) => void;
    reset: () => void;
  }

  export const useGraphEditorStore = create<GraphEditorState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isDirty: false,

    addNode: (node) => set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),

    removeNode: (id) =>
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        isDirty: true,
      })),

    updateNode: (id, updates) =>
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        isDirty: true,
      })),

    addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge], isDirty: true })),

    removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id), isDirty: true })),

    setSelectedNode: (id) => set({ selectedNodeId: id }),

    setLayout: () => {
      const { nodes, edges } = get();
      const g = new dagre.graphlib.Graph();
      g.setDefaultEdgeLabel(() => ({}));
      g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

      nodes.forEach((node) => g.setNode(node.id, { width: 200, height: 80 }));
      edges.forEach((edge) => g.setEdge(edge.source, edge.target));

      dagre.layout(g);

      set({
        nodes: nodes.map((node) => {
          const pos = g.node(node.id);
          return { ...node, positionX: pos.x, positionY: pos.y };
        }),
        isDirty: true,
      });
    },

    save: async (graphId) => {
      const { nodes, edges } = get();
      await fetch(`/api/learning-graphs/${graphId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodes: nodes.map((n, i) => ({ ...n, tempId: n.id, orderIndex: i })),
          edges: edges.map((e) => ({ source: e.source, target: e.target })),
        }),
      });
      set({ isDirty: false });
    },

    loadFromApi: (nodes, edges) => set({ nodes, edges, isDirty: false }),

    reset: () => set({ nodes: [], edges: [], selectedNodeId: null, isDirty: false }),
  }));
  ```

- [ ] **2.3 — Run tests, verify green**
- [ ] **2.4 — Commit:** `feat(store): add Zustand graph editor store with dagre layout`

---

## Task 3: Visual Graph Editor

**Files:**
- `components/learning-path/graph-editor.tsx`
- `components/learning-path/episode-node.tsx`
- `components/learning-path/episode-sidebar.tsx`
- `__tests__/components/learning-path/graph-editor.test.tsx`
- `__tests__/components/learning-path/episode-node.test.tsx`

### Steps

- [ ] **3.1 — Install dependencies**
  ```bash
  npm install @xyflow/react dagre
  npm install -D @types/dagre
  ```

- [ ] **3.2 — Write component tests for `episode-node.tsx`**
  - Test: renders episode title
  - Test: renders node type badge (start=green, milestone=star, end=red, default=blue)
  - Test: renders play button that fires onClick callback
  - Test: shows source and target connection handles

- [ ] **3.3 — Implement `episode-node.tsx`**
  ```tsx
  // components/learning-path/episode-node.tsx
  'use client';

  import { Handle, Position, type NodeProps } from '@xyflow/react';
  import { Badge } from '@/components/ui/badge';
  import { Play } from 'lucide-react';
  import { Button } from '@/components/ui/button';

  const nodeColors: Record<string, string> = {
    start: 'bg-green-500',
    default: 'bg-blue-500',
    milestone: 'bg-yellow-500',
    end: 'bg-red-500',
  };

  interface EpisodeNodeData {
    title: string;
    nodeType: 'start' | 'default' | 'milestone' | 'end';
    onPlay?: () => void;
  }

  export function EpisodeNode({ data }: NodeProps<EpisodeNodeData>) {
    return (
      <div className="rounded-lg border bg-card p-3 shadow-sm min-w-[180px]">
        <Handle type="target" position={Position.Top} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{data.title}</span>
          <Badge className={nodeColors[data.nodeType]}>{data.nodeType}</Badge>
        </div>
        {data.onPlay && (
          <Button size="icon" variant="ghost" className="mt-1" onClick={data.onPlay} aria-label={`Play ${data.title}`}>
            <Play className="h-4 w-4" />
          </Button>
        )}
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }
  ```

- [ ] **3.4 — Write component tests for `graph-editor.tsx`**
  - Test: renders ReactFlow canvas
  - Test: displays nodes from store
  - Test: calls addEdge when user connects two nodes
  - Test: calls setLayout when "Auto Layout" button clicked
  - Test: shows "Unsaved changes" indicator when isDirty is true

- [ ] **3.5 — Implement `graph-editor.tsx`**
  ```tsx
  // components/learning-path/graph-editor.tsx
  'use client';

  import { useCallback, useMemo } from 'react';
  import { ReactFlow, Background, Controls, MiniMap, addEdge as rfAddEdge, type Connection, type Edge } from '@xyflow/react';
  import '@xyflow/react/dist/style.css';
  import { useGraphEditorStore } from '@/stores/graph-editor-store';
  import { EpisodeNode } from './episode-node';
  import { EpisodeSidebar } from './episode-sidebar';
  import { Button } from '@/components/ui/button';
  import { LayoutGrid, Save } from 'lucide-react';
  import { nanoid } from 'nanoid';

  const nodeTypes = { episode: EpisodeNode };

  interface GraphEditorProps {
    graphId: string;
  }

  export function GraphEditor({ graphId }: GraphEditorProps) {
    const { nodes, edges, isDirty, addEdge, setLayout, save } = useGraphEditorStore();

    const rfNodes = useMemo(
      () =>
        nodes.map((n) => ({
          id: n.id,
          type: 'episode',
          position: { x: n.positionX, y: n.positionY },
          data: { title: n.title, nodeType: n.nodeType },
        })),
      [nodes]
    );

    const rfEdges = useMemo(
      () => edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      [edges]
    );

    const onConnect = useCallback(
      (connection: Connection) => {
        if (connection.source && connection.target) {
          addEdge({ id: `e-${nanoid()}`, source: connection.source, target: connection.target });
        }
      },
      [addEdge]
    );

    const handleSave = useCallback(() => save(graphId), [save, graphId]);

    return (
      <div className="flex h-[calc(100vh-200px)]">
        <div className="flex-1 relative">
          {isDirty && (
            <div className="absolute top-2 left-2 z-10 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
              Unsaved changes
            </div>
          )}
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button variant="outline" size="sm" onClick={setLayout}>
              <LayoutGrid className="h-4 w-4 mr-1" /> Auto Layout
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isDirty}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        <EpisodeSidebar />
      </div>
    );
  }
  ```

- [ ] **3.6 — Implement `episode-sidebar.tsx`**
  - Panel on the right side of the editor (300px wide)
  - "Add Episode" button opens a podcast search/select dialog
  - When a node is selected, shows edit form: title, node type dropdown (start/default/milestone/end)
  - Delete node button with confirmation
  - Podcast search uses existing podcast API (`GET /api/podcasts?search=...`)
  ```tsx
  // components/learning-path/episode-sidebar.tsx
  'use client';

  import { useState } from 'react';
  import { useGraphEditorStore } from '@/stores/graph-editor-store';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Label } from '@/components/ui/label';
  import { Plus, Trash2 } from 'lucide-react';
  import { nanoid } from 'nanoid';

  export function EpisodeSidebar() {
    const { nodes, selectedNodeId, addNode, updateNode, removeNode, setSelectedNode } = useGraphEditorStore();
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    const [searchQuery, setSearchQuery] = useState('');

    const handleAddEpisode = (podcastId: string, title: string) => {
      addNode({
        id: `temp-${nanoid()}`,
        title,
        nodeType: 'default',
        podcastId,
        positionX: Math.random() * 400,
        positionY: Math.random() * 400,
      });
    };

    return (
      <div className="w-[300px] border-l bg-muted/30 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Episodes</h3>

        {/* Add Episode section */}
        <div className="mb-6">
          <Button className="w-full" onClick={() => handleAddEpisode('placeholder', 'New Episode')}>
            <Plus className="h-4 w-4 mr-1" /> Add Episode
          </Button>
        </div>

        {/* Selected Node Editor */}
        {selectedNode && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Edit Episode</h4>
            <div className="space-y-2">
              <Label htmlFor="node-title">Title</Label>
              <Input
                id="node-title"
                value={selectedNode.title}
                onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-type">Type</Label>
              <Select
                value={selectedNode.nodeType}
                onValueChange={(v) => updateNode(selectedNode.id, { nodeType: v as GraphNode['nodeType'] })}
              >
                <SelectTrigger id="node-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="destructive" size="sm" onClick={() => removeNode(selectedNode.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        )}

        {/* Node List */}
        <div className="mt-4 border-t pt-4">
          <h4 className="font-medium mb-2">All Episodes ({nodes.length})</h4>
          <ul className="space-y-1">
            {nodes.map((n) => (
              <li
                key={n.id}
                className={`text-sm p-2 rounded cursor-pointer hover:bg-accent ${n.id === selectedNodeId ? 'bg-accent' : ''}`}
                onClick={() => setSelectedNode(n.id)}
              >
                {n.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  ```

- [ ] **3.7 — Run all tests, verify green**
- [ ] **3.8 — Commit:** `feat(ui): add visual graph editor with @xyflow/react and episode nodes`

---

## Task 4: Linear Path Editor

**Files:**
- `components/learning-path/linear-editor.tsx`
- `__tests__/components/learning-path/linear-editor.test.tsx`

### Steps

- [ ] **4.1 — Install @dnd-kit**
  ```bash
  npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  ```

- [ ] **4.2 — Write component tests**
  - Test: renders list of episodes from store
  - Test: reorder via drag-and-drop updates store node order
  - Test: add episode button adds node to store
  - Test: remove button removes episode from store
  - Test: save button calls store.save()

- [ ] **4.3 — Implement `linear-editor.tsx`**
  ```tsx
  // components/learning-path/linear-editor.tsx
  'use client';

  import { useCallback } from 'react';
  import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
  import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
  import { CSS } from '@dnd-kit/utilities';
  import { useGraphEditorStore } from '@/stores/graph-editor-store';
  import { Button } from '@/components/ui/button';
  import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';

  interface LinearEditorProps {
    graphId: string;
  }

  function SortableEpisode({ id, title, onRemove }: { id: string; title: string; onRemove: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 border rounded bg-card mb-2">
        <button {...attributes} {...listeners} className="cursor-grab" aria-label="Drag to reorder">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="flex-1 text-sm">{title}</span>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${title}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  export function LinearEditor({ graphId }: LinearEditorProps) {
    const { nodes, isDirty, removeNode, save } = useGraphEditorStore();
    // The store manages node order — reorder by swapping in the nodes array
    const store = useGraphEditorStore;

    const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const state = store.getState();
        const oldIndex = state.nodes.findIndex((n) => n.id === active.id);
        const newIndex = state.nodes.findIndex((n) => n.id === over.id);
        store.setState({ nodes: arrayMove(state.nodes, oldIndex, newIndex), isDirty: true });
      }
    }, []);

    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Linear Path</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Episode
            </Button>
            <Button size="sm" onClick={() => save(graphId)} disabled={!isDirty}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>

        {isDirty && (
          <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm mb-4">Unsaved changes</div>
        )}

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            {nodes.map((node, index) => (
              <SortableEpisode key={node.id} id={node.id} title={`${index + 1}. ${node.title}`} onRemove={() => removeNode(node.id)} />
            ))}
          </SortableContext>
        </DndContext>

        {nodes.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No episodes yet. Click "Add Episode" to begin.</p>
        )}
      </div>
    );
  }
  ```

- [ ] **4.4 — Run tests, verify green**
- [ ] **4.5 — Commit:** `feat(ui): add linear path editor with @dnd-kit sortable`

---

## Task 5: Admin Learning Path Pages

**Files:**
- `app/(admin)/admin/learning-graphs/page.tsx`
- `app/(admin)/admin/learning-graphs/[id]/page.tsx`
- `__tests__/app/admin/learning-graphs.test.tsx`

### Steps

- [ ] **5.1 — Write component tests for admin list page**
  - Test: renders table of learning graphs with columns: Title, Domain, Type, Published, Actions
  - Test: clicking "New Path" navigates to creation flow
  - Test: delete button shows confirmation dialog, then deletes on confirm
  - Test: publish toggle calls PUT API with `{ isPublished: true/false }`

- [ ] **5.2 — Implement admin list page**
  ```tsx
  // app/(admin)/admin/learning-graphs/page.tsx
  import { prisma } from '@/lib/prisma';
  import { LearningGraphsTable } from '@/components/admin/learning-graphs-table';

  export default async function AdminLearningGraphsPage() {
    const graphs = await prisma.learningGraph.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { episodes: true } } },
    });

    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Learning Paths</h1>
        <LearningGraphsTable graphs={graphs} />
      </div>
    );
  }
  ```
  - Also create `components/admin/learning-graphs-table.tsx` — client component with DataTable, publish/unpublish toggle (Switch), delete button with `AlertDialog` from shadcn/ui, link to editor.

- [ ] **5.3 — Implement admin editor page**
  ```tsx
  // app/(admin)/admin/learning-graphs/[id]/page.tsx
  import { prisma } from '@/lib/prisma';
  import { notFound } from 'next/navigation';
  import { GraphEditor } from '@/components/learning-path/graph-editor';
  import { LinearEditor } from '@/components/learning-path/linear-editor';
  import { GraphEditorInitializer } from '@/components/learning-path/graph-editor-initializer';

  export default async function AdminLearningGraphEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const graph = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: true, edges: true },
    });

    if (!graph) return notFound();

    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-4">{graph.title}</h1>
        <GraphEditorInitializer episodes={graph.episodes} edges={graph.edges} />
        {graph.pathType === 'graph' ? <GraphEditor graphId={id} /> : <LinearEditor graphId={id} />}
      </div>
    );
  }
  ```
  - `GraphEditorInitializer` is a client component that calls `useGraphEditorStore.getState().loadFromApi(...)` on mount.

- [ ] **5.4 — Run tests, verify green**
- [ ] **5.5 — Commit:** `feat(admin): add learning graph list and editor pages`

---

## Task 6: Public Learning Path Listing

**Files:**
- `app/(public)/learning-path/page.tsx`
- `components/learning-path/path-card.tsx`
- `__tests__/components/learning-path/path-card.test.tsx`

### Steps

- [ ] **6.1 — Write component tests for `path-card.tsx`**
  - Test: renders title, description, domain badge, episode count
  - Test: renders progress bar with correct percentage
  - Test: links to `/learning-path/[id]`

- [ ] **6.2 — Implement `path-card.tsx`**
  ```tsx
  // components/learning-path/path-card.tsx
  import Link from 'next/link';
  import { Badge } from '@/components/ui/badge';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Progress } from '@/components/ui/progress';

  interface PathCardProps {
    id: string;
    title: string;
    description: string | null;
    domain: string | null;
    episodeCount: number;
    completedCount: number;
  }

  export function PathCard({ id, title, description, domain, episodeCount, completedCount }: PathCardProps) {
    const progress = episodeCount > 0 ? Math.round((completedCount / episodeCount) * 100) : 0;

    return (
      <Link href={`/learning-path/${id}`}>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{title}</CardTitle>
              {domain && <Badge variant="secondary">{domain}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {description && <p className="text-sm text-muted-foreground mb-3">{description}</p>}
            <div className="flex items-center justify-between text-sm mb-1">
              <span>{episodeCount} episodes</span>
              <span>{progress}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      </Link>
    );
  }
  ```

- [ ] **6.3 — Implement public listing page**
  ```tsx
  // app/(public)/learning-path/page.tsx
  import { prisma } from '@/lib/prisma';
  import { PathCard } from '@/components/learning-path/path-card';

  export default async function LearningPathsPage({
    searchParams,
  }: {
    searchParams: Promise<{ domain?: string }>;
  }) {
    const { domain } = await searchParams;
    const paths = await prisma.learningGraph.findMany({
      where: { isPublished: true, ...(domain ? { domain } : {}) },
      include: { _count: { select: { episodes: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Learning Paths</h1>
        {/* Domain filter buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map((path) => (
            <PathCard
              key={path.id}
              id={path.id}
              title={path.title}
              description={path.description}
              domain={path.domain}
              episodeCount={path._count.episodes}
              completedCount={0} // TODO: fetch user progress
            />
          ))}
        </div>
      </div>
    );
  }
  ```

- [ ] **6.4 — Run tests, verify green**
- [ ] **6.5 — Commit:** `feat(ui): add public learning path listing with progress indicators`

---

## Task 7: Learning Path Viewer

**Files:**
- `components/learning-path/path-viewer.tsx`
- `app/(public)/learning-path/[id]/page.tsx`
- `__tests__/components/learning-path/path-viewer.test.tsx`

### Steps

- [ ] **7.1 — Write component tests for `path-viewer.tsx`**
  - Test: renders read-only graph view (no editing controls) for `pathType=graph`
  - Test: renders read-only list view for `pathType=linear`
  - Test: completed episodes show checkmark overlay
  - Test: clicking an episode calls onEpisodeSelect callback
  - Test: overall progress bar shows correct percentage

- [ ] **7.2 — Implement `path-viewer.tsx`**
  - Read-only @xyflow/react view (no connect, no drag) for graph mode
  - Ordered list with completion indicators for linear mode
  - Completed nodes get a green border and checkmark
  - Overall progress bar at the top
  ```tsx
  // components/learning-path/path-viewer.tsx
  'use client';

  import { useMemo } from 'react';
  import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
  import '@xyflow/react/dist/style.css';
  import { EpisodeNode } from './episode-node';
  import { Progress } from '@/components/ui/progress';
  import { CheckCircle2, Circle } from 'lucide-react';

  const nodeTypes = { episode: EpisodeNode };

  interface Episode {
    id: string;
    title: string;
    nodeType: string;
    podcastId: string;
    positionX: number;
    positionY: number;
    orderIndex: number;
  }

  interface PathViewerProps {
    pathType: 'graph' | 'linear';
    episodes: Episode[];
    edges: { id: string; sourceId: string; targetId: string }[];
    completedEpisodeIds: Set<string>;
    onEpisodeSelect: (episodeId: string, podcastId: string) => void;
  }

  export function PathViewer({ pathType, episodes, edges, completedEpisodeIds, onEpisodeSelect }: PathViewerProps) {
    const completedCount = episodes.filter((e) => completedEpisodeIds.has(e.id)).length;
    const progress = episodes.length > 0 ? Math.round((completedCount / episodes.length) * 100) : 0;

    // ... renders ReactFlow (read-only) for graph, or ordered list for linear
    // See full implementation pattern above
  }
  ```

- [ ] **7.3 — Implement viewer page**
  ```tsx
  // app/(public)/learning-path/[id]/page.tsx
  import { prisma } from '@/lib/prisma';
  import { notFound } from 'next/navigation';
  import { PathViewer } from '@/components/learning-path/path-viewer';
  import { getServerSession } from '@/lib/auth';

  export default async function LearningPathViewerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const graph = await prisma.learningGraph.findUnique({
      where: { id, isPublished: true },
      include: { episodes: { orderBy: { orderIndex: 'asc' } }, edges: true },
    });

    if (!graph) return notFound();

    // Fetch user progress if authenticated
    const session = await getServerSession();
    let completedIds: string[] = [];
    if (session?.user) {
      const progress = await prisma.episodeProgress.findMany({
        where: { userId: session.user.id, completed: true, episodeId: { in: graph.episodes.map((e) => e.id) } },
        select: { episodeId: true },
      });
      completedIds = progress.map((p) => p.episodeId);
    }

    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-2">{graph.title}</h1>
        {graph.description && <p className="text-muted-foreground mb-6">{graph.description}</p>}
        <PathViewer
          pathType={graph.pathType as 'graph' | 'linear'}
          episodes={graph.episodes}
          edges={graph.edges}
          completedEpisodeIds={new Set(completedIds)}
          onEpisodeSelect={() => {}} // client-side handler wired in a wrapper
        />
      </div>
    );
  }
  ```

- [ ] **7.4 — Run tests, verify green**
- [ ] **7.5 — Commit:** `feat(ui): add learning path viewer with completion tracking`

---

## Task 8: Episode Playback in Path Context

**Files:**
- `stores/player-store.ts` (update existing)
- `__tests__/stores/player-store.test.ts` (update existing)

### Steps

- [ ] **8.1 — Write tests for path-aware playback**
  - Test: `setPathContext(graphId, episodeIds)` stores the path context
  - Test: `nextInPath()` advances to the next episode in path order
  - Test: `previousInPath()` goes to the previous episode in path order
  - Test: `nextInPath()` does nothing when at the last episode
  - Test: `clearPathContext()` removes path context

- [ ] **8.2 — Update player store**
  - Add state: `pathContext: { graphId: string; episodeIds: string[]; currentIndex: number } | null`
  - Add actions: `setPathContext`, `nextInPath`, `previousInPath`, `clearPathContext`
  - Add computed: `hasNextInPath`, `hasPreviousInPath`
  - When `autoAdvance` is true and episode finishes, call `nextInPath()`

- [ ] **8.3 — Update audio player component**
  - Show path context bar when playing within a path: "Playing from: [Path Name] (3/8)"
  - Add previous/next buttons connected to path navigation
  - Add auto-advance toggle

- [ ] **8.4 — Run tests, verify green**
- [ ] **8.5 — Commit:** `feat(player): add path-aware playback with auto-advance`

---

## Task 9: Path Progress Tracking

**Files:**
- `hooks/use-path-progress.ts`
- `__tests__/hooks/use-path-progress.test.ts`

### Steps

- [ ] **9.1 — Write tests for progress hook**
  - Test: `usePathProgress(graphId)` returns `{ completedIds, progress, markComplete, isLoading }`
  - Test: `markComplete(episodeId)` calls progress API and updates local state
  - Test: progress percentage updates correctly

- [ ] **9.2 — Implement `use-path-progress.ts`**
  ```ts
  // hooks/use-path-progress.ts
  'use client';

  import { useState, useEffect, useCallback } from 'react';

  export function usePathProgress(graphId: string, episodeIds: string[]) {
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Fetch existing progress from API
      fetch(`/api/progress?graphId=${graphId}`)
        .then((res) => res.json())
        .then((data) => {
          setCompletedIds(new Set(data.completedEpisodeIds));
          setIsLoading(false);
        });
    }, [graphId]);

    const markComplete = useCallback(async (episodeId: string) => {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId, completed: true }),
      });
      setCompletedIds((prev) => new Set([...prev, episodeId]));
    }, []);

    const progress = episodeIds.length > 0
      ? Math.round((completedIds.size / episodeIds.length) * 100)
      : 0;

    return { completedIds, progress, markComplete, isLoading };
  }
  ```

- [ ] **9.3 — Connect progress to path viewer**
  - Completed nodes get green border + checkmark icon
  - Progress bar updates in real-time as episodes complete
  - Auto-mark complete when audio finishes playing (via player store listener)

- [ ] **9.4 — Run tests, verify green**
- [ ] **9.5 — Commit:** `feat(progress): track and display learning path completion`

---

## Task 10: Integration + E2E Tests

**Files:**
- `__tests__/integration/learning-paths.test.ts`
- `e2e/learning-paths.spec.ts`

### Steps

- [ ] **10.1 — Write API integration tests**
  - Test full CRUD cycle: create graph -> add episodes/edges -> publish -> fetch as public -> verify episodes -> delete
  - Test access control: non-admin cannot create/update/delete
  - Test bulk data endpoint validates referential integrity

- [ ] **10.2 — Write component integration tests**
  - Test graph editor: add nodes -> connect edges -> auto-layout -> save -> verify store state
  - Test linear editor: add episodes -> reorder -> save -> verify order persisted

- [ ] **10.3 — Write E2E test**
  ```ts
  // e2e/learning-paths.spec.ts
  test('admin creates path, user views and tracks progress', async ({ page }) => {
    // 1. Admin logs in
    // 2. Navigate to /admin/learning-graphs
    // 3. Click "New Path" — fill title, domain, select graph type
    // 4. In graph editor: add 3 episodes, connect them, auto-layout, save
    // 5. Publish the path
    // 6. Log out, log in as regular user
    // 7. Navigate to /learning-path — verify new path appears
    // 8. Click path — verify viewer shows 3 episodes
    // 9. Click first episode — verify player opens with path context
    // 10. Wait for episode to "complete" — verify checkmark appears
    // 11. Verify progress bar updates
  });
  ```

- [ ] **10.4 — Run full test suite, verify green**
- [ ] **10.5 — Commit:** `test: add integration and E2E tests for learning paths`
