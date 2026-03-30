/**
 * Admin upload page for creating new auditBriefs.
 *
 * Renders the AuditBriefUploadWizard in create mode with a breadcrumb
 * navigation trail showing Dashboard > Upload.
 */
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { AuditBriefUploadWizard } from '@/components/admin/audit-brief-upload-wizard';
import type { AuditBriefUploadWizardHandle } from '@/components/admin/audit-brief-upload-wizard';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/**
 * Renders the admin page for uploading a new auditBrief.
 *
 * Hosts the AuditBriefUploadWizard in create mode with a breadcrumb trail and a
 * context-aware back button: navigates to the previous wizard step when
 * mid-wizard, or calls router.back() when on the first step.
 *
 * @returns The upload new audit brief page.
 */
export default function UploadPage() {
  const router = useRouter();
  const wizardRef = useRef<AuditBriefUploadWizardHandle>(null);
  const [wizardStep, setWizardStep] = useState(0);

  // TODO(team): Extract shared handleBack pattern to useWizardNavigation hook — see #tech-debt
  const handleBack = () => {
    if (wizardStep > 0) {
      wizardRef.current?.goBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/admin" />}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Upload</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="rounded-2xl border border-border-default dark:border-border-subtle bg-elevated/85 p-5 shadow-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Admin Console
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Upload New Audit Brief</h1>
          </div>
        </div>
      </section>

      <AuditBriefUploadWizard
        ref={wizardRef}
        mode="create"
        onSuccess={() => router.push('/admin')}
        onStepChange={setWizardStep}
      />
    </div>
  );
}
