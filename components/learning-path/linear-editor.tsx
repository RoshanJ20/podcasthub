'use client';

/**
 * Linear path editor for learning paths using @dnd-kit sortable.
 *
 * Provides a drag-to-reorder list of episodes with expandable edit cards,
 * add/remove controls, and auto-generates edges based on sort order when saving.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGraphEditorStore, type GraphNode } from '@/stores/graph-editor-store';
import { useFileUpload } from '@/hooks/use-file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, Upload } from 'lucide-react';
import { scheduleAutoSave } from '@/stores/graph-editor-store';
import { AutoSaveStatus } from '@/components/learning-path/auto-save-status';
import { ThumbnailCropDialog } from '@/components/admin/thumbnail-crop-dialog';

interface LinearEditorProps {
  graphId: string;
}

function SortableEpisode({
  node,
  index,
  isExpanded,
  onToggle,
  onRemove,
  onUpdate,
}: {
  node: GraphNode;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<GraphNode>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const audioUpload = useFileUpload();
  const thumbnailUpload = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = await audioUpload.upload(file, 'audio');
    if (key) {
      onUpdate({ audioUrl: key });
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawImageSrc(URL.createObjectURL(file));
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCroppedThumbnail = async (croppedFile: File) => {
    setCropOpen(false);
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
    const key = await thumbnailUpload.upload(croppedFile, 'image');
    if (key) {
      onUpdate({ thumbnailUrl: key });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded bg-card mb-2">
      <div className="flex items-center gap-2 p-3">
        <button {...attributes} {...listeners} className="cursor-grab" aria-label="Drag to reorder">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          className="flex-1 flex items-center gap-2 text-left"
          onClick={onToggle}
          aria-label={isExpanded ? 'Collapse episode' : 'Expand episode'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="flex-1 text-sm font-medium">
            {index + 1}. {node.title}
          </span>
        </button>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${node.title}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label htmlFor={`ep-title-${node.id}`} className="text-xs">
              Title
            </Label>
            <Input
              id={`ep-title-${node.id}`}
              value={node.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Audio File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioUpload}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={audioUpload.isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {node.audioUrl ? 'Replace Audio File' : 'Upload Audio File'}
            </Button>
            {audioUpload.isUploading && (
              <p className="text-xs text-muted-foreground">Uploading... {audioUpload.progress}%</p>
            )}
            {audioUpload.error && <p className="text-xs text-destructive">{audioUpload.error}</p>}
            {node.audioUrl && (
              <p className="text-xs text-green-600">
                Audio uploaded: {node.audioUrl.split('/').pop()}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Thumbnail Image</Label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailSelect}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={thumbnailUpload.isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {node.thumbnailUrl ? 'Replace Thumbnail' : 'Upload Thumbnail'}
            </Button>
            {thumbnailUpload.isUploading && (
              <p className="text-xs text-muted-foreground">
                Uploading... {thumbnailUpload.progress}%
              </p>
            )}
            {thumbnailUpload.error && (
              <p className="text-xs text-destructive">{thumbnailUpload.error}</p>
            )}
            {node.thumbnailUrl && (
              <p className="text-xs text-green-600">
                Thumbnail uploaded: {node.thumbnailUrl.split('/').pop()}
              </p>
            )}
            <ThumbnailCropDialog
              imageSrc={rawImageSrc}
              open={cropOpen}
              onCrop={handleCroppedThumbnail}
              onCancel={() => {
                setCropOpen(false);
                if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
                setRawImageSrc(null);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`ep-desc-${node.id}`} className="text-xs">
              Description
            </Label>
            <Textarea
              id={`ep-desc-${node.id}`}
              rows={2}
              placeholder="Episode description"
              value={node.description ?? ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`ep-transcript-${node.id}`} className="text-xs">
              Transcript
            </Label>
            <Textarea
              id={`ep-transcript-${node.id}`}
              rows={3}
              placeholder="Paste transcript..."
              value={node.transcript ?? ''}
              onChange={(e) => onUpdate({ transcript: e.target.value })}
              className="resize-none font-mono text-xs h-24 overflow-y-auto"
            />
            {node.transcript && (
              <p className="text-xs text-muted-foreground">{node.transcript.length} chars</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
