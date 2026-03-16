/**
 * Learning path card component for the public listing page.
 *
 * Displays a card with title, description, domain badge,
 * episode count, and progress bar.
 */
import Link from 'next/link';

interface PathCardProps {
  id: string;
  title: string;
  description: string | null;
  domain: string | null;
  episodeCount: number;
  completedCount: number;
}

export function PathCard({
  id,
  title,
  description,
  domain,
  episodeCount,
  completedCount,
}: PathCardProps) {
  const progress = episodeCount > 0 ? Math.round((completedCount / episodeCount) * 100) : 0;

  return (
    <Link href={`/learning-path/${id}`}>
      <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-secondary/20">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-sm font-medium leading-snug">{title}</p>
          {domain && (
            <span className="inline-flex shrink-0 rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {domain}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mb-4">{description}</p>}
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
          <span>{episodeCount} episodes</span>
          <span>{progress}% complete</span>
        </div>
        <div className="w-full bg-border/40 rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </Link>
  );
}
