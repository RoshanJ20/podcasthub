/**
 * Admin learning graph editor page.
 *
 * Server component that fetches the graph with episodes and edges,
 * then renders tabs for both Linear and Graph editors so the admin
 * can switch between views regardless of pathType.
 */
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { GraphEditor } from '@/components/learning-path/graph-editor';
import { LinearEditor } from '@/components/learning-path/linear-editor';
import { GraphEditorInitializer } from '@/components/learning-path/graph-editor-initializer';
import { EditorTabs } from '@/components/learning-path/editor-tabs';

export const dynamic = 'force-dynamic';

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
      <GraphEditorInitializer graphId={id} episodes={graph.episodes} edges={graph.edges} />
      <EditorTabs defaultTab={graph.pathType === 'graph' ? 'graph' : 'linear'}>
        <LinearEditor graphId={id} />
        <GraphEditor graphId={id} />
      </EditorTabs>
    </div>
  );
}
