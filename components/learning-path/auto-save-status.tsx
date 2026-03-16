'use client';

/**
 * Auto-save status indicator for learning path editors.
 *
 * Displays one of four states based on the graph editor store:
 * - Saving... (spinner) — save is in progress
 * - Save failed (alert) — last save attempt errored
 * - Unsaved changes (dot) — local mutations not yet persisted
 * - Saved (checkmark) — all changes persisted successfully
 *
 * Priority order: saving > error > dirty > saved.
 */
import { useGraphEditorStore } from '@/stores/graph-editor-store';
import { CheckCircle2, AlertCircle, Loader2, Circle } from 'lucide-react';

/**
 * Renders the current auto-save status as an icon + label.
 *
 * @returns A status indicator element reflecting the store's save state.
 */
export function AutoSaveStatus() {
  const { isSaving, isDirty, lastSaveError } = useGraphEditorStore();

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (lastSaveError) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Save failed</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-yellow-600">
        <Circle className="h-3.5 w-3.5" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-green-600">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>Saved</span>
    </div>
  );
}
