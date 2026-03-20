'use client';

/**
 * Episode sidebar for the graph editor.
 *
 * Provides controls to add new episodes, edit selected episodes
 * (title, node type, audio file, thumbnail image, description, transcript),
 * remove episodes, and view all episodes in a list.
 */
import { useRef } from 'react';
import { useGraphEditorStore, type GraphNode } from '@/stores/graph-editor-store';
import { useFileUpload } from '@/hooks/use-file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload, FileText } from 'lucide-react';

let nextTempId = 0;
function generateTempId(): string {
  nextTempId++;
  return `temp-${nextTempId}-${Date.now()}`;
}

export function EpisodeSidebar() {
  const { nodes, selectedNodeId, addNode, updateNode, removeNode, setSelectedNode } =
    useGraphEditorStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const audioUpload = useFileUpload();
  const thumbnailUpload = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const transcriptInputRef = useRef<HTMLInputElement>(null);

  const handleAddEpisode = () => {
    addNode({
      id: generateTempId(),
      title: 'New Episode',
      nodeType: 'default',
      auditBriefId: '',
      positionX: Math.random() * 400,
      positionY: Math.random() * 400,
    });
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;
    const key = await audioUpload.upload(file, 'audio');
    if (key) {
      updateNode(selectedNode.id, { audioUrl: key });
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;
    const key = await thumbnailUpload.upload(file, 'image');
    if (key) {
      updateNode(selectedNode.id, { thumbnailUrl: key });
    }
  };

  const handleTranscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;
    const text = await file.text();
    updateNode(selectedNode.id, { transcript: text });
  };

  return (
    <div className="w-[300px] border-l bg-muted/30 p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Episodes</h3>

      {/* Add Episode section */}
      <div className="mb-6">
        <Button className="w-full" onClick={handleAddEpisode}>
          <Plus className="h-4 w-4 mr-1" /> Add Episode
        </Button>
      </div>

      {/* Selected Node Editor */}
      {selectedNode && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium">Edit Episode</h4>
          <div className="space-y-2">
            <Label htmlFor="node-title">Title</Label>
            <Input
              id="node-title"
              value={selectedNode.title}
              onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="node-type">Type</Label>
            <Select
              value={selectedNode.nodeType}
              onValueChange={(v) =>
                updateNode(selectedNode.id, { nodeType: v as GraphNode['nodeType'] })
              }
            >
              <SelectTrigger id="node-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Start</SelectItem>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="end">End</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Audio File</Label>
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
              {selectedNode.audioUrl ? 'Replace Audio File' : 'Upload Audio File'}
            </Button>
            {audioUpload.isUploading && (
              <p className="text-xs text-muted-foreground">Uploading... {audioUpload.progress}%</p>
            )}
            {audioUpload.error && <p className="text-xs text-destructive">{audioUpload.error}</p>}
            {selectedNode.audioUrl && (
              <p className="text-xs text-green-600">
                Audio uploaded: {selectedNode.audioUrl.split('/').pop()}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Thumbnail Image</Label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailUpload}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={thumbnailUpload.isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {selectedNode.thumbnailUrl ? 'Replace Thumbnail' : 'Upload Thumbnail'}
            </Button>
            {thumbnailUpload.isUploading && (
              <p className="text-xs text-muted-foreground">
                Uploading... {thumbnailUpload.progress}%
              </p>
            )}
            {thumbnailUpload.error && (
              <p className="text-xs text-destructive">{thumbnailUpload.error}</p>
            )}
            {selectedNode.thumbnailUrl && (
              <p className="text-xs text-green-600">
                Thumbnail uploaded: {selectedNode.thumbnailUrl.split('/').pop()}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="node-description">Description</Label>
            <Textarea
              id="node-description"
              rows={3}
              placeholder="Episode description"
              value={selectedNode.description ?? ''}
              onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Transcript</Label>
            <input
              ref={transcriptInputRef}
              type="file"
              accept=".txt,.srt,.vtt,.md"
              className="hidden"
              onChange={handleTranscriptUpload}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => transcriptInputRef.current?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              {selectedNode.transcript ? 'Replace Transcript' : 'Upload Transcript'}
            </Button>
            {selectedNode.transcript && (
              <p className="text-xs text-green-600">
                Transcript loaded ({selectedNode.transcript.length} chars)
              </p>
            )}
          </div>
          <Button variant="destructive" size="sm" onClick={() => removeNode(selectedNode.id)}>
            <Trash2 className="h-4 w-4 mr-1" /> Remove
          </Button>
        </div>
      )}

      {/* Node List */}
      <div className="mt-4 border-t pt-4">
        <h4 className="font-medium mb-2">All Episodes ({nodes.length})</h4>
        <ul className="space-y-1">
          {nodes.map((n) => (
            <li
              key={n.id}
              className={`text-sm p-2 rounded cursor-pointer hover:bg-accent ${
                n.id === selectedNodeId ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedNode(n.id)}
            >
              {n.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
