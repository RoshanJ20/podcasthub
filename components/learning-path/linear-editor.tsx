'use client';

/**
 * Linear path editor for learning paths using @dnd-kit sortable.
 *
 * Provides a drag-to-reorder list of episodes, with add/remove controls.
 * Auto-generates edges based on sort order when saving.
 */
import { useCallback } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGraphEditorStore } from '@/stores/graph-editor-store';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';

interface LinearEditorProps {
  graphId: string;
}

function SortableEpisode({
  id,
  title,
  onRemove,
}: {
  id: string;
  title: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border rounded bg-card mb-2"
    >
      <button {...attributes} {...listeners} className="cursor-grab" aria-label="Drag to reorder">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="flex-1 text-sm">{title}</span>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${title}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function LinearEditor({ graphId }: LinearEditorProps) {
  const { nodes, isDirty, addNode, removeNode, save } = useGraphEditorStore();
  const store = useGraphEditorStore;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const state = store.getState();
        const oldIndex = state.nodes.findIndex((n) => n.id === active.id);
        const newIndex = state.nodes.findIndex((n) => n.id === over.id);
        store.setState({ nodes: arrayMove(state.nodes, oldIndex, newIndex), isDirty: true });
      }
    },
    [store]
  );

  const handleAddEpisode = () => {
    addNode({
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'New Episode',
      nodeType: 'default',
      podcastId: '',
      positionX: 0,
      positionY: 0,
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Linear Path</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddEpisode}>
            <Plus className="h-4 w-4 mr-1" /> Add Episode
          </Button>
          <Button size="sm" onClick={() => save(graphId)} disabled={!isDirty}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {isDirty && (
        <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm mb-4">
          Unsaved changes
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {nodes.map((node, index) => (
            <SortableEpisode
              key={node.id}
              id={node.id}
              title={`${index + 1}. ${node.title}`}
              onRemove={() => removeNode(node.id)}
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
