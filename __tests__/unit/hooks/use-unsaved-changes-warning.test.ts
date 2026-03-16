/**
 * Unit tests for the useUnsavedChangesWarning hook.
 *
 * Verifies that the hook adds and removes a beforeunload event listener
 * based on the shouldWarn parameter.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

describe('useUnsavedChangesWarning', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('adds a beforeunload listener when shouldWarn is true', () => {
    renderHook(() => useUnsavedChangesWarning(true));

    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === 'beforeunload'
    );
    expect(beforeUnloadCalls).toHaveLength(1);
    expect(typeof beforeUnloadCalls[0][1]).toBe('function');
  });

  it('does not add a beforeunload listener when shouldWarn is false', () => {
    renderHook(() => useUnsavedChangesWarning(false));

    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === 'beforeunload'
    );
    expect(beforeUnloadCalls).toHaveLength(0);
  });

  it('removes the beforeunload listener on cleanup', () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));

    unmount();

    const removeBeforeUnloadCalls = removeSpy.mock.calls.filter(
      ([event]: [string, ...unknown[]]) => event === 'beforeunload'
    );
    expect(removeBeforeUnloadCalls).toHaveLength(1);
  });

  it('removes the old listener and adds a new one when shouldWarn changes from true to false', () => {
    const { rerender } = renderHook(
      ({ shouldWarn }: { shouldWarn: boolean }) => useUnsavedChangesWarning(shouldWarn),
      { initialProps: { shouldWarn: true } }
    );

    /* Listener was added on initial render. */
    expect(
      addSpy.mock.calls.filter(([event]: [string, ...unknown[]]) => event === 'beforeunload')
    ).toHaveLength(1);

    rerender({ shouldWarn: false });

    /* The cleanup from the previous effect should have removed the listener. */
    expect(
      removeSpy.mock.calls.filter(([event]: [string, ...unknown[]]) => event === 'beforeunload')
    ).toHaveLength(1);

    /* No new listener should have been added for shouldWarn=false. */
    expect(
      addSpy.mock.calls.filter(([event]: [string, ...unknown[]]) => event === 'beforeunload')
    ).toHaveLength(1);
  });

  it('calls preventDefault on the beforeunload event', () => {
    renderHook(() => useUnsavedChangesWarning(true));

    const handler = addSpy.mock.calls.find(
      ([event]: [string, ...unknown[]]) => event === 'beforeunload'
    )?.[1] as EventListener;

    const mockEvent = new Event('beforeunload', { cancelable: true });
    const preventDefaultSpy = vi.spyOn(mockEvent, 'preventDefault');

    handler(mockEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
