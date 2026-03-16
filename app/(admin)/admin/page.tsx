/**
 * Admin dashboard page for podcast management.
 *
 * Server Component that fetches all podcasts from the database
 * and renders them in a sortable PodcastTable. Provides a link
 * to the upload page for creating new podcasts.
 */
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { prisma } from '@/lib/db';
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';
import type { PodcastData } from '@/lib/types';

export default async function AdminDashboardPage() {
  const podcasts = await prisma.podcast.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const serialized: PodcastData[] = podcasts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    domain: p.domain,
    year: p.year,
    tags: p.tags,
    thumbnailUrl: p.thumbnailUrl,
    audioShortUrl: p.audioShortUrl,
    audioLongUrl: p.audioLongUrl,
    bulletinUrls: p.bulletinUrls,
    sortOrder: p.sortOrder,
    isArchived: p.isArchived,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Podcast Management</h1>
          <p className="text-muted-foreground">
            Manage your podcasts, reorder them, and upload new content.
          </p>
        </div>
        <Link
          href="/admin/upload"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 transition-all hover:bg-primary/80"
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload Podcast
        </Link>
      </div>

      <AdminDashboardClient
        podcasts={serialized}
        pagination={{
          page: 1,
          limit: serialized.length,
          total: serialized.length,
          total_pages: 1,
        }}
      />
    </div>
  );
}
