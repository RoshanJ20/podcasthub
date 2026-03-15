/**
 * Admin upload page for creating new podcasts.
 *
 * Renders the PodcastUploadForm in create mode with a breadcrumb
 * navigation trail showing Dashboard > Upload.
 */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { PodcastUploadForm } from '@/components/admin/podcast-upload-form';

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
        <p className="text-muted-foreground">Fill in the details below to create a new podcast.</p>
      </div>

      <div className="max-w-2xl">
        <PodcastUploadForm mode="create" onSuccess={() => router.push('/admin')} />
      </div>
    </div>
  );
}
