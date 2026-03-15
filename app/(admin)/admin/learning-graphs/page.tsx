/**
 * Admin learning graphs list page.
 *
 * Server component that fetches all learning graphs and renders
 * the admin management table with publish/delete controls.
 */
import { prisma } from '@/lib/db';
import { LearningGraphsTable } from '@/components/admin/learning-graphs-table';

export default async function AdminLearningGraphsPage() {
  const graphs = await prisma.learningGraph.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { episodes: true } } },
  });

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Learning Paths</h1>
      <LearningGraphsTable graphs={graphs} />
    </div>
  );
}
