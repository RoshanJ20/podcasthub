'use client';

/**
 * Episode sidebar for the graph editor.
 *
 * Provides controls to add new episodes, edit selected episodes
 * (title, node type), remove episodes, and view all episodes in a list.
 */
import { useGraphEditorStore, type GraphNode } from '@/stores/graph-editor-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

let nextTempId = 0;
function generateTempId(): string {
  nextTempId++;
  return `temp-${nextTempId}-${Date.now()}`;
}

export function EpisodeSidebar() {
  const { nodes, selectedNodeId, addNode, updateNode, removeNode, setSelectedNode } =
    useGraphEditorStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleAddEpisode = () => {
    addNode({
      id: generateTempId(),
      title: 'New Episode',
      nodeType: 'default',
      podcastId: '',
      positionX: Math.random() * 400,
      positionY: Math.random() * 400,
    });
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
