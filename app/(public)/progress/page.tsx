/**
 * Progress dashboard page — server component shell.
 *
 * Renders the client-side progress dashboard with tabs for
 * in-progress paths, completed paths, bookmarks, and activity history.
 */
import { ProgressDashboard } from '@/components/progress/progress-dashboard';

export const metadata = {
  title: 'Progress | The Audit Brief',
  description: 'Track your learning progress',
};

export default function ProgressPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      <section className="rounded-2xl border border-border-default dark:border-border-subtle bg-elevated/85 p-5 shadow-card">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Personal</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">My Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your learning activity and completions.
        </p>
      </section>
      <ProgressDashboard />
    </div>
  );
}
