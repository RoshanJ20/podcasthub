'use client';

/**
 * Visual graph editor for learning paths using @xyflow/react.
 *
 * Renders episodes as nodes and connections as edges in a draggable canvas.
 * Supports connecting nodes, auto-layout via dagre, and saving to API.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { ReactFlow, Background, Controls, MiniMap, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphEditorStore } from '@/stores/graph-editor-store';
import { EpisodeNode } from './episode-node';
import { EpisodeSidebar } from './episode-sidebar';
import { Button } from '@/components/ui/button';
import { LayoutGrid } from 'lucide-react';
import { AutoSaveStatus } from '@/components/learning-path/auto-save-status';

const nodeTypes = { episode: EpisodeNode };

interface GraphEditorProps {
  graphId: string;
}

export function GraphEditor({ graphId: _graphId }: GraphEditorProps) {
  const { nodes, edges, isDirty, addEdge, removeNode, removeEdge, setLayout, setSelectedNode } =
    useGraphEditorStore();

  useUnsavedChangesWarning(isDirty);

  /* Show toast when auto-save encounters an error */
  const lastSaveError = useGraphEditorStore((s) => s.lastSaveError);
  const prevErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSaveError && lastSaveError !== prevErrorRef.current) {
      toast.error(lastSaveError);
    }
    prevErrorRef.current = lastSaveError;
  }, [lastSaveError]);

  const rfNodes = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: 'episode' as const,
        position: { x: n.positionX, y: n.positionY },
        data: { title: n.title, nodeType: n.nodeType },
      })),
    [nodes]
  );

  const rfEdges = useMemo(
    () => edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    [edges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdge({
          id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          source: connection.source,
          target: connection.target,
        });
      }
    },
    [addEdge]
  );

  const onNodesDelete = useCallback(
    (deletedNodes: { id: string }[]) => {
      deletedNodes.forEach((n) => removeNode(n.id));
    },
    [removeNode]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: { id: string }[]) => {
      deletedEdges.forEach((e) => removeEdge(e.id));
    },
    [removeEdge]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  return (
    <div className="flex h-[calc(100vh-200px)]">
      <div className="flex-1 relative">
        <div className="absolute top-2 left-2 z-10">
          <AutoSaveStatus />
        </div>
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button variant="outline" size="sm" onClick={setLayout}>
            <LayoutGrid className="h-4 w-4 mr-1" /> Auto Layout
          </Button>
        </div>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <EpisodeSidebar />
    </div>
  );
}
