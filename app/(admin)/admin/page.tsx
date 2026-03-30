/**
 * Admin dashboard page for audit brief management.
 *
 * Server Component that fetches all audit briefs from the database
 * and renders them in a sortable AuditBriefTable. Provides a link
 * to the upload page for creating new auditBriefs.
 */
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { prisma } from '@/lib/db';
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';
import type { AuditBriefData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const auditBriefs = await prisma.auditBrief.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const serialized: AuditBriefData[] = auditBriefs.map((p) => ({
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
      <div className="rounded-2xl border border-border-default bg-elevated/85 p-5 shadow-card dark:border-border-subtle">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-caps">Admin Console</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-primary-text">Audit Brief Management</h1>
            <p className="mt-1 text-sm text-secondary-text">
              Manage, reorder, and publish your audio content.
            </p>
          </div>
          <Link
            href="/admin/upload"
            className="inline-flex items-center gap-1.5 rounded-lg bg-interactive px-3 py-2 text-sm font-medium text-on-brand shadow-sm transition-colors hover:bg-interactive-hover press-scale"
          >
            <Plus className="size-3.5" />
            New audit brief
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border-default bg-elevated p-4 shadow-card dark:border-border-subtle">
          <p className="label-caps">
            Total Audit Briefs
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-primary-text">{serialized.length}</p>
          <p className="mt-0.5 text-[11px] text-tertiary">Across {domainCount} domains</p>
        </div>
        <div className="rounded-xl border border-border-default bg-elevated p-4 shadow-card dark:border-border-subtle">
          <p className="label-caps">
            Published
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-primary-text">{publishedCount}</p>
          <p className="mt-0.5 text-[11px] text-tertiary">
            {serialized.length > 0 ? Math.round((publishedCount / serialized.length) * 100) : 0}% of
            total
          </p>
        </div>
        <div className="rounded-xl border border-border-default bg-elevated p-4 shadow-card dark:border-border-subtle">
          <p className="label-caps">
            Drafts
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-primary-text">{draftCount}</p>
          <p className="mt-0.5 text-[11px] text-tertiary">Pending review</p>
        </div>
        <div className="rounded-xl border border-border-default bg-elevated p-4 shadow-card dark:border-border-subtle">
          <p className="label-caps">
            Domains
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-primary-text">{domainCount}</p>
          <p className="mt-0.5 text-[11px] text-tertiary">Active categories</p>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border-default bg-elevated shadow-card dark:border-border-subtle">
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3.5 dark:border-border-subtle">
          <h2 className="text-sm font-semibold text-primary-text">All Audit Briefs</h2>
        </div>
        <AdminDashboardClient
          auditBriefs={serialized}
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
