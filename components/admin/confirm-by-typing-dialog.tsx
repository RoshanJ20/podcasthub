/**
 * Shared "type the name to confirm" destructive confirmation dialog.
 *
 * Used for permanent hard-delete actions on audit briefs and learning graphs
 * so a misclicked dropdown cannot irrecoverably purge content. The user must
 * type the full expected text (typically the entity title) to enable the
 * destructive button.
 *
 * @example
 * <ConfirmByTypingDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete permanently"
 *   description="This cannot be undone."
 *   expectedText={brief.title}
 *   onConfirm={handleHardDelete}
 * />
 */
'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Props accepted by ConfirmByTypingDialog. */
export interface ConfirmByTypingDialogProps {
  /** Controls visibility. Mirrors the pattern used elsewhere in components/admin. */
  open: boolean;
  /** Called when the dialog requests to be opened or closed. */
  onOpenChange: (open: boolean) => void;
  /** Dialog heading shown to the user. */
  title: string;
  /** Dialog body copy explaining the destructive action. */
  description: string;
  /** The exact text the user must type to enable the confirm button. */
  expectedText: string;
  /** Confirm button label; defaults to "Delete permanently". */
  confirmLabel?: string;
  /** Callback invoked when the user confirms. May be async; the dialog
   *  shows a loading state until the promise resolves or rejects. */
  onConfirm: () => void | Promise<void>;
}

/**
 * Renders a dialog that requires the user to type `expectedText` verbatim
 * before the destructive confirm button becomes clickable.
 */
export function ConfirmByTypingDialog({
  open,
  onOpenChange,
  title,
  description,
  expectedText,
  confirmLabel = 'Delete permanently',
  onConfirm,
}: ConfirmByTypingDialogProps) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset local state whenever the dialog opens or closes so a reopen is clean.
  useEffect(() => {
    if (!open) {
      setTyped('');
      setBusy(false);
    }
  }, [open]);

  const matches = typed === expectedText;

  const handleConfirm = async (): Promise<void> => {
    if (!matches || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-by-typing-input">
            Type <span className="font-mono font-semibold">{expectedText}</span> to confirm
          </Label>
          <Input
            id="confirm-by-typing-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            disabled={busy}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!matches || busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
