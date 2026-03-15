/**
 * Public learning path viewer page.
 *
 * Server component that fetches a published learning graph and renders
 * the read-only viewer with completion tracking.
 */
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { PathViewer } from '@/components/learning-path/path-viewer';

export default async function LearningPathViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const graph = await prisma.learningGraph.findUnique({
    where: { id, isPublished: true },
    include: {
      episodes: { orderBy: { sortOrder: 'asc' } },
      edges: true,
    },
  });

  if (!graph) return notFound();

  // TODO: Fetch user progress when auth session is available
  const completedIds: string[] = [];

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-2">{graph.title}</h1>
      {graph.description && <p className="text-muted-foreground mb-6">{graph.description}</p>}
      <PathViewer
        pathType={graph.pathType as 'graph' | 'linear'}
        episodes={graph.episodes}
        edges={graph.edges}
        completedEpisodeIds={new Set(completedIds)}
        onEpisodeSelect={() => {}}
      />
    </div>
  );
}
