/**
 * Admin podcast table with drag-to-reorder functionality.
 *
 * Displays podcasts in a sortable table using @dnd-kit for drag-and-drop
 * reordering. On reorder, the new sort orders are batch-patched to the API.
 * Each row includes a drag handle, key metadata, and an actions dropdown.
 */
'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PodcastTableActions } from '@/components/admin/podcast-table-actions';
import type { PodcastData } from '@/lib/types';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface PodcastTableProps {
  /** Array of podcasts to display. */
  podcasts: PodcastData[];
  /** Pagination metadata. */
  pagination: PaginationInfo;
  /** Callback to refresh the table data. */
  onRefresh: () => void;
}

/**
 * Renders a table of podcasts with sortable drag-and-drop rows.
 *
 * When rows are reordered via drag-and-drop, the component sends a
 * batch PATCH request to update sort orders on the server.
 */
export function PodcastTable({
  podcasts: initialPodcasts,
  pagination,
  onRefresh,
}: PodcastTableProps) {
  const [podcasts, setPodcasts] = useState(initialPodcasts);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const podcastIds = useMemo(() => podcasts.map((p) => p.id), [podcasts]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = podcasts.findIndex((p) => p.id === active.id);
    const newIndex = podcasts.findIndex((p) => p.id === over.id);

    const reordered = arrayMove(podcasts, oldIndex, newIndex);
    setPodcasts(reordered);

    // Build batch update payload with new sort orders
    const updates = reordered.map((podcast, index) => ({
      id: podcast.id,
      sortOrder: index,
    }));

    try {
      const response = await fetch('/api/podcasts/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update sort order');
      }

      toast.success('Sort order updated');
    } catch {
      // Revert on failure
      setPodcasts(initialPodcasts);
      toast.error('Failed to update sort order');
    }
  };

  if (podcasts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No podcasts found. Upload your first podcast to get started.
      </div>
    );
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={podcastIds} strategy={verticalListSortingStrategy}>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-12" />
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Title
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Domain
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Year
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {podcasts.map((podcast) => (
                <SortableRow key={podcast.id} podcast={podcast} onRefresh={onRefresh} />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
      <div className="flex items-center justify-between border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">
        <span>
          Showing {podcasts.length} of {pagination.total} podcasts
        </span>
        <span>
          Page {pagination.page} of {pagination.total_pages}
        </span>
      </div>
    </div>
  );
}

/** A single sortable table row for a podcast. */
function SortableRow({ podcast, onRefresh }: { podcast: PodcastData; onRefresh: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: podcast.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="border-border/30 transition-colors hover:bg-secondary/30"
    >
      <TableCell className="py-3.5">
        <button
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      </TableCell>
      <TableCell className="py-3.5 font-medium text-foreground">{podcast.title}</TableCell>
      <TableCell className="py-3.5">
        <span className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {podcast.domain}
        </span>
      </TableCell>
      <TableCell className="py-3.5 text-muted-foreground">{podcast.year}</TableCell>
      <TableCell className="py-3.5">
        {podcast.isArchived ? (
          <span className="inline-flex rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            Draft
          </span>
        ) : (
          <span className="inline-flex rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            Published
          </span>
        )}
      </TableCell>
      <TableCell className="py-3.5">
        <PodcastTableActions podcast={podcast} onRefresh={onRefresh} />
      </TableCell>
    </TableRow>
  );
}
