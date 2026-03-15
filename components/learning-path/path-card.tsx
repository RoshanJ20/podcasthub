/**
 * Learning path card component for the public listing page.
 *
 * Displays a card with title, description, domain badge,
 * episode count, and progress bar.
 */
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            {domain && <Badge variant="secondary">{domain}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {description && <p className="text-sm text-muted-foreground mb-3">{description}</p>}
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{episodeCount} episodes</span>
            <span>{progress}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
