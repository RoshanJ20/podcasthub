/**
 * Admin page for creating a new learning series.
 *
 * Renders the LearningSeriesWizard in a layout matching the upload podcast page:
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

export default function NewLearningPathPage() {
  const router = useRouter();
  const wizardRef = useRef<LearningSeriesWizardHandle>(null);
  const [wizardStep, setWizardStep] = useState(0);

  const handleBack = () => {
    if (wizardStep > 0) {
      wizardRef.current?.goBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Upload New Learning Series</h1>
      </div>

      <LearningSeriesWizard
        ref={wizardRef}
        onSuccess={() => router.push('/admin')}
        onStepChange={setWizardStep}
      />
    </div>
  );
}
