/**
 * useWizardState — Custom hook encapsulating all state and logic for the AuditBriefUploadWizard.
 *
 * Key responsibilities:
 * - Manages current step index and exposes goToStep navigation helper.
 * - Owns all file state: thumbnail, audio (short + long), bulletins, transcripts, and tags.
 * - Instantiates and aggregates the four useFileUpload hooks (thumbnail, audioShort, audioLong, bulletin).
 * - Initialises the react-hook-form instance with Zod validation.
 * - Provides handleThumbnailChange, handleTagsChange, and handleNext handlers.
 * - Delegates final submission logic to useWizardSubmit.
 *
 * @dependencies react-hook-form, zod, sonner, useFileUpload, useWizardSubmit, next/navigation
 *
 * @example
 * const wizardState = useWizardState({ mode: 'create', initialData, onSuccess, onStepChange });
 * const { currentStep, form, handleNext, handleFinalSubmit } = wizardState;
 */
'use client';

import { useState, useCallback } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useFileUpload } from '@/hooks/use-file-upload';
import { useWizardSubmit } from './use-wizard-submit';
import { formSchema, TOTAL_STEPS } from './wizard-state-types';
import type { FormValues, UseWizardStateOptions, UseWizardStateReturn } from './wizard-state-types';

/**
 * Encapsulates all stateful wizard logic for AuditBriefUploadWizard.
 *
 * Separates business/upload logic from the presentational component tree so that
 * the wizard component itself can focus purely on rendering.
 *
 * @param options - Wizard configuration (see UseWizardStateOptions).
 * @returns All state values and event handlers needed by the wizard UI.
 */
export function useWizardState({
  mode = 'create',
  initialData,
  onSuccess,
  onStepChange,
}: UseWizardStateOptions): UseWizardStateReturn {
  /* ---------- Step navigation state ---------- */
  const [currentStep, setCurrentStep] = useState(0);

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      onStepChange?.(step);
    },
    [onStepChange]
  );

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

  /* ---------- React Hook Form ---------- */
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      domain: initialData?.domain ?? '',
      year: initialData?.year ?? new Date().getFullYear(),
    },
  });

  /* ---------- Resolved URLs from initialData for display ---------- */
  const audioShortUrl = initialData?.audioShortUrl ?? null;
  const audioLongUrl = initialData?.audioLongUrl ?? null;
  const bulletinUrls = initialData?.bulletinUrls ?? [];

  /* ---------- Final submission (delegated) ---------- */
  const { handleFinalSubmit, isSubmitting } = useWizardSubmit({
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
  });

  /* ---------- Handlers ---------- */

  /**
   * Handles thumbnail file selection, updating file state and the preview URL.
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
   * Step 1: Requires at least one audio file (short or long).
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

      goToStep(1);
      return;
    }

    if (currentStep === 1) {
      /* Require at least one audio file — new or previously uploaded */
      const hasAudio = audioShortFile || audioLongFile || audioShortUrl || audioLongUrl;
      if (!hasAudio) {
        toast.error('At least one audio file is required');
        return;
      }
      goToStep(2);
      return;
    }

    if (currentStep < TOTAL_STEPS - 1) {
      goToStep(currentStep + 1);
    }
  }, [
    currentStep,
    form,
    mode,
    thumbnailFile,
    audioShortFile,
    audioLongFile,
    audioShortUrl,
    audioLongUrl,
    goToStep,
  ]);

  return {
    currentStep,
    goToStep,
    form,
    thumbnailFile,
    thumbnailPreview,
    audioShortFile,
    audioLongFile,
    bulletinFiles,
    shortTranscript,
    setShortTranscript,
    longTranscript,
    setLongTranscript,
    tags,
    isUploading,
    uploadProgress,
    isSubmitting,
    setAudioShortFile,
    setAudioLongFile,
    setBulletinFiles,
    handleThumbnailChange,
    handleTagsChange,
    handleNext,
    handleFinalSubmit,
    audioShortUrl,
    audioLongUrl,
    bulletinUrls,
  };
}
