/**
 * PodcastUploadWizard — Main orchestrator for the three-step podcast upload flow.
 *
 * Manages all form state, file uploads, step navigation, per-step validation,
 * and final submission. Wraps the individual step components:
 * WizardStepIndicator, WizardStepDetails, WizardStepContent, WizardStepReview.
 *
 * Key responsibilities:
 * - Orchestrates react-hook-form + Zod validation for metadata fields
 * - Manages file state (thumbnail, audio, bulletins, transcripts) via useState
 * - Controls step navigation with per-step validation gates
 * - Handles file uploads via useFileUpload hooks and final API submission
 *
 * @dependencies react-hook-form, zod, sonner, useFileUpload hook, wizard step components
 */
'use client';

import { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/use-file-upload';
import { WizardStepIndicator } from '@/components/admin/wizard-step-indicator';
import { WizardStepDetails } from '@/components/admin/wizard-step-details';
import { WizardStepContent } from '@/components/admin/wizard-step-content';
import { WizardStepReview } from '@/components/admin/wizard-step-review';
import type { PodcastData } from '@/lib/types';

/** Zod schema for the metadata fields validated by react-hook-form. */
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  domain: z.string().min(1, 'Domain is required'),
  year: z.coerce.number().int().min(2020).max(2099),
});

/** Inferred type for the form schema values. */
type FormValues = z.infer<typeof formSchema>;

/** Mapped type used for initialData prop. */
export type PodcastFormData = Partial<PodcastData>;

/**
 * Props for the PodcastUploadWizard component.
 *
 * @property mode - Whether the wizard is creating a new podcast or editing an existing one.
 * @property initialData - Pre-filled data when editing an existing podcast.
 * @property onSuccess - Callback invoked after a successful submission.
 */
export interface PodcastUploadWizardProps {
  /** Whether the wizard is creating or editing. Defaults to 'create'. */
  mode?: 'create' | 'edit';
  /** Pre-filled data for editing an existing podcast. */
  initialData?: PodcastFormData;
  /** Callback invoked after a successful create or update. */
  onSuccess?: () => void;
}

/** Total number of steps in the wizard flow. */
const TOTAL_STEPS = 3;

/**
 * Main wizard component orchestrating the three-step podcast upload flow.
 *
 * Step 0 (Details): Metadata fields — title, description, domain, year, tags, thumbnail.
 * Step 1 (Content): Audio files, attachments, and transcripts.
 * Step 2 (Review): Read-only review of all entered data with Submit button.
 *
 * @param props - Component props (see PodcastUploadWizardProps).
 * @returns The wizard UI with step indicator, current step content, and navigation controls.
 */
