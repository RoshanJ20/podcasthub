/**
 * Client-side table for rendering admin audit log entries.
 *
 * Pagination and filtering mutate the URL via Next's useRouter so the
 * server component re-renders with the new `?page=`, `?entityType=`, and
 * `?action=` params. This keeps the list deep-linkable and avoids duplicating
 * state between server and client.
 */
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Snapshot of one `admin_audit_logs` row rendered in the table. */
export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId: string | null;
  createdAt: string;
}

/** Structured filter supplied by the server page. */
export interface AuditLogFilter {
  entityType: 'audit_brief' | 'learning_graph' | 'transcript' | 'episode' | null;
  action:
    | 'create'
    | 'update'
    | 'archive'
    | 'unarchive'
    | 'hard_delete'
    | 'transcript_update'
    | 'episode_delete'
    | 'blob_cleanup'
    | null;
}

/** Props for AuditLogTable. */
export interface AuditLogTableProps {
  /** Rows to render, already paginated server-side. */
  entries: AuditLogEntry[];
  /** Current page number (1-indexed). */
  page: number;
  /** Total number of pages available for the current filter. */
  totalPages: number;
  /** Total row count across all pages, used for the summary footer. */
  total: number;
  /** Currently active filter state. */
  filter: AuditLogFilter;
}

/** Human-readable labels for entity types. */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  audit_brief: 'Audit Brief',
  learning_graph: 'Learning Graph',
  transcript: 'Transcript',
  episode: 'Episode',
};

/** Available entity-type filter options (including "all"). */
const ENTITY_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All entities' },
  { value: 'audit_brief', label: 'Audit brief' },
  { value: 'learning_graph', label: 'Learning graph' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'episode', label: 'Episode' },
];

/** Available action filter options (including "all"). */
const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'archive', label: 'Archive' },
  { value: 'unarchive', label: 'Unarchive' },
  { value: 'hard_delete', label: 'Hard delete' },
  { value: 'transcript_update', label: 'Transcript update' },
  { value: 'episode_delete', label: 'Episode delete' },
  { value: 'blob_cleanup', label: 'Blob cleanup' },
];

/** Tailwind classes per action category for quick visual scanning. */
const ACTION_BADGE_CLASSES: Record<string, string> = {
  create: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  update: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  archive: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  unarchive: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  hard_delete: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
  transcript_update: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  episode_delete: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
  blob_cleanup: 'border-muted bg-muted/30 text-muted-foreground',
};

/**
 * Formats a timestamp as `YYYY-MM-DD HH:mm` in the viewer's local timezone.
 */
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Short-form the entity UUID so the table fits on one row. */
function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

/**
 * Renders the paginated audit log table with URL-synced filters.
 */
export function AuditLogTable({ entries, page, totalPages, total, filter }: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string): void => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Reset pagination whenever a filter changes so the page isn't stranded past the new total.
    if (key !== 'page') next.delete('page');
    router.push(`?${next.toString()}`);
  };

  const gotoPage = (target: number): void => {
    if (target < 1 || target > totalPages) return;
    updateParam('page', target === 1 ? '' : String(target));
  };

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter.entityType ?? ''}
          onChange={(e) => updateParam('entityType', e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filter by entity"
        >
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filter.action ?? ''}
          onChange={(e) => updateParam('action', e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filter by action"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {(filter.entityType || filter.action) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('?')}
            className="h-9 text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                When
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Actor
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Action
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Entity
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                ID
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Request
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No audit log entries match the current filters.
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry) => (
              <TableRow
                key={entry.id}
                className="border-border/30 transition-colors hover:bg-secondary/30"
              >
                <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                  {formatTimestamp(entry.createdAt)}
                </TableCell>
                <TableCell className="py-3 text-sm">{entry.actorEmail}</TableCell>
                <TableCell className="py-3">
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                      ACTION_BADGE_CLASSES[entry.action] ?? 'border-border bg-secondary/30'
                    }`}
                  >
                    {entry.action.replace(/_/g, ' ')}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-sm">
                  {ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}
                </TableCell>
                <TableCell
                  className="py-3 font-mono text-xs text-muted-foreground"
                  title={entry.entityId}
                >
                  {shortId(entry.entityId)}
                </TableCell>
                <TableCell
                  className="py-3 font-mono text-xs text-muted-foreground"
                  title={entry.requestId ?? ''}
                >
                  {entry.requestId ? shortId(entry.requestId) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0
            ? 'No entries'
            : `Showing ${entries.length ? (page - 1) * 25 + 1 : 0}–${
                (page - 1) * 25 + entries.length
              } of ${total}`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => gotoPage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="flex items-center">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => gotoPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
