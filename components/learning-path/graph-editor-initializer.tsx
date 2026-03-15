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
  audioUrl?: string;
}

interface Edge {
  id: string;
  sourceEpisodeId: string;
  targetEpisodeId: string;
}

interface GraphEditorInitializerProps {
  episodes: Episode[];
  edges: Edge[];
}

export function GraphEditorInitializer({ episodes, edges }: GraphEditorInitializerProps) {
  useEffect(() => {
    const nodes: GraphNode[] = episodes.map((ep) => ({
      id: ep.id,
      title: ep.title,
      nodeType: ep.nodeType as GraphNode['nodeType'],
      podcastId: '',
      positionX: ep.positionX,
      positionY: ep.positionY,
    }));

    const graphEdges: GraphEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.sourceEpisodeId,
      target: e.targetEpisodeId,
    }));

    useGraphEditorStore.getState().loadFromApi(nodes, graphEdges);
  }, [episodes, edges]);

  return null;
}
