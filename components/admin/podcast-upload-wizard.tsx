/**
 * PodcastUploadWizard — Main orchestrator for the three-step podcast upload flow.
 *
 * Manages all form state, file uploads, step navigation, per-step validation,
 * and final submission. Wraps the individual step components:
 * WizardStepIndicator, WizardStepDetails, WizardStepContent, WizardStepReview.
 *
 * Key responsibilities:
 * - Delegates all stateful logic to useWizardState hook
 * - Renders the active step component based on currentStep
 * - Exposes a ref handle (goBack, currentStep) for external parent control
 *
 * @dependencies react-hook-form, useWizardState, wizard step components, WizardNavigationControls
 */
'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { FormProvider } from 'react-hook-form';

import { WizardStepIndicator } from '@/components/admin/wizard-step-indicator';
import { WizardStepDetails } from '@/components/admin/wizard-step-details';
import { WizardStepContent } from '@/components/admin/wizard-step-content';
import { WizardStepReview } from '@/components/admin/wizard-step-review';
import { WizardNavigationControls } from '@/components/admin/wizard-navigation-controls';
import { useWizardState } from '@/hooks/use-wizard-state';
import type { PodcastData } from '@/lib/types';

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
  /** Callback invoked whenever the active step changes. */
  onStepChange?: (step: number) => void;
}

/** Imperative handle exposed via ref for external step control. */
export interface PodcastUploadWizardHandle {
  /** Navigate to the previous step, or no-op if already on step 0. */
  goBack: () => void;
  /** The current zero-indexed step number. */
  currentStep: number;
}

/**
 * Main wizard component orchestrating the three-step podcast upload flow.
 *
 * Step 0 (Details): Metadata fields — title, description, domain, year, tags, thumbnail.
 * Step 1 (Content): Audio files, attachments, and transcripts.
 * Step 2 (Review): Read-only review of all entered data with Submit button.
 *
 * @param props - Component props (see PodcastUploadWizardProps).
 * @param ref - Optional ref exposing goBack() and currentStep for parent control.
 * @returns The wizard UI with step indicator, current step content, and navigation controls.
 */
export const PodcastUploadWizard = forwardRef<PodcastUploadWizardHandle, PodcastUploadWizardProps>(
  function PodcastUploadWizard({ mode = 'create', initialData, onSuccess, onStepChange }, ref) {
    const {
      currentStep,
      goToStep,
      form,
      thumbnailFile,
      thumbnailPreview,
      audioShortFile,
      setAudioShortFile,
      audioLongFile,
      setAudioLongFile,
      bulletinFiles,
      setBulletinFiles,
      shortTranscript,
      setShortTranscript,
      longTranscript,
      setLongTranscript,
      tags,
      isUploading,
      uploadProgress,
      isSubmitting,
      handleThumbnailChange,
      handleTagsChange,
      handleNext,
      handleFinalSubmit,
      audioShortUrl,
      audioLongUrl,
      bulletinUrls,
    } = useWizardState({ mode, initialData, onSuccess, onStepChange });

    useImperativeHandle(
      ref,
      () => ({
        goBack: () => goToStep(Math.max(0, currentStep - 1)),
        currentStep,
      }),
      [currentStep, goToStep]
    );

    return (
      <div className="w-full py-6">
        <WizardStepIndicator currentStep={currentStep} onStepClick={goToStep} />

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
            onBulletinsChange={(files) => setBulletinFiles((prev) => [...prev, ...files])}
            onBulletinRemove={(index) =>
              setBulletinFiles((prev) => prev.filter((_, i) => i !== index))
            }
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

        <WizardNavigationControls
          currentStep={currentStep}
          isSubmitting={isSubmitting}
          isUploading={isUploading}
          onBack={() => goToStep(currentStep - 1)}
          onNext={handleNext}
          onSubmit={handleFinalSubmit}
        />
      </div>
    );
  }
);
PodcastUploadWizard.displayName = 'PodcastUploadWizard';
