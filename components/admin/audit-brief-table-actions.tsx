/**
 * Action dropdown menu for individual audit brief rows in the admin table.
 *
 * Provides Edit, View, Archive/Unarchive, and Delete-permanently actions.
 * Archive toggles isArchived via DELETE (soft) / PUT (restore). The
 * destructive hard-delete uses the shared ConfirmByTypingDialog so the user
 * must type the brief's title before the permanent purge is invoked.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Pencil,
  Eye,
  Archive,
  ArchiveRestore,
  Trash2,
  FileText,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmByTypingDialog } from '@/components/admin/confirm-by-typing-dialog';
import type { AuditBriefData } from '@/lib/types';
import { withBasePath } from '@/lib/config/base-path';

interface AuditBriefTableActionsProps {
  /** The audit brief to display actions for. */
  auditBrief: AuditBriefData;
  /** Callback to refresh the table after an action completes. */
  onRefresh?: () => void;
}

/**
 * Renders a dropdown menu with actions for an audit brief row.
 *
 * Actions include editing, viewing, archiving/unarchiving, and permanent
 * deletion. Destructive actions require explicit confirmation.
 */
export function AuditBriefTableActions({ auditBrief, onRefresh }: AuditBriefTableActionsProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false);

  const handleArchiveToggle = async () => {
    setIsArchiving(true);
    try {
      if (auditBrief.isArchived) {
        // Unarchive: update isArchived to false
        const response = await fetch(withBasePath(`/api/audit-briefs/${auditBrief.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isArchived: false }),
        });

        if (!response.ok) {
          throw new Error('Failed to unarchive audit brief');
        }

        toast.success('Audit brief unarchived');
      } else {
        // Archive: call DELETE endpoint (default soft-archive mode).
        const response = await fetch(withBasePath(`/api/audit-briefs/${auditBrief.id}`), {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to archive audit brief');
        }

        toast.success('Audit brief archived');
      }

      onRefresh?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      toast.error(message);
    } finally {
      setIsArchiving(false);
      setShowArchiveDialog(false);
    }
  };

  const handleHardDelete = async (): Promise<void> => {
    const response = await fetch(withBasePath(`/api/audit-briefs/${auditBrief.id}?hard=true`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message =
        (payload as { message?: string }).message ?? 'Failed to permanently delete audit brief';
      toast.error(message);
      throw new Error(message);
    }

    toast.success('Audit brief permanently deleted');
    setShowHardDeleteDialog(false);
    onRefresh?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open actions menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Link href={`/admin/edit/${auditBrief.id}`} className="flex items-center w-full">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link
              href={`/admin/edit/${auditBrief.id}/transcript`}
              className="flex items-center w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              Edit transcript
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href={`/audit-brief/${auditBrief.id}`} className="flex items-center w-full">
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowArchiveDialog(true)}>
            {auditBrief.isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setShowHardDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete permanently…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{auditBrief.isArchived ? 'Unarchive' : 'Archive'} Audit Brief</DialogTitle>
            <DialogDescription>
              {auditBrief.isArchived
                ? `Are you sure you want to unarchive "${auditBrief.title}"? It will become visible to users again.`
                : `Are you sure you want to archive "${auditBrief.title}"? It will be hidden from users.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant={auditBrief.isArchived ? 'default' : 'destructive'}
              onClick={handleArchiveToggle}
              disabled={isArchiving}
            >
              {isArchiving ? 'Processing...' : auditBrief.isArchived ? 'Unarchive' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmByTypingDialog
        open={showHardDeleteDialog}
        onOpenChange={setShowHardDeleteDialog}
        title="Delete audit brief permanently?"
        description={`This removes "${auditBrief.title}", its transcripts, bookmarks, and favorites. Associated thumbnails and audio files are purged from storage. This cannot be undone.`}
        expectedText={auditBrief.title}
        confirmLabel="Delete permanently"
        onConfirm={handleHardDelete}
      />
    </>
  );
}
