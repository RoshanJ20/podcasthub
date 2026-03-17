/**
 * Unit tests for WizardStepReview component.
 *
 * Verifies:
 * - Displays title, description, domain, year correctly
 * - Displays tags as badges
 * - Shows "Not provided" for missing audio files
 * - Shows filename when audio is present
 * - Shows transcript character count
 * - Shows thumbnail preview image
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  WizardStepReview,
  type WizardStepReviewProps,
} from '@/components/admin/wizard-step-review';

/** Mock next/image to render a plain <img> for test assertions */
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

/**
 * Builds a complete set of default props for WizardStepReview.
 *
 * @param overrides - Partial props to override defaults.
 * @returns Merged WizardStepReviewProps.
 */
function buildProps(overrides: Partial<WizardStepReviewProps> = {}): WizardStepReviewProps {
  return {
    title: 'Audit Standards Update Q1 2026',
    description: 'A comprehensive overview of changes to auditing standards.',
    domain: 'Auditing',
    year: 2026,
    tags: ['IFRS', 'ISA'],
    thumbnailUrl: null,
    thumbnailFileName: null,
    audioShortUrl: null,
    audioShortFileName: null,
    audioLongUrl: null,
    audioLongFileName: null,
    bulletinFileNames: [],
    shortTranscript: '',
    longTranscript: '',
    ...overrides,
  };
}

/**
 * Finds the value element within a review row identified by its label text.
 *
 * @param container - The DOM container to search in.
 * @param labelText - The label text to locate the row.
 * @returns The sibling value element, or null if not found.
 */
function getReviewRowValue(container: HTMLElement, labelText: string): HTMLElement | null {
  const labels = container.querySelectorAll('.text-sm.font-medium.text-muted-foreground');
  for (const label of labels) {
    if (label.textContent === labelText) {
      return label.nextElementSibling as HTMLElement | null;
    }
  }
  return null;
}

afterEach(() => {
  cleanup();
});

describe('WizardStepReview', () => {
  it('displays title, description, domain, and year correctly', () => {
    const { container } = render(<WizardStepReview {...buildProps()} />);

    expect(screen.getByText('Audit Standards Update Q1 2026')).toBeInTheDocument();
    expect(
      screen.getByText('A comprehensive overview of changes to auditing standards.')
    ).toBeInTheDocument();

    /* Domain appears as a Badge - check via row value */
    const domainValue = getReviewRowValue(container, 'Domain');
    expect(domainValue?.textContent).toContain('Auditing');

    const yearValue = getReviewRowValue(container, 'Year');
    expect(yearValue?.textContent).toBe('2026');
  });

  it('displays tags as badges', () => {
    const { container } = render(
      <WizardStepReview {...buildProps({ tags: ['IFRS', 'ISA', 'Tax'] })} />
    );

    const tagsValue = getReviewRowValue(container, 'Tags');
    const badges = tagsValue?.querySelectorAll('[data-slot="badge"]') ?? [];

    /* Badge component may render duplicate spans via useRender; check text content */
    const badgeTexts = Array.from(badges).map((b) => b.textContent);
    expect(badgeTexts).toContain('IFRS');
    expect(badgeTexts).toContain('ISA');
    expect(badgeTexts).toContain('Tax');
  });

  it('shows "None" when tags array is empty', () => {
    const { container } = render(<WizardStepReview {...buildProps({ tags: [] })} />);

    const tagsValue = getReviewRowValue(container, 'Tags');
    expect(tagsValue?.textContent).toContain('None');
  });

  it('shows "Not provided" for missing audio files', () => {
    const { container } = render(
      <WizardStepReview
        {...buildProps({
          audioShortUrl: null,
          audioShortFileName: null,
          audioLongUrl: null,
          audioLongFileName: null,
        })}
      />
    );

    const briefSummaryValue = getReviewRowValue(container, 'Brief Summary');
    expect(briefSummaryValue?.textContent).toBe('Not provided');

    const detailedOverviewValue = getReviewRowValue(container, 'Detailed Overview');
    expect(detailedOverviewValue?.textContent).toBe('Not provided');
  });

  it('shows filename when audio is present', () => {
    render(
      <WizardStepReview
        {...buildProps({
          audioShortUrl: 'https://storage.example.com/short.mp3',
          audioShortFileName: 'brief-summary.mp3',
          audioLongUrl: 'https://storage.example.com/long.mp3',
          audioLongFileName: 'detailed-overview.mp3',
        })}
      />
    );

    expect(screen.getByText('brief-summary.mp3')).toBeInTheDocument();
    expect(screen.getByText('detailed-overview.mp3')).toBeInTheDocument();
  });

  it('shows transcript character count', () => {
    const { container } = render(
      <WizardStepReview
        {...buildProps({
          shortTranscript: 'Hello world',
          longTranscript: 'This is a longer transcript with more content.',
        })}
      />
    );

    const briefTranscriptValue = getReviewRowValue(container, 'Brief Summary Transcript');
    expect(briefTranscriptValue?.textContent).toBe('11 characters');

    const detailedTranscriptValue = getReviewRowValue(container, 'Detailed Overview Transcript');
    expect(detailedTranscriptValue?.textContent).toBe('46 characters');
  });

  it('shows "Not provided" for empty transcripts', () => {
    const { container } = render(
      <WizardStepReview
        {...buildProps({
          shortTranscript: '',
          longTranscript: '',
        })}
      />
    );

    const briefTranscriptValue = getReviewRowValue(container, 'Brief Summary Transcript');
    expect(briefTranscriptValue?.textContent).toBe('Not provided');

    const detailedTranscriptValue = getReviewRowValue(container, 'Detailed Overview Transcript');
    expect(detailedTranscriptValue?.textContent).toBe('Not provided');
  });

  it('shows thumbnail preview image when thumbnailUrl exists', () => {
    render(
      <WizardStepReview
        {...buildProps({
          thumbnailUrl: 'https://storage.example.com/thumb.jpg',
          thumbnailFileName: 'thumb.jpg',
        })}
      />
    );

    const image = screen.getByRole('img', { name: /thumbnail preview/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://storage.example.com/thumb.jpg');
  });

  it('does not show thumbnail image when thumbnailUrl is null', () => {
    render(
      <WizardStepReview
        {...buildProps({
          thumbnailUrl: null,
          thumbnailFileName: null,
        })}
      />
    );

    /* No thumbnail image should be rendered when URL is null */
    expect(screen.queryByRole('img', { name: /thumbnail preview/i })).not.toBeInTheDocument();
  });

  it('shows bulletin attachment filenames', () => {
    render(
      <WizardStepReview
        {...buildProps({
          bulletinFileNames: ['report-q1.pdf', 'appendix-a.pdf'],
        })}
      />
    );

    expect(screen.getByText('report-q1.pdf')).toBeInTheDocument();
    expect(screen.getByText('appendix-a.pdf')).toBeInTheDocument();
  });

  it('shows "None" when no bulletin attachments exist', () => {
    const { container } = render(
      <WizardStepReview
        {...buildProps({
          bulletinFileNames: [],
        })}
      />
    );

    const attachmentsValue = getReviewRowValue(container, 'Attachments');
    expect(attachmentsValue?.textContent).toContain('None');
  });
});
