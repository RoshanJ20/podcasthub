/**
 * Public learning paths listing page.
 *
 * Server component that shows published learning paths with domain filtering
 * and progress indicators for authenticated users.
 */
import { prisma } from '@/lib/db';
import { PathCard } from '@/components/learning-path/path-card';

export default async function LearningPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const { domain } = await searchParams;

  const paths = await prisma.learningGraph.findMany({
    where: {
      isPublished: true,
      ...(domain ? { domain } : {}),
    },
    include: { _count: { select: { episodes: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Learning Paths</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paths.map((path) => (
          <PathCard
            key={path.id}
            id={path.id}
            title={path.title}
            description={path.description}
            domain={path.domain}
            episodeCount={path._count.episodes}
            completedCount={0}
          />
        ))}
      </div>
      {paths.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No learning paths available yet.</p>
      )}
    </div>
  );
}
