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

export const dynamic = 'force-dynamic';

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

  const publishedCount = serialized.filter((p) => !p.isArchived).length;
  const draftCount = serialized.filter((p) => p.isArchived).length;
  const domainCount = new Set(serialized.map((p) => p.domain)).size;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Podcast Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage, reorder, and publish your audio content.
          </p>
        </div>
        <Link
          href="/admin/upload"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Plus className="size-3.5" />
          New podcast
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total Podcasts
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{serialized.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Across {domainCount} domains</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Published
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{publishedCount}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {serialized.length > 0 ? Math.round((publishedCount / serialized.length) * 100) : 0}% of
            total
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Drafts
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{draftCount}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Pending review</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Domains
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{domainCount}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Active categories</p>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">All Podcasts</h2>
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
    </div>
  );
}
