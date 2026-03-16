/**
 * Podcast card component for the public library grid.
 *
 * Displays a podcast's thumbnail, domain badge, year, title,
 * truncated description, and up to 3 tag badges. The entire card
 * links to the podcast detail page at /podcast/[id].
 */
import Link from 'next/link';
import Image from 'next/image';
import { resolveStorageUrl } from '@/lib/storage-url';

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
      <div className="flex h-full flex-col rounded-xl border border-border bg-card transition-colors hover:bg-secondary/20 active:scale-[0.98]">
        <div className="relative aspect-video w-full overflow-hidden rounded-t-xl">
          <Image
            src={resolveStorageUrl(thumbnailUrl)}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {domain}
            </span>
            <span className="text-[11px] text-muted-foreground">{year}</span>
          </div>
          <p className="line-clamp-1 text-sm font-medium leading-snug">{title}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{description}</p>
          {visibleTags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1 pt-3">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
