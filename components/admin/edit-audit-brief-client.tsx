/**
 * Client wrapper for the edit audit brief page.
 *
 * Renders breadcrumb navigation and the AuditBriefUploadWizard in edit mode.
 * Handles navigation back to the dashboard on successful update.
 */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { AuditBriefUploadWizard } from '@/components/admin/audit-brief-upload-wizard';
import type { AuditBriefData } from '@/lib/types';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface EditAuditBriefClientProps {
  /** The audit brief data to pre-fill the form with. */
  auditBrief: AuditBriefData;
}

/**
 * Renders the edit audit brief wizard with breadcrumb navigation.
 */
export function EditAuditBriefClient({ auditBrief }: EditAuditBriefClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/admin" />}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Audit Brief</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit Audit Brief</h1>
        <p className="text-muted-foreground">
          Update the details for &ldquo;{auditBrief.title}&rdquo;.
        </p>
      </div>

      <AuditBriefUploadWizard
        initialData={auditBrief}
        mode="edit"
        onSuccess={() => router.push('/admin')}
      />
    </div>
  );
}
