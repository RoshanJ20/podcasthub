/**
 * Unit tests for the AutoSaveStatus component.
 *
 * Verifies correct rendering of each auto-save state:
 * saving, saved, error, and unsaved changes (dirty).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useGraphEditorStore } from '@/stores/graph-editor-store';
import { AutoSaveStatus } from '@/components/learning-path/auto-save-status';

describe('AutoSaveStatus', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useGraphEditorStore.setState({
      isSaving: false,
      isDirty: false,
      lastSaveError: null,
    });
  });

  it('renders "Saving..." when isSaving is true', () => {
    useGraphEditorStore.setState({ isSaving: true });

    render(<AutoSaveStatus />);

    expect(screen.getByText('Saving...')).toBeDefined();
  });

  it('renders "Saved" when not saving, not dirty, and no error', () => {
    useGraphEditorStore.setState({
      isSaving: false,
      isDirty: false,
      lastSaveError: null,
    });

    render(<AutoSaveStatus />);

    expect(screen.getByText('Saved')).toBeDefined();
  });

  it('renders "Save failed" when lastSaveError is set', () => {
    useGraphEditorStore.setState({
      isSaving: false,
      lastSaveError: 'Network error',
    });

    render(<AutoSaveStatus />);

    expect(screen.getByText('Save failed')).toBeDefined();
  });

  it('renders "Unsaved changes" when isDirty is true and no error', () => {
    useGraphEditorStore.setState({
      isSaving: false,
      isDirty: true,
      lastSaveError: null,
    });

    render(<AutoSaveStatus />);

    expect(screen.getByText('Unsaved changes')).toBeDefined();
  });

  it('prioritises saving state over dirty state', () => {
    useGraphEditorStore.setState({
      isSaving: true,
      isDirty: true,
      lastSaveError: null,
    });

    render(<AutoSaveStatus />);

    expect(screen.getByText('Saving...')).toBeDefined();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('prioritises saving state over error state', () => {
    useGraphEditorStore.setState({
      isSaving: true,
      lastSaveError: 'Previous error',
    });

    render(<AutoSaveStatus />);

    expect(screen.getByText('Saving...')).toBeDefined();
    expect(screen.queryByText('Save failed')).toBeNull();
  });

  it('prioritises error state over dirty state', () => {
    useGraphEditorStore.setState({
      isSaving: false,
      isDirty: true,
      lastSaveError: 'Save failed (500)',
    });

    render(<AutoSaveStatus />);

    expect(screen.getByText('Save failed')).toBeDefined();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });
});
