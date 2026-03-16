'use client';

/**
 * Client component that initializes the graph editor store with server-fetched data.
 *
 * Runs on mount to load episodes and edges into the Zustand store,
 * bridging server component data into client state.
 */
import { useEffect } from 'react';
import { useGraphEditorStore, type GraphNode, type GraphEdge } from '@/stores/graph-editor-store';

interface Episode {
  id: string;
  title: string;
  nodeType: string;
  positionX: number;
  positionY: number;
  audioUrl?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  transcript?: unknown;
}

interface Edge {
  id: string;
  sourceEpisodeId: string;
  targetEpisodeId: string;
}

interface GraphEditorInitializerProps {
  graphId: string;
  episodes: Episode[];
  edges: Edge[];
}

/**
 * Initializes the graph editor store with server-fetched episode and edge data.
 *
 * On mount, maps raw episode/edge data into GraphNode/GraphEdge shapes and loads
 * them into the Zustand store. Also sets the autoSaveGraphId so the debounced
 * auto-save knows which graph to persist. On unmount, clears the graph ID and
 * resets the store to prevent stale state on navigation.
 *
 * @param props.graphId - The learning graph ID used for auto-save API calls.
 * @param props.episodes - Server-fetched episode records.
 * @param props.edges - Server-fetched edge records.
 * @returns null — this component renders no UI.
 */
export function GraphEditorInitializer({ graphId, episodes, edges }: GraphEditorInitializerProps) {
  useEffect(() => {
    const nodes: GraphNode[] = episodes.map((ep) => ({
      id: ep.id,
      title: ep.title,
      nodeType: ep.nodeType as GraphNode['nodeType'],
      podcastId: '',
      positionX: ep.positionX,
      positionY: ep.positionY,
      audioUrl: ep.audioUrl ?? '',
      thumbnailUrl: ep.thumbnailUrl ?? '',
      description: ep.description ?? '',
      transcript:
        typeof ep.transcript === 'string' ? ep.transcript : JSON.stringify(ep.transcript ?? ''),
    }));

    const graphEdges: GraphEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.sourceEpisodeId,
      target: e.targetEpisodeId,
    }));

    useGraphEditorStore.getState().loadFromApi(nodes, graphEdges);
    useGraphEditorStore.getState().setAutoSaveGraphId(graphId);

    return () => {
      useGraphEditorStore.getState().setAutoSaveGraphId(null);
      useGraphEditorStore.getState().reset();
    };
  }, [graphId, episodes, edges]);

  return null;
}
