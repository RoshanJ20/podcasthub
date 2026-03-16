/**
 * Admin edit page for modifying an existing podcast.
 *
 * Server Component that fetches the podcast by ID from the database
 * and renders the PodcastUploadWizard in edit mode via EditPodcastClient.
 * Returns a 404 if the podcast is not found.
 */
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/db';
import { EditPodcastClient } from '@/components/admin/edit-podcast-client';
import type { PodcastData } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface EditPodcastPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPodcastPage({ params }: EditPodcastPageProps) {
  const { id } = await params;

  const podcast = await prisma.podcast.findUnique({
    where: { id },
  });

  if (!podcast) {
    notFound();
  }

  const serialized: PodcastData = {
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
    sortOrder: podcast.sortOrder,
    isArchived: podcast.isArchived,
    createdAt: podcast.createdAt.toISOString(),
    updatedAt: podcast.updatedAt.toISOString(),
  };

  return <EditPodcastClient podcast={serialized} />;
}
