/**
 * Unit tests for the GraphEditorInitializer component.
 *
 * Verifies that it loads episodes/edges into the store on mount,
 * sets the autoSaveGraphId, and cleans up on unmount.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useGraphEditorStore } from '@/stores/graph-editor-store';
import { GraphEditorInitializer } from '@/components/learning-path/graph-editor-initializer';

const mockEpisodes = [
  {
    id: 'ep-1',
    title: 'Episode One',
    nodeType: 'start',
    positionX: 0,
    positionY: 0,
    audioUrl: null,
    thumbnailUrl: null,
    description: 'First episode',
    transcript: 'Hello world',
  },
];

const mockEdges = [
  {
    id: 'edge-1',
    sourceEpisodeId: 'ep-1',
    targetEpisodeId: 'ep-2',
  },
];

describe('GraphEditorInitializer', () => {
  beforeEach(() => {
    useGraphEditorStore.getState().reset();
  });

  it('calls loadFromApi with mapped nodes and edges on mount', () => {
    const loadFromApiSpy = vi.spyOn(useGraphEditorStore.getState(), 'loadFromApi');

    render(
      <GraphEditorInitializer graphId="graph-123" episodes={mockEpisodes} edges={mockEdges} />
    );

    expect(loadFromApiSpy).toHaveBeenCalledTimes(1);

    const [nodes, edges] = loadFromApiSpy.mock.calls[0];
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('ep-1');
    expect(nodes[0].title).toBe('Episode One');
    expect(nodes[0].nodeType).toBe('start');

    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('ep-1');
    expect(edges[0].target).toBe('ep-2');
  });

  it('sets autoSaveGraphId on mount', () => {
    render(
      <GraphEditorInitializer graphId="graph-456" episodes={mockEpisodes} edges={mockEdges} />
    );

    expect(useGraphEditorStore.getState().autoSaveGraphId).toBe('graph-456');
  });

  it('clears autoSaveGraphId and resets store on unmount', () => {
    const { unmount } = render(
      <GraphEditorInitializer graphId="graph-789" episodes={mockEpisodes} edges={mockEdges} />
    );

    expect(useGraphEditorStore.getState().autoSaveGraphId).toBe('graph-789');

    unmount();

    expect(useGraphEditorStore.getState().autoSaveGraphId).toBeNull();
    expect(useGraphEditorStore.getState().nodes).toHaveLength(0);
    expect(useGraphEditorStore.getState().edges).toHaveLength(0);
  });

  it('renders nothing (returns null)', () => {
    const { container } = render(
      <GraphEditorInitializer graphId="graph-123" episodes={mockEpisodes} edges={mockEdges} />
    );

    expect(container.innerHTML).toBe('');
  });
});
