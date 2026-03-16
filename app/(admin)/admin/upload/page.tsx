/**
 * Admin upload page for creating new podcasts.
 *
 * Renders the PodcastUploadWizard in create mode with a breadcrumb
 * navigation trail showing Dashboard > Upload.
 */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { PodcastUploadWizard } from '@/components/admin/podcast-upload-wizard';

export default function UploadPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Upload</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload New Podcast</h1>
      </div>

      <PodcastUploadWizard mode="create" onSuccess={() => router.push('/admin')} />
    </div>
  );
}
