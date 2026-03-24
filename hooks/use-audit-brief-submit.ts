/**
 * Custom hook encapsulating the submit logic for the audit brief upload/edit form.
 *
 * Key responsibilities:
 * - Orchestrates sequential file uploads (thumbnail, short audio, long audio,
 *   bulletin attachments) via the useFileUpload hooks passed in by the caller.
 * - Submits the assembled audit brief payload to the appropriate API endpoint
 *   (POST /api/audit-briefs for create, PUT /api/audit-briefs/:id for edit).
 * - Saves short and long transcript text to /api/audit-briefs/:id/transcript when
 *   transcript content is present.
 * - Surfaces success/error feedback via sonner toasts.
 * - Returns an `onSubmit` handler and an `isSubmitting` boolean for the form.
 *
 * Dependencies:
 * - sonner — toast notifications.
 * - useFileUpload — upload state and progress tracking per file category.
 * - lib/logger — structured server-side logging.
 *
 * Usage example:
 * ```ts
 * const { onSubmit, isSubmitting } = useAuditBriefSubmit({
 *   mode: 'create',
 *   initialData,
 *   tags,
 *   thumbnailFile,
 *   audioShortFile,
 *   audioLongFile,
 *   bulletinFiles,
 *   shortTranscript,
 *   longTranscript,
 *   thumbnailUpload,
 *   audioShortUpload,
 *   audioLongUpload,
 *   bulletinUpload,
 *   onSuccess,
 * });
 * ```
 */
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createLogger } from '@/lib/logger';
import { withBasePath } from '@/lib/config/base-path';
import type { AuditBriefFormData } from '@/components/admin/audit-brief-upload-form';

/**
 * Minimal subset of the useFileUpload return value required by this hook.
 * Mirrors the shape returned by useFileUpload without creating a cross-module
 * dependency on the hook's internal interface.
 */
interface FileUploadHandle {
  /** Whether an upload is currently in progress. */
  isUploading: boolean;
  /** Initiates an upload for the given file and category; resolves to the storage key or null. */
  upload: (file: File, category: string) => Promise<string | null>;
}

const log = createLogger('use-audit-brief-submit');

/** Shape of the form values object produced by the RHF schema. */
export interface AuditBriefFormValues {
  title: string;
  description: string;
  domain: string;
  year: number;
  tags?: string[];
}

interface UseAuditBriefSubmitOptions {
  /** Whether to POST (create) or PUT (edit) the auditBrief. */
  mode: 'create' | 'edit';
  /** Pre-existing audit brief data used in edit mode. */
  initialData?: AuditBriefFormData;
  /** Current tag list managed by the parent form. */
  tags: string[];
  /** Selected thumbnail image file, or null when unchanged. */
  thumbnailFile: File | null;
  /** Selected short audio file, or null when unchanged. */
  audioShortFile: File | null;
  /** Selected long audio file, or null when unchanged. */
  audioLongFile: File | null;
  /** Selected bulletin/attachment files; empty array when unchanged. */
  bulletinFiles: File[];
  /** Short transcript text loaded from a file or pre-existing data. */
  shortTranscript: string;
  /** Long transcript text loaded from a file or pre-existing data. */
  longTranscript: string;
  /** Upload hook instance for the thumbnail field. */
  thumbnailUpload: FileUploadHandle;
  /** Upload hook instance for the short audio field. */
  audioShortUpload: FileUploadHandle;
  /** Upload hook instance for the long audio field. */
  audioLongUpload: FileUploadHandle;
  /** Upload hook instance for the bulletin/attachments field. */
  bulletinUpload: FileUploadHandle;
  /** Called after a successful audit brief save (create or edit). */
  onSuccess?: () => void;
}

interface UseAuditBriefSubmitReturn {
  /**
   * RHF-compatible submit handler.
   * Pass directly to `handleSubmit(onSubmit)` in the form.
   */
  onSubmit: (data: AuditBriefFormValues) => Promise<void>;
  /** True while upload or API requests are in flight. */
  isSubmitting: boolean;
}

