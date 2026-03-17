'use client';

/**
 * Linear path editor for learning paths using @dnd-kit sortable.
 *
 * Provides a drag-to-reorder list of episodes with expandable edit cards,
 * add/remove controls, and auto-generates edges based on sort order when saving.
 *
 * Key responsibilities:
 * - Render a DndContext + SortableContext wrapping the episode list.
 * - Manage which episode is currently expanded (by ID + stable index ref).
 * - Handle drag-end reordering and schedule an auto-save via scheduleAutoSave.
 * - Provide an "Add Episode" action that appends a temporary node and expands it.
 * - Surface auto-save errors as toast notifications.
 *
 * Dependencies:
 * - stores/graph-editor-store — nodes, isDirty, CRUD actions, scheduleAutoSave
 * - hooks/use-unsaved-changes-warning — browser beforeunload guard when isDirty
 * - components/learning-path/sortable-episode — individual draggable episode card
 * - components/learning-path/auto-save-status — save-state indicator in the toolbar
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useGraphEditorStore } from '@/stores/graph-editor-store';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { scheduleAutoSave } from '@/stores/graph-editor-store';
import { AutoSaveStatus } from '@/components/learning-path/auto-save-status';
import { SortableEpisode } from '@/components/learning-path/sortable-episode';

interface LinearEditorProps {
  graphId: string;
}

export function LinearEditor({ graphId: _graphId }: LinearEditorProps) {
  const { nodes, isDirty, addNode, removeNode, updateNode } = useGraphEditorStore();
  const store = useGraphEditorStore;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedIndexRef = useRef<number>(-1);

  /* Keep expandedId in sync after auto-save reconciles temp→real IDs */
  useEffect(() => {
    if (expandedIndexRef.current >= 0 && expandedIndexRef.current < nodes.length) {
      const currentNodeId = nodes[expandedIndexRef.current].id;
      if (currentNodeId !== expandedId) {
        setExpandedId(currentNodeId);
      }
    }
  }, [nodes, expandedId]);

  const setExpanded = useCallback(
    (id: string | null) => {
      setExpandedId(id);
      expandedIndexRef.current = id ? store.getState().nodes.findIndex((n) => n.id === id) : -1;
    },
    [store]
  );

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const state = store.getState();
        const oldIndex = state.nodes.findIndex((n) => n.id === active.id);
        const newIndex = state.nodes.findIndex((n) => n.id === over.id);
        store.setState({ nodes: arrayMove(state.nodes, oldIndex, newIndex), isDirty: true });
        scheduleAutoSave();
      }
    },
    [store]
  );

  const handleAddEpisode = () => {
    const id = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    addNode({
      id,
      title: 'New Episode',
      nodeType: 'default',
      podcastId: '',
      positionX: 0,
      positionY: 0,
    });
    setExpanded(id);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Episodes</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddEpisode}>
            <Plus className="h-4 w-4 mr-1" /> Add Episode
          </Button>
          <AutoSaveStatus />
        </div>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {nodes.map((node, index) => (
            <SortableEpisode
              key={node.id}
              node={node}
              index={index}
              isExpanded={expandedId === node.id}
              onToggle={() => setExpanded(expandedId === node.id ? null : node.id)}
              onRemove={() => {
                removeNode(node.id);
                if (expandedId === node.id) setExpanded(null);
              }}
              onUpdate={(updates) => updateNode(node.id, updates)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {nodes.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No episodes yet. Click &quot;Add Episode&quot; to begin.
        </p>
      )}
    </div>
  );
}
