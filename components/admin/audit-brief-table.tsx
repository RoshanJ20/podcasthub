/**
 * Admin audit brief table with drag-to-reorder functionality.
 *
 * Displays audit briefs in a sortable table using @dnd-kit for drag-and-drop
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
import { AuditBriefTableActions } from '@/components/admin/audit-brief-table-actions';
import type { AuditBriefData } from '@/lib/types';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface AuditBriefTableProps {
  /** Array of audit briefs to display. */
  auditBriefs: AuditBriefData[];
  /** Pagination metadata. */
  pagination: PaginationInfo;
  /** Callback to refresh the table data. */
  onRefresh: () => void;
}

/**
 * Renders a table of audit briefs with sortable drag-and-drop rows.
 *
 * When rows are reordered via drag-and-drop, the component sends a
 * batch PATCH request to update sort orders on the server.
 */
export function AuditBriefTable({
  auditBriefs: initialAuditBriefs,
  pagination,
  onRefresh,
}: AuditBriefTableProps) {
  const [auditBriefs, setAuditBriefs] = useState(initialAuditBriefs);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const auditBriefIds = useMemo(
    () => auditBriefs.map((auditBrief) => auditBrief.id),
    [auditBriefs]
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = auditBriefs.findIndex((auditBrief) => auditBrief.id === active.id);
    const newIndex = auditBriefs.findIndex((auditBrief) => auditBrief.id === over.id);

    const reordered = arrayMove(auditBriefs, oldIndex, newIndex);
    setAuditBriefs(reordered);

    // Build batch update payload with new sort orders
    const updates = reordered.map((auditBrief, index) => ({
      id: auditBrief.id,
      sortOrder: index,
    }));

    try {
      const response = await fetch('/api/audit-briefs/batch', {
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
      setAuditBriefs(initialAuditBriefs);
      toast.error('Failed to update sort order');
    }
  };

  if (auditBriefs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No audit briefs found. Upload your first audit brief to get started.
      </div>
    );
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={auditBriefIds} strategy={verticalListSortingStrategy}>
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
              {auditBriefs.map((auditBrief) => (
                <SortableRow key={auditBrief.id} auditBrief={auditBrief} onRefresh={onRefresh} />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
      <div className="flex items-center justify-between border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">
        <span>
          Showing {auditBriefs.length} of {pagination.total} audit briefs
        </span>
        <span>
          Page {pagination.page} of {pagination.total_pages}
        </span>
      </div>
    </div>
  );
}

/** A single sortable table row for a auditBrief. */
function SortableRow({
  auditBrief,
  onRefresh,
}: {
  auditBrief: AuditBriefData;
  onRefresh: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: auditBrief.id,
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
      <TableCell className="py-3.5 font-medium text-foreground">{auditBrief.title}</TableCell>
      <TableCell className="py-3.5">
        <span className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {auditBrief.domain}
        </span>
      </TableCell>
      <TableCell className="py-3.5 text-muted-foreground">{auditBrief.year}</TableCell>
      <TableCell className="py-3.5">
        {auditBrief.isArchived ? (
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
        <AuditBriefTableActions auditBrief={auditBrief} onRefresh={onRefresh} />
      </TableCell>
    </TableRow>
  );
}
