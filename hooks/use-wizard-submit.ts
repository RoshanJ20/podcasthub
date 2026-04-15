/**
 * useWizardSubmit — Custom hook that owns the final submission logic for AuditBriefUploadWizard.
 *
 * Key responsibilities:
 * - Manages the `isSubmitting` loading flag for the final form submission.
 * - Orchestrates file uploads (thumbnail, audio variants, bulletins) via the provided upload handles.
 * - Submits the assembled audit brief payload to the REST API (POST for create, PUT for edit).
 * - Saves short and long transcripts to their dedicated API endpoint after the audit brief is persisted.
 * - Redirects to /bulletins and invokes onSuccess on a successful save.
 *
 * @dependencies react, sonner, next/navigation
 *
 * @example
 * const { handleFinalSubmit, isSubmitting } = useWizardSubmit({
 *   mode: 'create',
 *   form,
 *   thumbnailFile,
 *   audioShortFile,
 *   audioLongFile,
 *   bulletinFiles,
 *   tags,
 *   shortTranscript,
 *   longTranscript,
 *   initialData,
 *   thumbnailUpload,
 *   audioShortUpload,
 *   audioLongUpload,
 *   bulletinUpload,
 *   onSuccess,
 * });
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';

import type { AuditBriefFormData } from '@/components/admin/audit-brief-upload-wizard';
import type { useFileUpload } from '@/hooks/use-file-upload';
import { withBasePath } from '@/lib/config/base-path';
import type { FormValues } from './wizard-state-types';

/** The subset of a useFileUpload handle required by useWizardSubmit. */
type FileUploadHandle = ReturnType<typeof useFileUpload>;

/**
 * Options accepted by useWizardSubmit.
 *
 * @property mode - Whether the wizard is creating or editing a auditBrief.
 * @property form - The react-hook-form instance for reading validated metadata values.
 * @property thumbnailFile - The staged thumbnail image file, or null if unchanged.
 * @property audioShortFile - The staged short-audio file, or null if unchanged.
 * @property audioLongFile - The staged long-audio file, or null if unchanged.
 * @property bulletinFiles - The staged bulletin/attachment files.
 * @property tags - The current tag string array.
 * @property shortTranscript - Raw text for the short transcript.
 * @property longTranscript - Raw text for the long transcript.
 * @property initialData - Pre-populated data for edit mode (provides existing URLs and the audit brief ID).
 * @property thumbnailUpload - useFileUpload handle for thumbnail uploads.
 * @property audioShortUpload - useFileUpload handle for short-audio uploads.
 * @property audioLongUpload - useFileUpload handle for long-audio uploads.
 * @property bulletinUpload - useFileUpload handle for bulletin uploads.
 * @property onSuccess - Optional callback invoked after a successful save.
 */
export interface UseWizardSubmitOptions {
  /** Whether the wizard is creating or editing. */
  mode: 'create' | 'edit';
  /** react-hook-form instance providing access to current metadata values. */
  form: UseFormReturn<FormValues>;
  /** Staged thumbnail image file, or null if no new thumbnail was selected. */
  thumbnailFile: File | null;
  /** Staged short-audio file, or null if no new file was selected. */
  audioShortFile: File | null;
  /** Staged long-audio file, or null if no new file was selected. */
  audioLongFile: File | null;
  /** Staged bulletin/attachment files. Empty array means no new files. */
  bulletinFiles: File[];
  /** Current tag string array to include in the saved payload. */
  tags: string[];
  /** Raw text of the short transcript. Empty string means no transcript to save. */
  shortTranscript: string;
  /** Raw text of the long transcript. Empty string means no transcript to save. */
  longTranscript: string;
  /** Pre-populated data used in edit mode for existing URLs and the audit brief ID. */
  initialData?: AuditBriefFormData;
  /** useFileUpload handle responsible for thumbnail file uploads. */
  thumbnailUpload: FileUploadHandle;
  /** useFileUpload handle responsible for short-audio file uploads. */
  audioShortUpload: FileUploadHandle;
  /** useFileUpload handle responsible for long-audio file uploads. */
  audioLongUpload: FileUploadHandle;
  /** useFileUpload handle responsible for bulletin/attachment file uploads. */
  bulletinUpload: FileUploadHandle;
  /** Optional callback invoked after a successful create or update. */
  onSuccess?: () => void;
}

/**
 * Return value of useWizardSubmit.
 *
 * @property handleFinalSubmit - Async handler that runs the full upload + save flow.
 * @property isSubmitting - True while the submission network requests are in flight.
 */
