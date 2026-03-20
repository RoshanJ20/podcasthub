/**
 * Unit tests for graph editor Zustand store.
 *
 * Tests cover:
 * - Initial state (including isSaving, lastSaveError)
 * - Node CRUD operations (add, remove, update)
 * - Edge CRUD operations (add, remove)
 * - Node removal cascades to connected edges
 * - Dagre auto-layout
 * - Save: dirty state, error handling, concurrent save prevention, ID reconciliation
 * - Load from API and reset
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGraphEditorStore, scheduleAutoSave } from '@/stores/graph-editor-store';
import type { GraphNode } from '@/stores/graph-editor-store';

// Mock fetch for save tests
global.fetch = vi.fn();

/** Helper to create a minimal test node. */
function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: 'temp-1',
    title: 'Episode 1',
    nodeType: 'default' as const,
    auditBriefId: 'p1',
    positionX: 0,
    positionY: 0,
    ...overrides,
  };
}

/**
 * Builds a successful API response matching the server's save response shape.
 *
 * The server returns `{ data: { episodes: [...], edges: [...] } }` where
 * each episode has real DB-assigned IDs and each edge references those IDs.
 */
function makeSuccessResponse(
  episodes: Array<{
    id: string;
    tempId?: string;
    title: string;
    auditBriefId: string;
    positionX: number;
    positionY: number;
    nodeType: string;
    sortOrder: number;
  }>,
  edges: Array<{ id: string; sourceEpisodeId: string; targetEpisodeId: string }> = []
) {
  return new Response(JSON.stringify({ data: { episodes, edges } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GraphEditorStore', () => {
  beforeEach(() => {
    useGraphEditorStore.getState().reset();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty state', () => {
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.isDirty).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.lastSaveError).toBeNull();
  });

  it('adds a node and marks dirty', () => {
    const { addNode } = useGraphEditorStore.getState();
    addNode(makeNode());
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].title).toBe('Episode 1');
    expect(state.isDirty).toBe(true);
  });

  it('removes a node and its connected edges', () => {
    const store = useGraphEditorStore.getState();
    store.addNode(makeNode({ id: 'n1', title: 'A' }));
    store.addNode(makeNode({ id: 'n2', title: 'B', auditBriefId: 'p2', positionX: 100 }));
    store.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
    store.removeNode('n1');
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.edges).toHaveLength(0);
  });

  it('clears selectedNodeId when removed node was selected', () => {
    const store = useGraphEditorStore.getState();
    store.addNode(makeNode({ id: 'n1', title: 'A' }));
    store.setSelectedNode('n1');
    expect(useGraphEditorStore.getState().selectedNodeId).toBe('n1');
    store.removeNode('n1');
    expect(useGraphEditorStore.getState().selectedNodeId).toBeNull();
  });

  it('updates a node', () => {
    const store = useGraphEditorStore.getState();
    store.addNode(makeNode({ id: 'n1', title: 'Old' }));
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

  it('sets and clears selected node', () => {
    const store = useGraphEditorStore.getState();
    store.setSelectedNode('n1');
    expect(useGraphEditorStore.getState().selectedNodeId).toBe('n1');
    store.setSelectedNode(null);
    expect(useGraphEditorStore.getState().selectedNodeId).toBeNull();
  });

  it('applies dagre layout via setLayout', () => {
    const store = useGraphEditorStore.getState();
    store.addNode(makeNode({ id: 'n1', title: 'A', nodeType: 'start' }));
    store.addNode(makeNode({ id: 'n2', title: 'B', nodeType: 'end', auditBriefId: 'p2' }));
    store.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
    store.setLayout();
    const state = useGraphEditorStore.getState();
    const positions = state.nodes.map((n) => ({ x: n.positionX, y: n.positionY }));
    expect(positions[0]).not.toEqual(positions[1]);
  });

  describe('save', () => {
    it('resets isDirty and isSaving after successful save', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        makeSuccessResponse([
          {
            id: 'db-1',
            title: 'A',
            auditBriefId: 'p1',
            positionX: 0,
            positionY: 0,
            nodeType: 'default',
            sortOrder: 0,
          },
        ])
      );

      const store = useGraphEditorStore.getState();
      store.addNode(makeNode({ id: 'temp-1', title: 'A' }));
      expect(useGraphEditorStore.getState().isDirty).toBe(true);

      await store.save('graph-id-123');

      const state = useGraphEditorStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.lastSaveError).toBeNull();
    });

    it('calls correct API endpoint with id field (not tempId)', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        makeSuccessResponse([
          {
            id: 'db-1',
            title: 'A',
            auditBriefId: 'p1',
            positionX: 10,
            positionY: 20,
            nodeType: 'default',
            sortOrder: 0,
          },
        ])
      );

      const store = useGraphEditorStore.getState();
      store.addNode(makeNode({ id: 'temp-1', title: 'A', positionX: 10, positionY: 20 }));
      store.addEdge({ id: 'e1', source: 'temp-1', target: 'n2' });
      await store.save('graph-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/learning-graphs/graph-123/data',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Verify the payload uses `id` not `tempId`
      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.episodes[0]).toHaveProperty('id', 'temp-1');
      expect(body.episodes[0]).not.toHaveProperty('tempId');
    });

    it('sets isSaving to true during save', async () => {
      // Use a promise we control to pause the fetch mid-flight
      let resolveFetch!: (value: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      vi.mocked(global.fetch).mockReturnValue(fetchPromise);

      const store = useGraphEditorStore.getState();
      store.addNode(makeNode({ id: 'temp-1', title: 'A' }));

      const savePromise = store.save('graph-1');

      // While fetch is in-flight, isSaving should be true
      expect(useGraphEditorStore.getState().isSaving).toBe(true);

      resolveFetch(
        makeSuccessResponse([
          {
            id: 'db-1',
            title: 'A',
            auditBriefId: 'p1',
            positionX: 0,
            positionY: 0,
            nodeType: 'default',
            sortOrder: 0,
          },
        ])
      );
      await savePromise;

      expect(useGraphEditorStore.getState().isSaving).toBe(false);
    });

    it('prevents concurrent saves by returning early if already saving', async () => {
      let resolveFetch!: (value: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      vi.mocked(global.fetch).mockReturnValue(fetchPromise);

      const store = useGraphEditorStore.getState();
      store.addNode(makeNode({ id: 'temp-1', title: 'A' }));

      // Start first save
      const savePromise1 = store.save('graph-1');
      // Second save should return early without calling fetch again
      const savePromise2 = store.save('graph-1');

      expect(global.fetch).toHaveBeenCalledTimes(1);

      resolveFetch(
        makeSuccessResponse([
          {
            id: 'db-1',
            title: 'A',
            auditBriefId: 'p1',
            positionX: 0,
            positionY: 0,
            nodeType: 'default',
            sortOrder: 0,
          },
        ])
      );
      await savePromise1;
      await savePromise2;
    });

    it('sets lastSaveError and re-throws on API failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
      );

      const store = useGraphEditorStore.getState();
      store.addNode(makeNode({ id: 'temp-1', title: 'A' }));

      await expect(store.save('graph-1')).rejects.toThrow();

      const state = useGraphEditorStore.getState();
      expect(state.isSaving).toBe(false);
      expect(state.lastSaveError).toBeTruthy();
      // isDirty should remain true on failure — the save did not succeed
      expect(state.isDirty).toBe(true);
    });

    it('sets lastSaveError on network/fetch failure and re-throws', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const store = useGraphEditorStore.getState();
      store.addNode(makeNode({ id: 'temp-1', title: 'A' }));

      await expect(store.save('graph-1')).rejects.toThrow('Network error');

      const state = useGraphEditorStore.getState();
      expect(state.isSaving).toBe(false);
      expect(state.lastSaveError).toBe('Network error');
      expect(state.isDirty).toBe(true);
    });

    it('clears lastSaveError on next successful save', async () => {
      // First save fails
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'fail' }), { status: 500 })
      );

      const store = useGraphEditorStore.getState();
      store.addNode(makeNode({ id: 'temp-1', title: 'A' }));

      await expect(store.save('graph-1')).rejects.toThrow();
      expect(useGraphEditorStore.getState().lastSaveError).toBeTruthy();

      // Second save succeeds
      vi.mocked(global.fetch).mockResolvedValueOnce(
        makeSuccessResponse([
          {
            id: 'db-1',
            title: 'A',
            auditBriefId: 'p1',
            positionX: 0,
            positionY: 0,
            nodeType: 'default',
            sortOrder: 0,
          },
        ])
      );

      await store.save('graph-1');
      expect(useGraphEditorStore.getState().lastSaveError).toBeNull();
    });

    it('reconciles temp node IDs with server-assigned IDs', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        makeSuccessResponse(
          [
            {
              id: 'db-100',
              tempId: 'temp-1',
              title: 'A',
              auditBriefId: 'p1',
              positionX: 0,
              positionY: 0,
              nodeType: 'start',
              sortOrder: 0,
            },
            {
              id: 'db-200',
              tempId: 'temp-2',
              title: 'B',
              auditBriefId: 'p2',
              positionX: 100,
              positionY: 100,
              nodeType: 'end',
              sortOrder: 1,
            },
          ],
          [{ id: 'edge-db-1', sourceEpisodeId: 'db-100', targetEpisodeId: 'db-200' }]
        )
      );

      const store = useGraphEditorStore.getState();
      store.addNode(makeNode({ id: 'temp-1', title: 'A', nodeType: 'start' }));
      store.addNode(
        makeNode({
          id: 'temp-2',
          title: 'B',
          nodeType: 'end',
          auditBriefId: 'p2',
          positionX: 100,
          positionY: 100,
        })
      );
      store.addEdge({ id: 'e1', source: 'temp-1', target: 'temp-2' });

      await store.save('graph-1');

      const state = useGraphEditorStore.getState();
      // Nodes should now have server-assigned IDs
      expect(state.nodes.map((n) => n.id).sort()).toEqual(['db-100', 'db-200']);
      // Edges should reference the server-assigned IDs
      expect(state.edges).toHaveLength(1);
      expect(state.edges[0].id).toBe('edge-db-1');
      expect(state.edges[0].source).toBe('db-100');
      expect(state.edges[0].target).toBe('db-200');
    });

    it('preserves node properties during ID reconciliation', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        makeSuccessResponse([
          {
            id: 'db-100',
            tempId: 'temp-1',
            title: 'A',
            auditBriefId: 'p1',
            positionX: 50,
            positionY: 75,
            nodeType: 'milestone',
            sortOrder: 0,
          },
        ])
      );

      const store = useGraphEditorStore.getState();
      store.addNode(
        makeNode({
          id: 'temp-1',
          title: 'A',
          nodeType: 'milestone',
          positionX: 50,
          positionY: 75,
          description: 'test desc',
          audioUrl: 'http://audio.mp3',
        })
      );

      await store.save('graph-1');

      const node = useGraphEditorStore.getState().nodes[0];
      expect(node.id).toBe('db-100');
      expect(node.title).toBe('A');
      expect(node.nodeType).toBe('milestone');
      expect(node.positionX).toBe(50);
      expect(node.positionY).toBe(75);
    });
  });

  it('loads nodes and edges from API data', () => {
    const store = useGraphEditorStore.getState();
    const nodes = [
      makeNode({ id: 'ep-1', title: 'Episode 1', nodeType: 'start' }),
      makeNode({
        id: 'ep-2',
        title: 'Episode 2',
        nodeType: 'end',
        auditBriefId: 'p2',
        positionX: 100,
        positionY: 100,
      }),
    ];
    const edges = [{ id: 'edge-1', source: 'ep-1', target: 'ep-2' }];
    store.loadFromApi(nodes, edges);
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toHaveLength(2);
    expect(state.edges).toHaveLength(1);
    expect(state.isDirty).toBe(false);
  });

  it('resets to initial state including isSaving and lastSaveError', () => {
    const store = useGraphEditorStore.getState();
    store.addNode(makeNode({ id: 'n1', title: 'A' }));
    store.setSelectedNode('n1');
    store.reset();
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.isDirty).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.lastSaveError).toBeNull();
  });

  describe('auto-save', () => {
    it('has autoSaveGraphId in state, initially null', () => {
      expect(useGraphEditorStore.getState().autoSaveGraphId).toBeNull();
    });

    it('sets autoSaveGraphId via setAutoSaveGraphId', () => {
      useGraphEditorStore.getState().setAutoSaveGraphId('graph-abc');
      expect(useGraphEditorStore.getState().autoSaveGraphId).toBe('graph-abc');
    });

    it('accepts null to clear autoSaveGraphId', () => {
      const store = useGraphEditorStore.getState();
      store.setAutoSaveGraphId('graph-abc');
      store.setAutoSaveGraphId(null);
      expect(useGraphEditorStore.getState().autoSaveGraphId).toBeNull();
    });

    it('mutating methods do not trigger auto-save (manual save only)', async () => {
      const store = useGraphEditorStore.getState();
      store.setAutoSaveGraphId('graph-123');
      store.addNode(makeNode({ id: 'temp-1', title: 'A' }));

      // Advance past the old debounce window
      await vi.advanceTimersByTimeAsync(3000);

      // No auto-save should fire — save is manual now
      expect(global.fetch).not.toHaveBeenCalled();
      expect(useGraphEditorStore.getState().isDirty).toBe(true);
    });

    it('does not auto-save when autoSaveGraphId is null', async () => {
      const store = useGraphEditorStore.getState();
      // Don't set autoSaveGraphId
      store.addNode(makeNode({ id: 'temp-1', title: 'A' }));

      await vi.advanceTimersByTimeAsync(3000);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not auto-save when store is not dirty', async () => {
      const store = useGraphEditorStore.getState();
      store.setAutoSaveGraphId('graph-123');
      // Call scheduleAutoSave directly without making the store dirty
      scheduleAutoSave();

      await vi.advanceTimersByTimeAsync(3000);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('scheduleAutoSave is exported and callable', () => {
      expect(typeof scheduleAutoSave).toBe('function');
    });

    it('resets autoSaveGraphId on reset', () => {
      const store = useGraphEditorStore.getState();
      store.setAutoSaveGraphId('graph-abc');
      store.reset();
      expect(useGraphEditorStore.getState().autoSaveGraphId).toBeNull();
    });
  });
});
