'use client';

/**
 * Admin learning graphs data table with delete actions.
 *
 * All learning series are auto-published, so no publish/draft toggle is needed.
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(withBasePath(`/api/learning-graphs/${deleteId}`), {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Learning series deleted');
    } catch {
      toast.error('Failed to delete learning series');
    } finally {
      setDeleteId(null);
      setIsDeleting(false);
      router.refresh();
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
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(graph.id)}>
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Learning Series</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this learning series? This action cannot be undone.
              All episodes and edges will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
