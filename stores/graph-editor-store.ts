/**
 * Zustand store for the admin graph editor.
 *
 * Manages nodes (episodes), edges (connections), selection, dirty state,
 * dagre auto-layout, and API persistence for the learning graph editor.
 */
import { create } from 'zustand';
import dagre from 'dagre';

/** A node (episode) in the graph editor. */
export interface GraphNode {
  id: string;
  title: string;
  nodeType: 'start' | 'default' | 'milestone' | 'end';
  podcastId: string;
  positionX: number;
  positionY: number;
}

/** An edge (connection) between two nodes in the graph editor. */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

/** State and actions for the graph editor store. */
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
        episodes: nodes.map((n, i) => ({
          tempId: n.id,
          title: n.title,
          podcastId: n.podcastId,
          positionX: n.positionX,
          positionY: n.positionY,
          nodeType: n.nodeType,
          sortOrder: i,
        })),
        edges: edges.map((e) => ({
          sourceEpisodeId: e.source,
          targetEpisodeId: e.target,
        })),
      }),
    });
    set({ isDirty: false });
  },

  loadFromApi: (nodes, edges) => set({ nodes, edges, isDirty: false }),

  reset: () => set({ nodes: [], edges: [], selectedNodeId: null, isDirty: false }),
}));
