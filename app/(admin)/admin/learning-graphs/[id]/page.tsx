/**
 * Admin learning graph editor page.
 *
 * Server component that fetches the graph with episodes and edges,
 * then renders the appropriate editor (graph or linear) based on pathType.
 */
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { GraphEditor } from '@/components/learning-path/graph-editor';
import { LinearEditor } from '@/components/learning-path/linear-editor';
import { GraphEditorInitializer } from '@/components/learning-path/graph-editor-initializer';

export default async function AdminLearningGraphEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const graph = await prisma.learningGraph.findUnique({
    where: { id },
    include: {
      episodes: { orderBy: { sortOrder: 'asc' } },
      edges: true,
    },
  });

  if (!graph) return notFound();

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-4">{graph.title}</h1>
      <GraphEditorInitializer episodes={graph.episodes} edges={graph.edges} />
      {graph.pathType === 'graph' ? <GraphEditor graphId={id} /> : <LinearEditor graphId={id} />}
    </div>
  );
}