export interface UseWizardSubmitReturn {
  /**
   * Uploads all staged files, saves the audit brief via the API, saves transcripts,
   * and redirects to /bulletins on success.
   */
  handleFinalSubmit: () => Promise<void>;
  /** Whether the final API submission is currently in progress. */
  isSubmitting: boolean;
}

/**
 * Encapsulates the final submission flow for AuditBriefUploadWizard.
 *
 * Extracted from useWizardState to keep each hook under the 300-line limit
 * (Rule 5.4.2) and to give the submission concerns a single, dedicated home (SRP).
 *
 * @param options - Submission configuration (see UseWizardSubmitOptions).
 * @returns `handleFinalSubmit` handler and `isSubmitting` flag.
 */
export function useWizardSubmit({
  mode,
  form,
  thumbnailFile,
  audioShortFile,
  audioLongFile,
  bulletinFiles,
  tags,
  shortTranscript,
  longTranscript,
  initialData,
  thumbnailUpload,
  audioShortUpload,
  audioLongUpload,
  bulletinUpload,
  onSuccess,
}: UseWizardSubmitOptions): UseWizardSubmitReturn {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles the final submission: uploads files, saves audit brief via API,
   * and saves transcripts.
   *
   * Mirrors the submission flow from audit-brief-upload-form.tsx onSubmit handler.
   */
  const handleFinalSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const data = form.getValues();

      /* Validate thumbnail in create mode */
      if (mode === 'create' && !thumbnailFile) {
        toast.error('Thumbnail image is required');
        setIsSubmitting(false);
        return;
      }

      /* Upload files */
      let uploadedThumbnailUrl = initialData?.thumbnailUrl ?? '';
      let uploadedAudioShortUrl = initialData?.audioShortUrl ?? '';
      let uploadedAudioLongUrl = initialData?.audioLongUrl ?? null;
      let uploadedBulletinUrls = initialData?.bulletinUrls ?? [];

      if (thumbnailFile) {
        const key = await thumbnailUpload.upload(thumbnailFile, 'image');
        if (!key) {
          toast.error('Failed to upload thumbnail');
          setIsSubmitting(false);
          return;
        }
        uploadedThumbnailUrl = key;
      }

      if (audioShortFile) {
        const key = await audioShortUpload.upload(audioShortFile, 'audio');
        if (!key) {
          toast.error('Failed to upload short audio');
          setIsSubmitting(false);
          return;
        }
        uploadedAudioShortUrl = key;
      }

      if (audioLongFile) {
        const key = await audioLongUpload.upload(audioLongFile, 'audio');
        if (!key) {
          toast.error('Failed to upload long audio');
          setIsSubmitting(false);
          return;
        }
        uploadedAudioLongUrl = key;
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
        uploadedBulletinUrls = uploadedKeys;
      }

      /* Submit to API */
      // Include expectedUpdatedAt on edit so the server can detect concurrent
      // edits and reject stale writes with 409. Legacy payloads without this
      // field remain backward compatible with last-writer-wins behavior.
      const payload: Record<string, unknown> = {
        ...data,
        tags,
        thumbnailUrl: uploadedThumbnailUrl,
        audioShortUrl: uploadedAudioShortUrl,
        audioLongUrl: uploadedAudioLongUrl,
        bulletinUrls: uploadedBulletinUrls,
      };
      if (mode === 'edit' && initialData?.updatedAt) {
        payload.expectedUpdatedAt = initialData.updatedAt;
      }

      const url = withBasePath(
        mode === 'edit' ? `/api/audit-briefs/${initialData?.id}` : '/api/audit-briefs'
      );
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 409) {
        toast.error('This audit brief was modified by someone else. Please reload and try again.');
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message || 'Failed to save audit brief');
      }

      const savedAuditBrief = await response.json();
      const auditBriefId =
        (savedAuditBrief as { data?: { id?: string }; id?: string }).data?.id ??
        (savedAuditBrief as { id?: string }).id ??
        initialData?.id;

      /* Save transcripts if provided */
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

      // Redirect to bulletins page after successful submission
      router.push('/bulletins');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    form,
    mode,
    router,
    thumbnailFile,
    audioShortFile,
    audioLongFile,
    bulletinFiles,
    tags,
    shortTranscript,
    longTranscript,
    initialData,
    thumbnailUpload,
    audioShortUpload,
    audioLongUpload,
    bulletinUpload,
    onSuccess,
  ]);
  return { handleFinalSubmit, isSubmitting };
}
