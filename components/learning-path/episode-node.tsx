'use client';

/**
 * Custom ReactFlow node component for episodes in the graph editor.
 *
 * Displays episode title, node type badge, optional play button,
 * and source/target connection handles.
 */
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Node } from '@xyflow/react';

const nodeColors: Record<string, string> = {
  start: 'bg-green-500',
  default: 'bg-blue-500',
  milestone: 'bg-yellow-500',
  end: 'bg-red-500',
};

const nodeBorderColors: Record<string, string> = {
  start: 'border-green-500',
  default: 'border-blue-500',
  milestone: 'border-yellow-500',
  end: 'border-red-500',
};

export interface EpisodeNodeData {
  title: string;
  nodeType: 'start' | 'default' | 'milestone' | 'end';
  completed?: boolean;
  onPlay?: () => void;
  [key: string]: unknown;
}

type EpisodeNodeType = Node<EpisodeNodeData, 'episode'>;

export function EpisodeNode({ data }: NodeProps<EpisodeNodeType>) {
  const borderColor = data.completed
    ? 'border-green-500 border-2'
    : (nodeBorderColors[data.nodeType] ?? 'border-blue-500');

  return (
    <div className={`rounded-lg border ${borderColor} bg-card p-3 shadow-sm min-w-[180px]`}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{data.title}</span>
        <Badge className={nodeColors[data.nodeType]}>{data.nodeType}</Badge>
      </div>
      {data.completed && <div className="text-green-600 text-xs mt-1 font-medium">Completed</div>}
      {data.onPlay && (
        <Button
          size="icon"
          variant="ghost"
          className="mt-1"
          onClick={data.onPlay}
          aria-label={`Play ${data.title}`}
        >
          <Play className="h-4 w-4" />
        </Button>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
