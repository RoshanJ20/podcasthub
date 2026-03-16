/**
 * Podcast detail page — server component.
 *
 * Fetches a single podcast by ID with its transcripts from the database.
 * Returns a 404 if the podcast is not found or archived. Renders the
 * PodcastDetailLayout client component with the full podcast data.
 */
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PodcastDetailLayout } from '@/components/audio-player/podcast-detail-layout';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PodcastPage({ params }: Props) {
  const { id } = await params;

  const podcast = await prisma.podcast.findFirst({
    where: { id, isArchived: false },
    include: { transcripts: true },
  });

  if (!podcast) notFound();

  return (
    <PodcastDetailLayout
      podcast={{
        id: podcast.id,
        title: podcast.title,
        description: podcast.description,
        domain: podcast.domain,
        year: podcast.year,
        tags: podcast.tags,
        thumbnailUrl: podcast.thumbnailUrl,
        audioShortUrl: podcast.audioShortUrl,
        audioLongUrl: podcast.audioLongUrl,
        bulletinUrls: podcast.bulletinUrls,
        transcripts: podcast.transcripts.map((t) => ({
          id: t.id,
          fullText: t.fullText,
          segments: t.segments,
          transcriptType: t.transcriptType,
        })),
      }}
    />
  );
}
