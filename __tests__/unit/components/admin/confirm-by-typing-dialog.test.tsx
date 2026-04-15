/**
 * Unit tests for components/admin/confirm-by-typing-dialog.tsx.
 *
 * Verifies that the destructive button stays disabled until the typed input
 * exactly matches expectedText, that the confirm callback fires on click,
 * and that the cancel path bails out without calling onConfirm.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConfirmByTypingDialog } from '@/components/admin/confirm-by-typing-dialog';

function renderDialog(overrides: Partial<React.ComponentProps<typeof ConfirmByTypingDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmByTypingDialog
      open
      onOpenChange={onOpenChange}
      title="Delete permanently?"
      description="This cannot be undone."
      expectedText="My Audit Brief"
      onConfirm={onConfirm}
      {...overrides}
    />
  );
  return { onOpenChange, onConfirm };
}

describe('ConfirmByTypingDialog', () => {
  it('disables the confirm button until the input exactly matches', async () => {
    const { onConfirm } = renderDialog();

    const confirmButton = screen.getByRole('button', { name: /delete permanently/i });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByLabelText(/type/i);
    await userEvent.type(input, 'My Audit Bri');
    expect(confirmButton).toBeDisabled();

    await userEvent.type(input, 'ef');
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    cleanup();
  });

  it('does not call onConfirm when the user cancels', async () => {
    const { onConfirm, onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    cleanup();
  });

  it('treats the match case-sensitively', async () => {
    renderDialog({ expectedText: 'EXACT' });
    const input = screen.getByLabelText(/type/i);
    const confirmButton = screen.getByRole('button', { name: /delete permanently/i });

    await userEvent.type(input, 'exact');
    expect(confirmButton).toBeDisabled();
    cleanup();
  });
});
