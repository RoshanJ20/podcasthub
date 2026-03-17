/**
 * WizardNavigationControls — Bottom navigation bar for the PodcastUploadWizard.
 *
 * Key responsibilities:
 * - Renders the Back button (hidden on step 0).
 * - Renders the Next button on all steps except the last.
 * - Renders the Submit button with loading state on the final step.
 * - Displays per-step hint text below the step content.
 *
 * @dependencies lucide-react, @/components/ui/button
 */
'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Total number of steps in the wizard flow (must match TOTAL_STEPS in use-wizard-state). */
const TOTAL_STEPS = 3;

/**
 * Props for WizardNavigationControls.
 *
 * @property currentStep - Zero-indexed active step number.
 * @property isSubmitting - Whether the final API submission is in progress.
 * @property isUploading - Whether any file upload is currently in progress.
 * @property onBack - Called when the user clicks the Back button.
 * @property onNext - Called when the user clicks the Next button.
 * @property onSubmit - Called when the user clicks the Submit button on the final step.
 */
export interface WizardNavigationControlsProps {
  /** Zero-indexed current step (0 = Details, 1 = Content, 2 = Review). */
  currentStep: number;
  /** Whether the final API submission is in progress. Disables Submit while true. */
  isSubmitting: boolean;
  /** Whether any file upload is in progress. Disables Submit while true. */
  isUploading: boolean;
  /** Handler for the Back button. */
  onBack: () => void;
  /** Handler for the Next button. */
  onNext: () => void;
  /** Handler for the Submit button (final step only). */
  onSubmit: () => void;
}

/**
 * Renders the Back / Next / Submit navigation buttons and per-step hint text
 * for PodcastUploadWizard.
 *
 * @param props - Navigation control props (see WizardNavigationControlsProps).
 * @returns A flex row with Back on the left and Next/Submit on the right, plus hint text above.
 */
export function WizardNavigationControls({
  currentStep,
  isSubmitting,
  isUploading,
  onBack,
  onNext,
  onSubmit,
}: WizardNavigationControlsProps) {
  return (
    <>
      <p className="text-sm text-muted-foreground italic mt-4">
        {currentStep === 1
          ? '* At least one audio file is required'
          : currentStep === 0
            ? 'All fields marked with * are mandatory'
            : null}
      </p>

      <div className="flex justify-between mt-3">
        {currentStep > 0 && (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {currentStep < TOTAL_STEPS - 1 && <Button onClick={onNext}>Next</Button>}
          {currentStep === TOTAL_STEPS - 1 && (
            <Button onClick={onSubmit} disabled={isSubmitting || isUploading}>
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
    </>
  );
}
