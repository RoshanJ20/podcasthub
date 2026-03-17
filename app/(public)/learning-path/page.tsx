/**
 * Public learning paths listing page.
 *
 * Server component that fetches all learning paths (auto-published), then
 * delegates rendering to PathListClient which fetches per-user progress
 * client-side.
 */
import { prisma } from '@/lib/db';
import { PathListClient } from '@/components/learning-path/path-list-client';

export const dynamic = 'force-dynamic';

export default async function LearningPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const { domain } = await searchParams;

  const paths = await prisma.learningGraph.findMany({
    where: {
      ...(domain ? { domain } : {}),
    },
    include: { _count: { select: { episodes: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const pathData = paths.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    domain: p.domain,
    episodeCount: p._count.episodes,
  }));

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Learning Series</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Structured content journeys curated for your professional development.
        </p>
      </div>
      <PathListClient paths={pathData} />
      {paths.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No learning series available yet.</p>
      )}
    </div>
  );
}
