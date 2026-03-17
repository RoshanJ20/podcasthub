/**
 * Client wrapper for the edit podcast page.
 *
 * Renders breadcrumb navigation and the PodcastUploadWizard in edit mode.
 * Handles navigation back to the dashboard on successful update.
 */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { PodcastUploadWizard } from '@/components/admin/podcast-upload-wizard';
import type { PodcastData } from '@/lib/types';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface EditPodcastClientProps {
  /** The podcast data to pre-fill the form with. */
  podcast: PodcastData;
}

/**
 * Renders the edit podcast wizard with breadcrumb navigation.
 */
export function EditPodcastClient({ podcast }: EditPodcastClientProps) {
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
            <BreadcrumbPage>Edit Podcast</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit Podcast</h1>
        <p className="text-muted-foreground">
          Update the details for &ldquo;{podcast.title}&rdquo;.
        </p>
      </div>

      <PodcastUploadWizard
        initialData={podcast}
        mode="edit"
        onSuccess={() => router.push('/admin')}
      />
    </div>
  );
}
