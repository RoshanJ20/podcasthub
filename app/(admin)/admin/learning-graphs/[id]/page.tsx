/**
 * Admin learning path editor page.
 *
 * Server component that fetches the graph with episodes and edges,
 * hydrates the editor store, and renders the linear episode editor.
 */
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { LinearEditor } from '@/components/learning-path/linear-editor';
import { GraphEditorInitializer } from '@/components/learning-path/graph-editor-initializer';
import { isUuid } from '@/lib/schemas/common';

export const dynamic = 'force-dynamic';

export default async function AdminLearningGraphEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const graph = await prisma.learningGraph.findUnique({
    where: { id },
    include: {
      episodes: { orderBy: { sortOrder: 'asc' } },
      edges: true,
    },
  });

  if (!graph) return notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{graph.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit episodes, order, and connections.</p>
      </div>
      <GraphEditorInitializer graphId={id} episodes={graph.episodes} edges={graph.edges} />
      <LinearEditor graphId={id} />
    </div>
  );
}
