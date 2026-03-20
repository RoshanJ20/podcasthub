/**
 * Admin edit page for modifying an existing auditBrief.
 *
 * Server Component that fetches the audit brief by ID from the database
 * and renders the AuditBriefUploadWizard in edit mode via EditAuditBriefClient.
 * Returns a 404 if the audit brief is not found.
 */
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/db';
import { EditAuditBriefClient } from '@/components/admin/edit-audit-brief-client';
import type { AuditBriefData } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface EditAuditBriefPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAuditBriefPage({ params }: EditAuditBriefPageProps) {
  const { id } = await params;

  const auditBrief = await prisma.auditBrief.findUnique({
    where: { id },
  });

  if (!auditBrief) {
    notFound();
  }

  const serialized: AuditBriefData = {
    id: auditBrief.id,
    title: auditBrief.title,
    description: auditBrief.description,
    domain: auditBrief.domain,
    year: auditBrief.year,
    tags: auditBrief.tags,
    thumbnailUrl: auditBrief.thumbnailUrl,
    audioShortUrl: auditBrief.audioShortUrl,
    audioLongUrl: auditBrief.audioLongUrl,
    bulletinUrls: auditBrief.bulletinUrls,
    sortOrder: auditBrief.sortOrder,
    isArchived: auditBrief.isArchived,
    createdAt: auditBrief.createdAt.toISOString(),
    updatedAt: auditBrief.updatedAt.toISOString(),
  };

  return <EditAuditBriefClient auditBrief={serialized} />;
}
