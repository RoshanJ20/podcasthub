/**
 * Zustand store for the learning-path editor.
 *
 * Manages nodes (episodes), edges (persisted connections), selection, dirty
 * state, and API persistence for the linear learning-path editor.
 *
 * Key responsibilities:
 * - CRUD operations for nodes and edges with dirty-state tracking
 * - Debounced auto-save to the PUT /api/learning-graphs/:id/data endpoint
 * - Reconciling server-returned IDs back into client state after save
 *
 * Dependencies:
 * - graph-editor-helpers (pure payload/reconcile utilities)
 * - @/lib/logger (structured logging)
 */
import { create } from 'zustand';
import { createLogger } from '@/lib/logger';
import { withBasePath } from '@/lib/config/base-path';
import {
  buildSavePayload,
  reconcileServerResponse,
  type ApiEpisode,
  type ApiEdge,
} from './graph-editor-helpers';

const log = createLogger('graph-editor-store');

/** A node (episode) in the graph editor. */
export interface GraphNode {
  id: string;
  title: string;
  nodeType: 'start' | 'default' | 'milestone' | 'end';
  auditBriefId: string;
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
  },

  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      isDirty: true,
    }));
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      isDirty: true,
    }));
  },

  addEdge: (edge) => {
    set((s) => ({ edges: [...s.edges, edge], isDirty: true }));
  },

  removeEdge: (id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id), isDirty: true }));
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

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
        const response = await fetch(withBasePath(`/api/learning-graphs/${graphId}/data`), {
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

        log.info(
          { graphId, nodeCount: reconciled.nodes.length, edgeCount: reconciled.edges.length },
          'Graph saved successfully'
        );
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown save error';
      set({ isSaving: false, lastSaveError: message });
      log.error({ graphId, error: message }, 'Graph save failed');
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
