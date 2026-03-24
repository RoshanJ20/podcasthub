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
    <div className="py-2">
      <PathListClient paths={pathData} />
    </div>
  );
}
