/**
 * Pure helper functions for the graph editor Zustand store.
 *
 * Key responsibilities:
 * - Transforming client-side graph state into the API save payload format
 * - Reconciling server-returned episode/edge data with client-side node state
 *
 * These utilities are intentionally kept free of Zustand or React dependencies
 * so they can be unit-tested in isolation without any store setup.
 *
 * Dependencies:
 * - GraphNode, GraphEdge (re-exported from graph-editor-store for shared use)
 */

import type { GraphEdge, GraphNode } from './graph-editor-store';

/**
 * Shape of a single episode returned by the save API response.
 *
 * The server may include a `tempId` field that maps back to the client-side
 * temporary ID, allowing reconciliation with real DB-assigned IDs.
 */
export interface ApiEpisode {
  id: string;
  tempId?: string;
  title: string;
  auditBriefId: string;
  positionX: number;
  positionY: number;
  nodeType: string;
  description?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  transcript?: string;
}

/** Shape of a single edge returned by the save API response. */
export interface ApiEdge {
  id: string;
  sourceEpisodeId: string;
  targetEpisodeId: string;
}

/** The request body shape accepted by the PUT /api/learning-graphs/:id/data endpoint. */
export interface SavePayload {
  episodes: Array<{
    id: string;
    title: string;
    auditBriefId: string;
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
}

/**
 * Builds the save payload from the current editor state, transforming client
 * nodes and edges into the API-expected format with positional sort orders.
 *
 * @param nodes - The current graph nodes from the editor store
 * @param edges - The current graph edges from the editor store
 * @returns An object with `episodes` and `edges` arrays ready for the PUT API
 */
export function buildSavePayload(nodes: GraphNode[], edges: GraphEdge[]): SavePayload {
  return {
    episodes: nodes.map((n, i) => ({
      id: n.id,
      title: n.title,
      auditBriefId: n.auditBriefId,
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
export function reconcileServerResponse(
  data: { episodes: ApiEpisode[]; edges?: ApiEdge[] },
  clientNodes: GraphNode[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = (data.episodes ?? []).map((ep) => {
    const clientNode = clientNodes.find((n) => (ep.tempId && n.id === ep.tempId) || n.id === ep.id);
    return {
      id: ep.id,
      title: ep.title,
      auditBriefId: ep.auditBriefId,
      positionX: ep.positionX,
      positionY: ep.positionY,
      nodeType: ep.nodeType as GraphNode['nodeType'],
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
