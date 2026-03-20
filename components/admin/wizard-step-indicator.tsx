'use client';

/**
 * Step indicator for admin upload wizards.
 *
 * Shows ordered steps with active/completed/future states.
 * Active and completed steps use primary color; future steps are muted.
 * Completed steps show a check icon instead of a number.
 * Accepts a custom steps array so it can be reused across different wizards.
 *
 * @dependencies lucide-react for the Check icon.
 */
import { Check } from 'lucide-react';

/** Default step labels for the audit brief upload wizard. */
const DEFAULT_STEPS = ['Details', 'Content', 'Review'] as const;

/**
 * Props for WizardStepIndicator.
 *
 * @property steps - Ordered step labels. Defaults to the audit brief upload steps.
 * @property currentStep - Zero-indexed active step number.
 * @property onStepClick - Called when the user clicks a completed step to navigate back.
 */
interface WizardStepIndicatorProps {
  steps?: readonly string[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

/**
 * Renders a horizontal step indicator with connecting lines between steps.
 *
 * Completed steps are clickable buttons that navigate back. The active step
 * uses primary styling with bold label text. Future steps are muted and inert.
 *
 * @param props - Component props containing step labels, the current step index, and click handler.
 * @returns A horizontal step indicator bar.
 */
export function WizardStepIndicator({
  steps = DEFAULT_STEPS,
  currentStep,
  onStepClick,
}: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {/* Connecting line between steps */}
            {index > 0 && (
              <div className={`h-px w-12 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
            )}
            <button
              type="button"
              disabled={!isCompleted}
              onClick={() => isCompleted && onStepClick(index)}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              {/* Step circle: check icon for completed, number for active/future */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-opacity ${
                  isActive || isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                } ${isCompleted ? 'hover:opacity-80' : ''}`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {/* Step label */}
              <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
