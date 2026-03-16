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
  description?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  transcript?: string;
}

/** An edge (connection) between two nodes in the graph editor. */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

/**
 * Shape of a single episode returned by the save API response.
 *
 * The server may include a `tempId` field that maps back to the client-side
 * temporary ID, allowing reconciliation with real DB-assigned IDs.
 */
interface ApiEpisode {
  id: string;
  tempId?: string;
  title: string;
  podcastId: string;
  positionX: number;
  positionY: number;
  nodeType: string;
  sortOrder: number;
  description?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  transcript?: string;
}

/** Shape of a single edge returned by the save API response. */
interface ApiEdge {
  id: string;
  sourceEpisodeId: string;
  targetEpisodeId: string;
}

/** State and actions for the graph editor store. */
interface GraphEditorState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaveError: string | null;
  autoSaveGraphId: string | null;

  addNode: (node: GraphNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setLayout: () => void;
  save: (graphId: string) => Promise<void>;
  loadFromApi: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setAutoSaveGraphId: (graphId: string | null) => void;
  reset: () => void;
}

/** Debounce timer for auto-save. */
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

/** Delay in milliseconds before auto-save fires after the last mutation. */
const AUTO_SAVE_DELAY_MS = 2000;

/**
 * Schedules an auto-save after the debounce delay.
 *
 * Call this after any store mutation that sets isDirty=true.
 * Also exported for use in components that bypass store methods (e.g. drag-reorder).
 */
export function scheduleAutoSave(): void {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    const state = useGraphEditorStore.getState();
    if (state.isDirty && state.autoSaveGraphId && !state.isSaving) {
      try {
        await state.save(state.autoSaveGraphId);
      } catch {
        // Error is already stored in lastSaveError by the save method
      }
    }
  }, AUTO_SAVE_DELAY_MS);
}

/**
 * Builds the save payload from the current editor state, transforming client
 * nodes and edges into the API-expected format with positional sort orders.
 *
 * @param nodes - The current graph nodes from the editor store
 * @param edges - The current graph edges from the editor store
 * @returns An object with `episodes` and `edges` arrays ready for the PUT API
 */
function buildSavePayload(
  nodes: GraphNode[],
  edges: GraphEdge[],
): {
  episodes: Array<{
    id: string;
    title: string;
    podcastId: string;
    positionX: number;
    positionY: number;
    nodeType: string;
    sortOrder: number;
    description: string;
    audioUrl: string;
    thumbnailUrl: string;
    transcript: string;
  }>;
  edges: Array<{ sourceEpisodeId: string; targetEpisodeId: string }>;
} {
  return {
    episodes: nodes.map((n, i) => ({
      id: n.id,
      title: n.title,
      podcastId: n.podcastId,
      positionX: n.positionX,
      positionY: n.positionY,
      nodeType: n.nodeType,
      sortOrder: i,
      description: n.description ?? '',
      audioUrl: n.audioUrl ?? '',
      thumbnailUrl: n.thumbnailUrl ?? '',
      transcript: n.transcript ?? '',
    })),
    edges: edges.map((e) => ({
      sourceEpisodeId: e.source,
      targetEpisodeId: e.target,
    })),
  };
}

/**
 * Reconciles server-returned episodes with client nodes, producing updated
 * GraphNode and GraphEdge arrays with server-assigned IDs.
 *
 * @param data - The API response data containing episodes and optional edges
 * @param clientNodes - The original client-side nodes for fallback values
 * @returns An object with reconciled `nodes` and `edges` arrays
 */
function reconcileServerResponse(
  data: { episodes: ApiEpisode[]; edges?: ApiEdge[] },
  clientNodes: GraphNode[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = (data.episodes ?? []).map((ep) => {
    const clientNode = clientNodes.find(
      (n) => (ep.tempId && n.id === ep.tempId) || n.id === ep.id,
    );
    return {
      id: ep.id,
      title: ep.title,
      podcastId: ep.podcastId,
      positionX: ep.positionX,
      positionY: ep.positionY,
      nodeType: ep.nodeType as GraphNode['nodeType'],
      sortOrder: ep.sortOrder,
      description: clientNode?.description ?? ep.description ?? '',
      audioUrl: clientNode?.audioUrl ?? ep.audioUrl ?? '',
      thumbnailUrl: clientNode?.thumbnailUrl ?? ep.thumbnailUrl ?? '',
      transcript: clientNode?.transcript ?? ep.transcript ?? '',
    };
  });

  const edges: GraphEdge[] = (data.edges ?? []).map((e) => ({
    id: e.id,
    source: e.sourceEpisodeId,
    target: e.targetEpisodeId,
  }));

  return { nodes, edges };
}

export const useGraphEditorStore = create<GraphEditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,
  isSaving: false,
  lastSaveError: null,
  autoSaveGraphId: null,

  addNode: (node) => {
    set((s) => ({ nodes: [...s.nodes, node], isDirty: true }));
    scheduleAutoSave();
  },

  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      isDirty: true,
    }));
    scheduleAutoSave();
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      isDirty: true,
    }));
    scheduleAutoSave();
  },

  addEdge: (edge) => {
    set((s) => ({ edges: [...s.edges, edge], isDirty: true }));
    scheduleAutoSave();
  },

  removeEdge: (id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id), isDirty: true }));
    scheduleAutoSave();
  },

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
    scheduleAutoSave();
  },

  save: async (graphId) => {
    if (get().isSaving) {
      return;
    }

    set({ isSaving: true, lastSaveError: null });

    try {
      const { nodes, edges } = get();
      const payload = buildSavePayload(nodes, edges);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(`/api/learning-graphs/${graphId}/data`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Save failed (${response.status}): ${errorBody}`);
        }

        const { data } = (await response.json()) as {
          data: { episodes: ApiEpisode[]; edges?: ApiEdge[] };
        };

        const reconciled = reconcileServerResponse(data, nodes);

        set({
          nodes: reconciled.nodes,
          edges: reconciled.edges,
          isDirty: false,
          isSaving: false,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown save error';
      set({ isSaving: false, lastSaveError: message });
      throw error;
    }
  },

  loadFromApi: (nodes, edges) => set({ nodes, edges, isDirty: false }),

  setAutoSaveGraphId: (graphId) => set({ autoSaveGraphId: graphId }),

  reset: () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: false,
      isSaving: false,
      lastSaveError: null,
      autoSaveGraphId: null,
    });
  },
}));
