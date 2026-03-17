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
 * @property onStepClick - Called when the user clicks a completed step to navigate back.
 */
interface WizardStepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

/**
 * Renders a horizontal step indicator with connecting lines between steps.
 *
 * Completed steps are clickable buttons that navigate back. The active step
 * uses primary styling with bold label text. Future steps are muted and inert.
 *
 * @param props - Component props containing the current step index and click handler.
 * @returns A horizontal step indicator bar.
 */
export function WizardStepIndicator({ currentStep, onStepClick }: WizardStepIndicatorProps) {
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
