/**
 * Podcast card component for the public library grid.
 *
 * Displays a podcast's thumbnail, domain badge, year, title,
 * truncated description, and up to 3 tag badges. The entire card
 * links to the podcast detail page at /podcast/[id].
 */
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PodcastCardProps {
  id: string;
  title: string;
  description: string;
  domain: string;
  year: number;
  tags: string[];
  thumbnailUrl: string;
}

export function PodcastCard({
  id,
  title,
  description,
  domain,
  year,
  tags,
  thumbnailUrl,
}: PodcastCardProps) {
  const visibleTags = tags.slice(0, 3);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link href={`/podcast/${id}` as any} className="group block" data-testid="podcast-card-link">
      <Card className="h-full transition-shadow hover:shadow-lg">
        <div className="relative aspect-video w-full overflow-hidden rounded-t-xl">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{domain}</Badge>
            <span className="text-xs text-muted-foreground">{year}</span>
          </div>
          <CardTitle className="line-clamp-2">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>
          {visibleTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {visibleTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
