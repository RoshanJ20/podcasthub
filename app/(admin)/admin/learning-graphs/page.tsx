/**
 * Admin learning graphs list page.
 *
 * Server component that fetches all learning graphs and renders
 * the admin management table with publish/delete controls.
 */
import { prisma } from '@/lib/db';
import { LearningGraphsTable } from '@/components/admin/learning-graphs-table';

export const dynamic = 'force-dynamic';

export default async function AdminLearningGraphsPage() {
  const graphs = await prisma.learningGraph.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { episodes: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Learning Paths</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage structured learning journeys.
        </p>
      </div>
      <LearningGraphsTable graphs={graphs} />
    </div>
  );
}
