/**
 * Admin page for creating a new learning series.
 *
 * Renders the LearningSeriesWizard in a layout matching the upload audit brief page:
 * breadcrumb navigation, back button that respects wizard step, max-w-3xl centered.
 */
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import {
  LearningSeriesWizard,
  type LearningSeriesWizardHandle,
} from '@/components/admin/learning-series-wizard';
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
 * Renders the admin page for creating a new learning series.
 *
 * Hosts the LearningSeriesWizard with a breadcrumb trail and a context-aware
 * back button: navigates to the previous wizard step when mid-wizard, or calls
 * router.back() when on the first step.
 *
 * @returns The new learning series creation page.
 */
export default function NewLearningPathPage() {
  const router = useRouter();
  const wizardRef = useRef<LearningSeriesWizardHandle>(null);
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
            <BreadcrumbPage>Upload Learning Series</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="rounded-2xl border border-border/70 bg-card/85 p-5 shadow-[0_10px_35px_-30px_oklch(45.6%_0.311_264.1/.65)]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Admin Console
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Upload New Learning Series</h1>
          </div>
        </div>
      </section>

      <LearningSeriesWizard
        ref={wizardRef}
        onSuccess={() => router.push('/admin')}
        onStepChange={setWizardStep}
      />
    </div>
  );
}
