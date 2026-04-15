'use client';

/**
 * Admin learning graphs data table with typed-confirmation delete.
 *
 * Delete is irreversible and purges associated episode + graph blobs, so the
 * shared ConfirmByTypingDialog requires the admin to type the graph title
 * before the destructive button enables.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmByTypingDialog } from '@/components/admin/confirm-by-typing-dialog';
import { withBasePath } from '@/lib/config/base-path';

interface LearningGraph {
  id: string;
  title: string;
  domain: string;
  pathType: string;
  createdAt: Date;
  _count?: { episodes: number };
}

interface LearningGraphsTableProps {
  graphs: LearningGraph[];
}

export function LearningGraphsTable({ graphs }: LearningGraphsTableProps) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<LearningGraph | null>(null);

  const handleDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    try {
      const res = await fetch(withBasePath(`/api/learning-graphs/${pendingDelete.id}`), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message =
          (payload as { message?: string }).message ?? 'Failed to delete learning series';
        toast.error(message);
        return;
      }
      toast.success('Learning series deleted');
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete learning series';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {graphs.length} path{graphs.length !== 1 ? 's' : ''}
        </p>
        <Link href="/admin/learning-graphs/new">
          <Button
            variant="outline"
            className="border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <Plus className="h-4 w-4 mr-1" /> New Path
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Domain
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Episodes
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {graphs.map((graph) => (
              <TableRow
                key={graph.id}
                className="border-border/30 transition-colors hover:bg-secondary/30"
              >
                <TableCell className="py-3.5 font-medium">{graph.title}</TableCell>
                <TableCell className="py-3.5">
                  <span className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {graph.domain}
                  </span>
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {graph.pathType}
                  </span>
                </TableCell>
                <TableCell className="py-3.5">{graph._count?.episodes ?? 0}</TableCell>
                <TableCell className="py-3.5">
                  <div className="flex gap-1">
                    <Link href={`/admin/learning-graphs/${graph.id}`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => setPendingDelete(graph)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {graphs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No learning series yet. Click &quot;New Path&quot; to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmByTypingDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete learning series permanently?"
        description={
          pendingDelete
            ? `This removes "${pendingDelete.title}" and all ${pendingDelete._count?.episodes ?? 0} episode(s). Associated thumbnails and audio files are purged from storage. User progress and bookmarks are removed. This cannot be undone.`
            : ''
        }
        expectedText={pendingDelete?.title ?? ''}
        confirmLabel="Delete permanently"
        onConfirm={handleDelete}
      />
    </div>
  );
}
