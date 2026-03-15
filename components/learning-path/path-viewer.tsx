'use client';

/**
 * Read-only learning path viewer component.
 *
 * Supports both graph mode (using @xyflow/react) and linear mode
 * (vertical step list). Shows completion status and progress bar.
 */
import { useMemo } from 'react';
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EpisodeNode, type EpisodeNodeData } from './episode-node';
import { CheckCircle2, Circle } from 'lucide-react';

const nodeTypes = { episode: EpisodeNode };

interface Episode {
  id: string;
  title: string;
  nodeType: string;
  podcastId?: string;
  positionX: number;
  positionY: number;
  sortOrder: number;
}

interface PathViewerProps {
  pathType: 'graph' | 'linear';
  episodes: Episode[];
  edges: { id: string; sourceEpisodeId: string; targetEpisodeId: string }[];
  completedEpisodeIds: Set<string>;
  onEpisodeSelect: (episodeId: string, podcastId: string) => void;
}

export function PathViewer({
  pathType,
  episodes,
  edges,
  completedEpisodeIds,
  onEpisodeSelect,
}: PathViewerProps) {
  const completedCount = episodes.filter((e) => completedEpisodeIds.has(e.id)).length;
  const progress = episodes.length > 0 ? Math.round((completedCount / episodes.length) * 100) : 0;

  const rfNodes: Node<EpisodeNodeData>[] = useMemo(
    () =>
      episodes.map((ep) => ({
        id: ep.id,
        type: 'episode' as const,
        position: { x: ep.positionX, y: ep.positionY },
        data: {
          title: ep.title,
          nodeType: ep.nodeType as EpisodeNodeData['nodeType'],
          completed: completedEpisodeIds.has(ep.id),
          onPlay: () => onEpisodeSelect(ep.id, ep.podcastId ?? ''),
        },
        draggable: false,
        connectable: false,
        selectable: false,
      })),
    [episodes, completedEpisodeIds, onEpisodeSelect]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.sourceEpisodeId,
        target: e.targetEpisodeId,
      })),
    [edges]
  );

  const sortedEpisodes = useMemo(
    () => [...episodes].sort((a, b) => a.sortOrder - b.sortOrder),
    [episodes]
  );

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>
            {completedCount} of {episodes.length} episodes completed
          </span>
          <span>{progress}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {pathType === 'graph' ? (
        /* Graph Mode — Read-only ReactFlow */
        <div className="h-[600px] border rounded">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      ) : (
        /* Linear Mode — Vertical step list */
        <div className="space-y-2 max-w-2xl mx-auto">
          {sortedEpisodes.map((ep, index) => {
            const isCompleted = completedEpisodeIds.has(ep.id);
            return (
              <button
                key={ep.id}
                onClick={() => onEpisodeSelect(ep.id, ep.podcastId ?? '')}
                className={`w-full flex items-center gap-3 p-4 border rounded-lg text-left transition-colors hover:bg-accent ${
                  isCompleted ? 'border-green-500 bg-green-50' : ''
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium">
                  {index + 1}. {ep.title}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
