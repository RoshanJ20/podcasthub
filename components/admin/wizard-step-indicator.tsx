'use client';

/**
 * Step indicator for the podcast upload wizard.
 *
 * Shows three steps (Details, Content, Review) with active/completed/future states.
 * Active and completed steps use primary color; future steps are muted.
 * Completed steps show a check icon instead of a number.
 *
 * @dependencies lucide-react for the Check icon.
 */
import { Check } from 'lucide-react';

/** Ordered labels for each wizard step. */
const STEPS = ['Details', 'Content', 'Review'] as const;

/**
 * Props for WizardStepIndicator.
 *
 * @property currentStep - Zero-indexed step number (0 = Details, 1 = Content, 2 = Review).
 */
interface WizardStepIndicatorProps {
  currentStep: number;
}

/**
 * Renders a horizontal step indicator with connecting lines between steps.
 *
 * Each step displays a numbered circle and label. Completed steps replace
 * the number with a check icon and use primary styling. The active step
 * uses primary styling with bold label text. Future steps are muted.
 *
 * @param props - Component props containing the current step index.
 * @returns A horizontal step indicator bar.
 */
export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {/* Connecting line between steps */}
            {index > 0 && (
              <div className={`h-px w-12 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
            )}
            <div className="flex items-center gap-2">
              {/* Step circle: check icon for completed, number for active/future */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isActive || isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {/* Step label: bold for active, muted for others */}
              <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
