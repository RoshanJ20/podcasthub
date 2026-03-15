/**
 * Responsive grid layout for displaying podcast cards.
 *
 * Renders a grid of PodcastCard components with responsive column
 * counts. Shows an empty state message when no podcasts are available.
 */
import { FileAudio } from 'lucide-react';
import { PodcastCard } from '@/components/library/podcast-card';
import type { PodcastData } from '@/lib/types';

export interface PodcastGridProps {
  podcasts: PodcastData[];
}

export function PodcastGrid({ podcasts }: PodcastGridProps) {
  if (podcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
        <FileAudio className="size-12" />
        <p className="text-lg font-medium">No podcasts found</p>
        <p className="text-sm">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {podcasts.map((podcast) => (
        <PodcastCard
          key={podcast.id}
          id={podcast.id}
          title={podcast.title}
          description={podcast.description}
          domain={podcast.domain}
          year={podcast.year}
          tags={podcast.tags}
          thumbnailUrl={podcast.thumbnailUrl}
        />
      ))}
    </div>
  );
}