/**
 * Returns a submit handler and submitting state for the audit brief upload/edit form.
 *
 * @param options - Configuration including mode, files, transcripts, upload hooks,
 *   and the success callback.
 * @returns `onSubmit` async handler and `isSubmitting` boolean.
 */
export function useAuditBriefSubmit({
  mode,
  initialData,
  tags,
  thumbnailFile,
  audioShortFile,
  audioLongFile,
  bulletinFiles,
  shortTranscript,
  longTranscript,
  thumbnailUpload,
  audioShortUpload,
  audioLongUpload,
  bulletinUpload,
  onSuccess,
}: UseAuditBriefSubmitOptions): UseAuditBriefSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: AuditBriefFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      // Validate required files in create mode
      if (mode === 'create') {
        if (!thumbnailFile) {
          toast.error('Thumbnail image is required');
          setIsSubmitting(false);
          return;
        }
      }

      // Upload files
      let thumbnailUrl = initialData?.thumbnailUrl ?? '';
      let audioShortUrl = initialData?.audioShortUrl ?? '';
      let audioLongUrl = initialData?.audioLongUrl ?? null;
      let bulletinUrls = initialData?.bulletinUrls ?? [];

      if (thumbnailFile) {
        const key = await thumbnailUpload.upload(thumbnailFile, 'image');
        if (!key) {
          toast.error('Failed to upload thumbnail');
          setIsSubmitting(false);
          return;
        }
        thumbnailUrl = key;
      }

      if (audioShortFile) {
        const key = await audioShortUpload.upload(audioShortFile, 'audio');
        if (!key) {
          toast.error('Failed to upload short audio');
          setIsSubmitting(false);
          return;
        }
        audioShortUrl = key;
      }

      if (audioLongFile) {
        const key = await audioLongUpload.upload(audioLongFile, 'audio');
        if (!key) {
          toast.error('Failed to upload long audio');
          setIsSubmitting(false);
          return;
        }
        audioLongUrl = key;
      }

      if (bulletinFiles.length > 0) {
        const uploadedKeys: string[] = [];
        for (const file of bulletinFiles) {
          const key = await bulletinUpload.upload(file, 'pdf');
          if (!key) {
            toast.error(`Failed to upload attachment: ${file.name}`);
            setIsSubmitting(false);
            return;
          }
          uploadedKeys.push(key);
        }
        bulletinUrls = uploadedKeys;
      }

      // Submit to API
      const payload = {
        ...data,
        tags,
        thumbnailUrl,
        audioShortUrl,
        audioLongUrl,
        bulletinUrls,
      };

      const url = withBasePath(
        mode === 'edit' ? `/api/audit-briefs/${initialData?.id}` : '/api/audit-briefs'
      );
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        log.warn({ error: body.message ?? String(body) }, 'Audit brief save failed');
        throw new Error(body.message || 'Failed to save audit brief');
      }

      const savedAuditBrief = await response.json();
      const auditBriefId = savedAuditBrief.data?.id ?? savedAuditBrief.id ?? initialData?.id;

      // Save transcripts if provided
      if (auditBriefId) {
        if (shortTranscript.trim()) {
          await fetch(withBasePath(`/api/audit-briefs/${auditBriefId}/transcript`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullText: shortTranscript.trim(),
              segments: [],
              transcriptType: 'short',
            }),
          });
        }
        if (longTranscript.trim()) {
          await fetch(withBasePath(`/api/audit-briefs/${auditBriefId}/transcript`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullText: longTranscript.trim(),
              segments: [],
              transcriptType: 'long',
            }),
          });
        }
      }

      toast.success(
        mode === 'create' ? 'Audit brief created successfully' : 'Audit brief updated successfully'
      );
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { onSubmit, isSubmitting };
}
