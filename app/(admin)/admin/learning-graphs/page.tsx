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
      <section className="rounded-2xl border border-border-default dark:border-border-subtle bg-elevated/85 p-5 shadow-card">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Admin Console
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Learning Series</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage structured learning journeys.
        </p>
      </section>
      <LearningGraphsTable graphs={graphs} />
    </div>
  );
}
