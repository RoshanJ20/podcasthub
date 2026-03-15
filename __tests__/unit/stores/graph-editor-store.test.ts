/**
 * Unit tests for graph editor Zustand store.
 *
 * Tests cover:
 * - Initial state
 * - Node CRUD operations (add, remove, update)
 * - Edge CRUD operations (add, remove)
 * - Node removal cascades to connected edges
 * - Dagre auto-layout
 * - Save and dirty state management
 * - Load from API and reset
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGraphEditorStore } from '@/stores/graph-editor-store';

// Mock fetch for save tests
global.fetch = vi.fn();

describe('GraphEditorStore', () => {
  beforeEach(() => {
    useGraphEditorStore.getState().reset();
    vi.clearAllMocks();
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
    addNode({
      id: 'temp-1',
      title: 'Episode 1',
      nodeType: 'start',
      podcastId: 'p1',
      positionX: 0,
      positionY: 0,
    });
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].title).toBe('Episode 1');
    expect(state.isDirty).toBe(true);
  });

  it('removes a node and its connected edges', () => {
    const store = useGraphEditorStore.getState();
    store.addNode({
      id: 'n1',
      title: 'A',
      nodeType: 'default',
      podcastId: 'p1',
      positionX: 0,
      positionY: 0,
    });
    store.addNode({
      id: 'n2',
      title: 'B',
      nodeType: 'default',
      podcastId: 'p2',
      positionX: 100,
      positionY: 0,
    });
    store.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
    store.removeNode('n1');
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.edges).toHaveLength(0);
  });

  it('clears selectedNodeId when removed node was selected', () => {
    const store = useGraphEditorStore.getState();
    store.addNode({
      id: 'n1',
      title: 'A',
      nodeType: 'default',
      podcastId: 'p1',
      positionX: 0,
      positionY: 0,
    });
    store.setSelectedNode('n1');
    expect(useGraphEditorStore.getState().selectedNodeId).toBe('n1');
    store.removeNode('n1');
    expect(useGraphEditorStore.getState().selectedNodeId).toBeNull();
  });

  it('updates a node', () => {
    const store = useGraphEditorStore.getState();
    store.addNode({
      id: 'n1',
      title: 'Old',
      nodeType: 'default',
      podcastId: 'p1',
      positionX: 0,
      positionY: 0,
    });
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
    store.addNode({
      id: 'n1',
      title: 'A',
      nodeType: 'start',
      podcastId: 'p1',
      positionX: 0,
      positionY: 0,
    });
    store.addNode({
      id: 'n2',
      title: 'B',
      nodeType: 'end',
      podcastId: 'p2',
      positionX: 0,
      positionY: 0,
    });
    store.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
    store.setLayout();
    const state = useGraphEditorStore.getState();
    // After layout, positions should differ from each other
    const positions = state.nodes.map((n) => ({ x: n.positionX, y: n.positionY }));
    expect(positions[0]).not.toEqual(positions[1]);
  });

  it('resets isDirty after save', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { episodes: [] } }), { status: 200 })
    );

    const store = useGraphEditorStore.getState();
    store.addNode({
      id: 'n1',
      title: 'A',
      nodeType: 'default',
      podcastId: 'p1',
      positionX: 0,
      positionY: 0,
    });
    expect(useGraphEditorStore.getState().isDirty).toBe(true);
    await store.save('graph-id-123');
    expect(useGraphEditorStore.getState().isDirty).toBe(false);
  });

  it('calls correct API endpoint on save', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { episodes: [] } }), { status: 200 })
    );

    const store = useGraphEditorStore.getState();
    store.addNode({
      id: 'n1',
      title: 'A',
      nodeType: 'default',
      podcastId: 'p1',
      positionX: 10,
      positionY: 20,
    });
    store.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
    await store.save('graph-123');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/learning-graphs/graph-123/data',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('loads nodes and edges from API data', () => {
    const store = useGraphEditorStore.getState();
    const nodes = [
      {
        id: 'ep-1',
        title: 'Episode 1',
        nodeType: 'start' as const,
        podcastId: 'p1',
        positionX: 0,
        positionY: 0,
      },
      {
        id: 'ep-2',
        title: 'Episode 2',
        nodeType: 'end' as const,
        podcastId: 'p2',
        positionX: 100,
        positionY: 100,
      },
    ];
    const edges = [{ id: 'edge-1', source: 'ep-1', target: 'ep-2' }];
    store.loadFromApi(nodes, edges);
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toHaveLength(2);
    expect(state.edges).toHaveLength(1);
    expect(state.isDirty).toBe(false);
  });

  it('resets to initial state', () => {
    const store = useGraphEditorStore.getState();
    store.addNode({
      id: 'n1',
      title: 'A',
      nodeType: 'default',
      podcastId: 'p1',
      positionX: 0,
      positionY: 0,
    });
    store.setSelectedNode('n1');
    store.reset();
    const state = useGraphEditorStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.isDirty).toBe(false);
  });
});
