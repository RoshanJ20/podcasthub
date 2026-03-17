/**
 * Public learning path viewer page.
 *
 * Server component that fetches a learning graph by ID and renders
 * the read-only viewer with completion tracking, domain-colored
 * Mercury-inspired styling.
 */
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { PathViewerWrapper } from '@/components/learning-path/path-viewer-wrapper';

export const dynamic = 'force-dynamic';

export default async function LearningPathViewerPage({
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

  const episodes = graph.episodes.map((e) => ({
    id: e.id,
    title: e.title,
    nodeType: e.nodeType,
    audioUrl: e.audioUrl,
    thumbnailUrl: e.thumbnailUrl,
    transcript:
      Array.isArray(e.transcript) && e.transcript.length > 0
        ? (e.transcript as string[]).join('\n')
        : null,
    description: e.description,
    positionX: e.positionX,
    positionY: e.positionY,
    sortOrder: e.sortOrder,
  }));

  const edges = graph.edges.map((e) => ({
    id: e.id,
    sourceEpisodeId: e.sourceEpisodeId,
    targetEpisodeId: e.targetEpisodeId,
  }));

  return (
    <PathViewerWrapper
      graphId={graph.id}
      title={graph.title}
      description={graph.description}
      domain={graph.domain ?? ''}
      pathType={graph.pathType as 'graph' | 'linear'}
      episodes={episodes}
      edges={edges}
    />
  );
}
