'use client';

/**
 * Admin learning graphs data table with publish toggle and delete actions.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface LearningGraph {
  id: string;
  title: string;
  domain: string;
  pathType: string;
  isPublished: boolean;
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

  const handlePublishToggle = async (id: string, isPublished: boolean) => {
    await fetch(`/api/learning-graphs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !isPublished }),
    });
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    await fetch(`/api/learning-graphs/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    setIsDeleting(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">All Learning Paths</h2>
        <Link href="/admin/learning-graphs/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" /> New Path
          </Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Episodes</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {graphs.map((graph) => (
            <TableRow key={graph.id}>
              <TableCell className="font-medium">{graph.title}</TableCell>
              <TableCell>
                <Badge variant="secondary">{graph.domain}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{graph.pathType}</Badge>
              </TableCell>
              <TableCell>{graph._count?.episodes ?? 0}</TableCell>
              <TableCell>
                <Button
                  variant={graph.isPublished ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePublishToggle(graph.id, graph.isPublished)}
                >
                  {graph.isPublished ? 'Published' : 'Draft'}
                </Button>
              </TableCell>
              <TableCell>
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
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No learning paths yet. Click &quot;New Path&quot; to create one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Learning Path</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this learning path? This action cannot be undone. All
              episodes and edges will be permanently deleted.
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
