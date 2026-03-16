/**
 * Progress dashboard page — server component shell.
 *
 * Renders the client-side progress dashboard with tabs for
 * in-progress paths, completed paths, bookmarks, and activity history.
 */
import { ProgressDashboard } from '@/components/progress/progress-dashboard';

export const metadata = {
  title: 'Progress | Podcast Hub',
  description: 'Track your learning progress',
};

export default function ProgressPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">My Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your learning activity and completions.
        </p>
      </div>
      <ProgressDashboard />
    </div>
  );
}