export function PodcastUploadWizard({
  mode = 'create',
  initialData,
  onSuccess,
}: PodcastUploadWizardProps) {
  /* ---------- Step navigation state ---------- */
  const [currentStep, setCurrentStep] = useState(0);

  /* ---------- File state ---------- */
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    initialData?.thumbnailUrl ?? null
  );
  const [audioShortFile, setAudioShortFile] = useState<File | null>(null);
  const [audioLongFile, setAudioLongFile] = useState<File | null>(null);
  const [bulletinFiles, setBulletinFiles] = useState<File[]>([]);
  const [shortTranscript, setShortTranscript] = useState('');
  const [longTranscript, setLongTranscript] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);

  /* ---------- Upload hooks ---------- */
  const thumbnailUpload = useFileUpload();
  const audioShortUpload = useFileUpload();
  const audioLongUpload = useFileUpload();
  const bulletinUpload = useFileUpload();

  const isUploading =
    thumbnailUpload.isUploading ||
    audioShortUpload.isUploading ||
    audioLongUpload.isUploading ||
    bulletinUpload.isUploading;

  /** Aggregated upload progress across all active uploads. */
  const uploadProgress = Math.max(
    thumbnailUpload.progress,
    audioShortUpload.progress,
    audioLongUpload.progress,
    bulletinUpload.progress
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---------- React Hook Form ---------- */
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      domain: initialData?.domain ?? '',
      year: initialData?.year ?? new Date().getFullYear(),
    },
  });

  /* ---------- File state for review display ---------- */
  const audioShortUrl = initialData?.audioShortUrl ?? null;
  const audioLongUrl = initialData?.audioLongUrl ?? null;
  const bulletinUrls = initialData?.bulletinUrls ?? [];

  /* ---------- Handlers ---------- */

  /**
   * Handles thumbnail file selection, updates file state and preview URL.
   *
   * @param file - The selected thumbnail image file.
   */
  const handleThumbnailChange = useCallback((file: File) => {
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }, []);

  /**
   * Handles tag list changes from WizardStepDetails.
   *
   * @param newTags - The updated array of tag strings.
   */
  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
  }, []);

  /**
   * Validates the current step and advances to the next step if valid.
   *
   * Step 0: Triggers form validation on metadata fields + checks thumbnail (create mode).
   * Step 1: No required fields — advances immediately.
   */
  const handleNext = useCallback(async () => {
    if (currentStep === 0) {
      /* Validate metadata fields via react-hook-form trigger */
      const isValid = await form.trigger(['title', 'description', 'domain', 'year']);

      if (!isValid) return;

      /* Validate thumbnail in create mode */
      if (mode === 'create' && !thumbnailFile) {
        toast.error('Thumbnail image is required');
        return;
      }

      setCurrentStep(1);
      return;
    }

    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, form, mode, thumbnailFile]);

  /**
   * Handles the final submission: uploads files, saves podcast via API,
   * and saves transcripts.
   *
   * Mirrors the submission flow from podcast-upload-form.tsx onSubmit handler.
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
      const payload = {
        ...data,
        tags,
        thumbnailUrl: uploadedThumbnailUrl,
        audioShortUrl: uploadedAudioShortUrl,
        audioLongUrl: uploadedAudioLongUrl,
        bulletinUrls: uploadedBulletinUrls,
      };

      const url = mode === 'edit' ? `/api/podcasts/${initialData?.id}` : '/api/podcasts';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message || 'Failed to save podcast');
      }

      const savedPodcast = await response.json();
      const podcastId =
        (savedPodcast as { data?: { id?: string }; id?: string }).data?.id ??
        (savedPodcast as { id?: string }).id ??
        initialData?.id;

      /* Save transcripts if provided */
      if (podcastId) {
        if (shortTranscript.trim()) {
          await fetch(`/api/podcasts/${podcastId}/transcript`, {
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
          await fetch(`/api/podcasts/${podcastId}/transcript`, {
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
        mode === 'create' ? 'Podcast created successfully' : 'Podcast updated successfully'
      );
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    form,
    mode,
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

  return (
    <div className="container max-w-3xl py-6">
      <WizardStepIndicator currentStep={currentStep} />

      {/* Step 0: Details (wrapped in FormProvider for useFormContext) */}
      {currentStep === 0 && (
        <FormProvider {...form}>
          <WizardStepDetails
            mode={mode}
            thumbnailPreview={thumbnailPreview}
            onThumbnailChange={handleThumbnailChange}
            tags={tags}
            onTagsChange={handleTagsChange}
          />
        </FormProvider>
      )}

      {/* Step 1: Content */}
      {currentStep === 1 && (
        <WizardStepContent
          audioShortUrl={audioShortUrl}
          audioShortFileName={audioShortFile?.name ?? null}
          onAudioShortChange={(file) => setAudioShortFile(file)}
          audioLongUrl={audioLongUrl}
          audioLongFileName={audioLongFile?.name ?? null}
          onAudioLongChange={(file) => setAudioLongFile(file)}
          bulletinUrls={bulletinUrls}
          bulletinFileNames={bulletinFiles.map((f) => f.name)}
          onBulletinsChange={(files) => setBulletinFiles(Array.from(files))}
          shortTranscript={shortTranscript}
          onShortTranscriptChange={setShortTranscript}
          longTranscript={longTranscript}
          onLongTranscriptChange={setLongTranscript}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Step 2: Review */}
      {currentStep === 2 && (
        <WizardStepReview
          title={form.getValues('title')}
          description={form.getValues('description')}
          domain={form.getValues('domain')}
          year={form.getValues('year')}
          tags={tags}
          thumbnailUrl={thumbnailPreview}
          thumbnailFileName={thumbnailFile?.name ?? null}
          audioShortUrl={audioShortUrl}
          audioShortFileName={audioShortFile?.name ?? null}
          audioLongUrl={audioLongUrl}
          audioLongFileName={audioLongFile?.name ?? null}
          bulletinFileNames={bulletinFiles.map((f) => f.name)}
          shortTranscript={shortTranscript}
          longTranscript={longTranscript}
        />
      )}

      {/* Navigation controls */}
      <div className="flex justify-between mt-6">
        {currentStep > 0 && (
          <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
            Back
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {currentStep < TOTAL_STEPS - 1 && <Button onClick={handleNext}>Next</Button>}
          {currentStep === TOTAL_STEPS - 1 && (
            <Button onClick={handleFinalSubmit} disabled={isSubmitting || isUploading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground italic mt-4">
        All fields marked with * are mandatory
      </p>
    </div>
  );
}
