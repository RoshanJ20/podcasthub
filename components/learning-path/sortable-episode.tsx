/**
 * SortableEpisode — a single draggable, expandable episode card for the LinearEditor.
 *
 * Wraps a GraphNode in a @dnd-kit sortable container. When collapsed it shows
 * a drag handle, the episode number/title, and a remove button. When expanded
 * it reveals editable fields for title, audio file, thumbnail image, description,
 * and transcript, including upload progress and a thumbnail crop dialog.
 *
 * Key responsibilities:
 * - Provide dnd-kit drag-and-drop via useSortable.
 * - Handle audio file uploads via useFileUpload.
 * - Handle thumbnail selection, cropping (ThumbnailCropDialog), and upload.
 * - Emit field changes back to the parent via onUpdate.
 *
 * Dependencies:
 * - @dnd-kit/sortable — useSortable, CSS transform utilities
 * - hooks/use-file-upload — upload state and progress
 * - components/admin/thumbnail-crop-dialog — image crop modal
 * - stores/graph-editor-store — GraphNode type
 */
'use client';

import { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GraphNode } from '@/stores/graph-editor-store';
import { useFileUpload } from '@/hooks/use-file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, GripVertical, Trash2, Upload } from 'lucide-react';
import { ThumbnailCropDialog } from '@/components/admin/thumbnail-crop-dialog';

interface SortableEpisodeProps {
  /** The graph node (episode) to render. */
  node: GraphNode;
  /** 0-based position in the list, used for the "N. Title" display. */
  index: number;
  /** Whether the edit fields below the header are visible. */
  isExpanded: boolean;
  /** Called when the user clicks the header to toggle expanded state. */
  onToggle: () => void;
  /** Called when the user clicks the remove (trash) button. */
  onRemove: () => void;
  /** Called with a partial GraphNode whenever any field changes. */
  onUpdate: (updates: Partial<GraphNode>) => void;
}

/**
 * A drag-and-drop sortable episode card used inside the LinearEditor.
 *
 * @param props - See SortableEpisodeProps.
 * @returns A bordered card with a drag handle, collapse toggle, and optional edit fields.
 */
export function SortableEpisode({
  node,
  index,
  isExpanded,
  onToggle,
  onRemove,
  onUpdate,
}: SortableEpisodeProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const audioUpload = useFileUpload();
  const thumbnailUpload = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  /**
   * Uploads the selected audio file and stores the returned storage key on the node.
   *
   * @param e - The file input change event.
   */
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = await audioUpload.upload(file, 'audio');
    if (key) {
      onUpdate({ audioUrl: key });
    }
  };

  /**
   * Opens a temporary object URL for the selected thumbnail so the crop dialog can display it.
   *
   * @param e - The file input change event.
   */
  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawImageSrc(URL.createObjectURL(file));
    setCropOpen(true);
    // Reset value so the same file can be re-selected after cancellation.
    e.target.value = '';
  };

  /**
   * Uploads the cropped thumbnail file and stores the returned storage key on the node.
   *
   * @param croppedFile - The cropped image file produced by ThumbnailCropDialog.
   */
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
