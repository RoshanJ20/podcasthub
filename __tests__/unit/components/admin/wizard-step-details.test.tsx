/**
 * Unit tests for WizardStepDetails component.
 *
 * Verifies:
 * - Renders all 6 field labels (Title, Description, Domain, Year, Tags, Thumbnail Image)
 * - Title, Description, Domain, Year have `*` required indicators
 * - Thumbnail has `*` in create mode
 * - Thumbnail does NOT have `*` in edit mode
 * - Domain dropdown contains all PODCAST_DOMAINS values (5 items)
 * - No "(Optional)" text appears anywhere
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { type ReactNode } from 'react';

import {
  WizardStepDetails,
  type WizardStepDetailsProps,
} from '@/components/admin/wizard-step-details';
import { PODCAST_DOMAINS } from '@/lib/schemas/common';

/**
 * Wrapper component that provides a react-hook-form FormProvider context.
 *
 * Uses default empty values matching the wizard form shape so that
 * useFormContext() works inside the component under test.
 *
 * @param props.children - The component tree to wrap.
 * @returns The children wrapped in a FormProvider.
 */
function FormWrapper({ children }: { children: ReactNode }) {
  const methods = useForm({
    defaultValues: {
      title: '',
      description: '',
      domain: '',
      year: new Date().getFullYear(),
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

/**
 * Builds a complete set of default props for WizardStepDetails.
 *
 * @param overrides - Partial props to override defaults.
 * @returns Merged WizardStepDetailsProps.
 */
function buildProps(overrides: Partial<WizardStepDetailsProps> = {}): WizardStepDetailsProps {
  return {
    mode: 'create',
    thumbnailPreview: null,
    onThumbnailChange: vi.fn(),
    tags: [],
    onTagsChange: vi.fn(),
    ...overrides,
  };
}

/**
 * Finds a label element by its htmlFor attribute value.
 *
 * @param container - The DOM container to search in.
 * @param htmlFor - The htmlFor attribute value to match.
 * @returns The matching label element, or null if not found.
 */
function getLabelByFor(container: HTMLElement, htmlFor: string): HTMLLabelElement | null {
  return container.querySelector(`label[for="${htmlFor}"]`);
}

/**
 * Renders WizardStepDetails wrapped in a FormProvider with the given props.
 *
 * @param props - Props to pass to WizardStepDetails.
 * @returns The render result from @testing-library/react.
 */
function renderComponent(overrides: Partial<WizardStepDetailsProps> = {}) {
  const props = buildProps(overrides);
  return render(
    <FormWrapper>
      <WizardStepDetails {...props} />
    </FormWrapper>
  );
}

describe('WizardStepDetails', () => {
  it('renders all 6 field labels', () => {
    renderComponent();

    expect(screen.getByText(/Title/)).toBeInTheDocument();
    expect(screen.getByText(/Description/)).toBeInTheDocument();
    expect(screen.getByText(/Domain/)).toBeInTheDocument();
    expect(screen.getByText(/Year/)).toBeInTheDocument();
    expect(screen.getByText(/Tags/)).toBeInTheDocument();
    expect(screen.getByText(/^Thumbnail/)).toBeInTheDocument();
  });

  it('renders * indicator on Title, Description, Domain, and Year labels', () => {
    const { container } = renderComponent();

    const titleLabel = getLabelByFor(container, 'title');
    const descriptionLabel = getLabelByFor(container, 'description');
    const domainLabel = getLabelByFor(container, 'domain');
    const yearLabel = getLabelByFor(container, 'year');

    expect(titleLabel?.textContent).toContain('*');
    expect(descriptionLabel?.textContent).toContain('*');
    expect(domainLabel?.textContent).toContain('*');
    expect(yearLabel?.textContent).toContain('*');
  });

  it('renders * indicator on Thumbnail Image label in create mode', () => {
    const { container } = renderComponent({ mode: 'create' });

    const thumbnailLabel = getLabelByFor(container, 'thumbnail');
    expect(thumbnailLabel?.textContent).toContain('*');
  });

  it('does NOT render * indicator on Thumbnail Image label in edit mode', () => {
    const { container } = renderComponent({ mode: 'edit' });

    const thumbnailLabel = getLabelByFor(container, 'thumbnail');
    expect(thumbnailLabel?.textContent).not.toContain('*');
  });

  it('renders all PODCAST_DOMAINS values in the Domain dropdown', () => {
    const { container } = renderComponent();

    const selectElement = container.querySelector('select[name="domain"]');
    expect(selectElement).toBeInTheDocument();

    /* Collect all non-disabled option values */
    const optionElements = selectElement!.querySelectorAll('option:not([disabled])');
    const optionValues = Array.from(optionElements).map((el) => el.textContent);

    /* Each PODCAST_DOMAIN should appear as a selectable option */
    for (const domain of PODCAST_DOMAINS) {
      expect(optionValues).toContain(domain);
    }

    /* Verify exact count matches (only non-disabled options, excluding placeholder) */
    expect(optionElements).toHaveLength(PODCAST_DOMAINS.length);
  });

  it('does NOT render "(Optional)" text anywhere', () => {
    renderComponent();

    expect(screen.queryByText(/\(Optional\)/i)).not.toBeInTheDocument();
  });
});
