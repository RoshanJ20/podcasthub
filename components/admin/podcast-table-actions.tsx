/**
 * Action dropdown menu for individual podcast rows in the admin table.
 *
 * Provides Edit, View, and Archive/Unarchive actions for each podcast.
 * The archive action includes a confirmation dialog to prevent accidental
 * changes.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MoreHorizontal, Pencil, Eye, Archive, ArchiveRestore } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import type { PodcastData } from '@/lib/types';

interface PodcastTableActionsProps {
  /** The podcast to display actions for. */
  podcast: PodcastData;
  /** Callback to refresh the table after an action completes. */
  onRefresh?: () => void;
}

/**
 * Renders a dropdown menu with actions for a podcast row.
 *
 * Actions include editing, viewing, and archiving/unarchiving the podcast.
 */
export function PodcastTableActions({ podcast, onRefresh }: PodcastTableActionsProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveToggle = async () => {
    setIsArchiving(true);
    try {
      if (podcast.isArchived) {
        // Unarchive: update isArchived to false
        const response = await fetch(`/api/podcasts/${podcast.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isArchived: false }),
        });

        if (!response.ok) {
          throw new Error('Failed to unarchive podcast');
        }

        toast.success('Podcast unarchived');
      } else {
        // Archive: call DELETE endpoint
        const response = await fetch(`/api/podcasts/${podcast.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to archive podcast');
        }

        toast.success('Podcast archived');
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/edit/${podcast.id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/podcast/${podcast.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowArchiveDialog(true)}>
            {podcast.isArchived ? (
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
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{podcast.isArchived ? 'Unarchive' : 'Archive'} Podcast</DialogTitle>
            <DialogDescription>
              {podcast.isArchived
                ? `Are you sure you want to unarchive "${podcast.title}"? It will become visible to users again.`
                : `Are you sure you want to archive "${podcast.title}"? It will be hidden from users.`}
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
              variant={podcast.isArchived ? 'default' : 'destructive'}
              onClick={handleArchiveToggle}
              disabled={isArchiving}
            >
              {isArchiving ? 'Processing...' : podcast.isArchived ? 'Unarchive' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
