/**
 * Public learning paths listing page.
 *
 * Server component that fetches all learning paths (auto-published), then
 * delegates rendering to PathListClient which fetches per-user progress
 * client-side.
 */
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth/session-helpers';
import { PathListClient } from '@/components/learning-path/path-list-client';

export const dynamic = 'force-dynamic';

export default async function LearningPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; favorites?: string }>;
}) {
  const { domain, favorites } = await searchParams;
  const showFavorites = favorites === 'true';

  // When favorites filter is active, get the user's favorited learning graph IDs
  let favoriteIds: string[] = [];
  if (showFavorites) {
    const session = await getAuthSession();
    const userId = session?.user?.id;
    if (userId) {
      const userFavorites = await prisma.learningGraphFavorite.findMany({
        where: { userId },
        select: { learningGraphId: true },
      });
      favoriteIds = userFavorites.map((f) => f.learningGraphId);
    }
  }

  const paths = await prisma.learningGraph.findMany({
    where: {
      ...(showFavorites ? { id: { in: favoriteIds } } : {}),
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PathListClient paths={pathData} />
    </div>
  );
}
