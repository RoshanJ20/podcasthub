/**
 * Unit tests for auto-save error toast in LinearEditor and GraphEditor.
 *
 * Verifies that when the Zustand store's lastSaveError changes,
 * a toast.error is shown to the user.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useGraphEditorStore } from '@/stores/graph-editor-store';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/* Mock dnd-kit to avoid complex rendering issues */
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: 'vertical',
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
  arrayMove: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => null } },
}));

vi.mock('@/hooks/use-unsaved-changes-warning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/hooks/use-file-upload', () => ({
  useFileUpload: () => ({
    upload: vi.fn(),
    isUploading: false,
    progress: 0,
    error: null,
  }),
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reactflow">{children}</div>
  ),
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
}));

vi.mock('@/components/learning-path/episode-node', () => ({
  EpisodeNode: () => null,
}));

vi.mock('@/components/learning-path/episode-sidebar', () => ({
  EpisodeSidebar: () => null,
}));

vi.mock('@/components/learning-path/auto-save-status', () => ({
  AutoSaveStatus: () => <span>AutoSaveStatus</span>,
}));

describe('LinearEditor auto-save error toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGraphEditorStore.setState({
      nodes: [],
      edges: [],
      isDirty: false,
      isSaving: false,
      lastSaveError: null,
      autoSaveGraphId: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows error toast when lastSaveError is set', async () => {
    const { LinearEditor } = await import('@/components/learning-path/linear-editor');

    render(<LinearEditor graphId="graph-1" />);

    act(() => {
      useGraphEditorStore.setState({ lastSaveError: 'Save failed (500): Internal Server Error' });
    });

    expect(toast.error).toHaveBeenCalledWith('Save failed (500): Internal Server Error');
  });

  it('does not show toast when lastSaveError is cleared', async () => {
    const { LinearEditor } = await import('@/components/learning-path/linear-editor');

    /* Start with an error */
    useGraphEditorStore.setState({ lastSaveError: 'Previous error' });

    render(<LinearEditor graphId="graph-1" />);

    vi.clearAllMocks();

    act(() => {
      useGraphEditorStore.setState({ lastSaveError: null });
    });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows toast for each new distinct error', async () => {
    const { LinearEditor } = await import('@/components/learning-path/linear-editor');

    render(<LinearEditor graphId="graph-1" />);

    act(() => {
      useGraphEditorStore.setState({ lastSaveError: 'Error one' });
    });

    expect(toast.error).toHaveBeenCalledWith('Error one');

    vi.clearAllMocks();

    act(() => {
      useGraphEditorStore.setState({ lastSaveError: 'Error two' });
    });

    expect(toast.error).toHaveBeenCalledWith('Error two');
  });
});

describe('GraphEditor auto-save error toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGraphEditorStore.setState({
      nodes: [],
      edges: [],
      isDirty: false,
      isSaving: false,
      lastSaveError: null,
      selectedNodeId: null,
      autoSaveGraphId: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows error toast when lastSaveError is set', async () => {
    const { GraphEditor } = await import('@/components/learning-path/graph-editor');

    render(<GraphEditor graphId="graph-1" />);

    act(() => {
      useGraphEditorStore.setState({ lastSaveError: 'Network timeout' });
    });

    expect(toast.error).toHaveBeenCalledWith('Network timeout');
  });

  it('does not re-fire toast for the same error value', async () => {
    const { GraphEditor } = await import('@/components/learning-path/graph-editor');

    render(<GraphEditor graphId="graph-1" />);

    act(() => {
      useGraphEditorStore.setState({ lastSaveError: 'Same error' });
    });

    expect(toast.error).toHaveBeenCalledTimes(1);

    /* Setting the same error again should not fire another toast */
    act(() => {
      useGraphEditorStore.setState({ lastSaveError: 'Same error' });
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
