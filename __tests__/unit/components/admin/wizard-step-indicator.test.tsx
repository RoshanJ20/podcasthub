/**
 * Unit tests for WizardStepIndicator component.
 *
 * Verifies:
 * - Renders all three step labels: Details, Content, Review
 * - Active step has correct styling (font-medium)
 * - Completed steps show a check icon instead of a number
 * - Future steps show muted styling
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import { WizardStepIndicator } from '@/components/admin/wizard-step-indicator';

/**
 * Retrieves all step label elements (spans with text-sm class).
 *
 * @param container - The DOM container to search in.
 * @returns Array of span elements representing step labels.
 */
function getStepLabels(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('span.text-sm'));
}

describe('WizardStepIndicator', () => {
  it('renders all three step labels: Details, Content, Review', () => {
    const { container } = render(<WizardStepIndicator currentStep={0} onStepClick={vi.fn()} />);

    const labels = getStepLabels(container);
    expect(labels).toHaveLength(3);
    expect(labels[0].textContent).toBe('Details');
    expect(labels[1].textContent).toBe('Content');
    expect(labels[2].textContent).toBe('Review');
  });

  it('applies active styling to the current step (currentStep=0)', () => {
    const { container } = render(<WizardStepIndicator currentStep={0} onStepClick={vi.fn()} />);

    const labels = getStepLabels(container);

    /* Details is active — should have font-medium */
    expect(labels[0]).toHaveClass('font-medium');

    /* Content and Review are future — should be muted, not bold */
    expect(labels[1]).toHaveClass('text-muted-foreground');
    expect(labels[1]).not.toHaveClass('font-medium');

    expect(labels[2]).toHaveClass('text-muted-foreground');
    expect(labels[2]).not.toHaveClass('font-medium');
  });

  it('shows check icon for completed step and active styling on step 2 (currentStep=1)', () => {
    const { container } = render(<WizardStepIndicator currentStep={1} onStepClick={vi.fn()} />);

    /* Step 1 (Details) is completed — should show check icon, not the number 1 */
    const checkIcons = container.querySelectorAll('svg');
    expect(checkIcons.length).toBe(1);

    /* The number "1" should not appear since step 1 is completed */
    const stepCircles = container.querySelectorAll('.rounded-full');
    expect(stepCircles[0].textContent).not.toBe('1');

    /* Step 2 (Content) is active */
    const labels = getStepLabels(container);
    expect(labels[1]).toHaveClass('font-medium');

    /* Step 2 circle should show number 2 */
    expect(stepCircles[1].textContent).toBe('2');

    /* Step 3 (Review) is future — muted */
    expect(labels[2]).toHaveClass('text-muted-foreground');
  });

  it('shows check icons for steps 1 and 2, active styling on step 3 (currentStep=2)', () => {
    const { container } = render(<WizardStepIndicator currentStep={2} onStepClick={vi.fn()} />);

    /* Steps 1 and 2 are completed — should show 2 check icons */
    const checkIcons = container.querySelectorAll('svg');
    expect(checkIcons.length).toBe(2);

    /* Step 3 (Review) is active */
    const labels = getStepLabels(container);
    expect(labels[2]).toHaveClass('font-medium');

    /* Step 3 circle should show number 3 */
    const stepCircles = container.querySelectorAll('.rounded-full');
    expect(stepCircles[2].textContent).toBe('3');
  });
});
