/**
 * Hook that warns users before navigating away when there are unsaved changes.
 *
 * Attaches a `beforeunload` event listener to the window when `shouldWarn`
 * is true. The browser will display a confirmation dialog before the page
 * unloads, giving the user a chance to cancel navigation and save their work.
 *
 * @example
 * ```tsx
 * const isDirty = useGraphEditorStore((s) => s.isDirty);
 * useUnsavedChangesWarning(isDirty);
 * ```
 */
'use client';

import { useEffect } from 'react';

/**
 * Registers a `beforeunload` listener when unsaved changes are present.
 *
 * @param shouldWarn - Whether the warning should be active. When `true`,
 *   navigating away or closing the tab triggers a browser-native confirmation.
 */
export function useUnsavedChangesWarning(shouldWarn: boolean): void {
  useEffect(() => {
    if (!shouldWarn) return;

    const handler = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldWarn]);
}
