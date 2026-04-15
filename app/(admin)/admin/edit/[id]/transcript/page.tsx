/**
 * Admin transcript editor page.
 *
 * Server component that validates the UUID, fetches the parent audit brief
 * and its transcripts, then renders the interactive TranscriptEditor. Invalid
 * UUIDs and missing briefs return a 404 via `notFound()`.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { prisma } from '@/lib/db';
import { isUuid } from '@/lib/schemas/common';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { TranscriptEditor } from '@/components/admin/transcript-editor';
import type { TranscriptRecord } from '@/components/admin/transcript-editor';

export const dynamic = 'force-dynamic';

/**
 * Renders the admin transcript editor for a specific audit brief.
 *
 * @param params - Route params containing the audit brief UUID.
 */
export default async function AdminTranscriptEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const brief = await prisma.auditBrief.findUnique({
    where: { id },
    include: { transcripts: true },
  });

  if (!brief) notFound();

  const transcripts: TranscriptRecord[] = brief.transcripts.map((t) => ({
    id: t.id,
    auditBriefId: t.auditBriefId,
    transcriptType: t.transcriptType === 'long' ? 'long' : 'short',
    fullText: t.fullText,
    segments: t.segments,
  }));

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/admin" />}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={`/admin/edit/${id}`} />}>
              {brief.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Transcript</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <TranscriptEditor
        auditBriefId={brief.id}
        auditBriefTitle={brief.title}
        initialTranscripts={transcripts}
      />
    </div>
  );
}
