/**
 * Client wrapper for the edit podcast page.
 *
 * Renders breadcrumb navigation and the PodcastUploadWizard in edit mode.
 * Handles navigation back to the dashboard on successful update.
 */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { PodcastUploadWizard } from '@/components/admin/podcast-upload-wizard';
import type { PodcastData } from '@/lib/types';

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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Edit Podcast</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Podcast</h1>
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
