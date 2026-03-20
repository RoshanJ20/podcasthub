/**
 * Audit brief detail page — server component.
 *
 * Fetches a single audit brief by ID with its transcripts from the database.
 * Returns a 404 if the audit brief is not found or archived. Renders the
 * AuditBriefDetailLayout client component with the full audit brief data.
 */
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AuditBriefDetailLayout } from '@/components/audio-player/audit-brief-detail-layout';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AuditBriefPage({ params }: Props) {
  const { id } = await params;

  const auditBrief = await prisma.auditBrief.findFirst({
    where: { id, isArchived: false },
    include: { transcripts: true },
  });

  if (!auditBrief) notFound();

  return (
    <AuditBriefDetailLayout
      auditBrief={{
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
        transcripts: auditBrief.transcripts.map((t) => ({
          id: t.id,
          fullText: t.fullText,
          segments: t.segments,
          transcriptType: t.transcriptType,
        })),
      }}
    />
  );
}
