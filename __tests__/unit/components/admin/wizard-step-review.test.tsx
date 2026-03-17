/**
 * Unit tests for WizardStepReview component.
 *
 * Verifies:
 * - Displays title, description, domain, year correctly
 * - Displays tags as badges
 * - Shows "Not provided" for missing audio files
 * - Shows filename when audio is present
 * - Shows transcript summary
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

afterEach(() => {
  cleanup();
});

describe('WizardStepReview', () => {
  it('displays title, description, domain, and year correctly', () => {
    render(<WizardStepReview {...buildProps()} />);

    expect(screen.getByText('Audit Standards Update Q1 2026')).toBeInTheDocument();
    expect(
      screen.getByText('A comprehensive overview of changes to auditing standards.')
    ).toBeInTheDocument();

    /* Domain appears as a Badge in the header strip */
    expect(screen.getByText('Auditing')).toBeInTheDocument();

    /* Year appears in the header strip */
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('displays tags as badges', () => {
    render(<WizardStepReview {...buildProps({ tags: ['IFRS', 'ISA', 'Tax'] })} />);

    expect(screen.getByText('IFRS')).toBeInTheDocument();
    expect(screen.getByText('ISA')).toBeInTheDocument();
    expect(screen.getByText('Tax')).toBeInTheDocument();
  });

  it('shows "None" when tags array is empty', () => {
    render(<WizardStepReview {...buildProps({ tags: [] })} />);

    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows "Not provided" for missing audio files', () => {
    render(
      <WizardStepReview
        {...buildProps({
          audioShortUrl: null,
          audioShortFileName: null,
          audioLongUrl: null,
          audioLongFileName: null,
        })}
      />
    );

    /* FilePill components show "Not provided" in italic when value is null */
    const notProvidedElements = screen.getAllByText('Not provided');
    expect(notProvidedElements.length).toBeGreaterThanOrEqual(2);
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

  it('shows transcript summary when transcripts are provided', () => {
    render(
      <WizardStepReview
        {...buildProps({
          shortTranscript: 'Hello world',
          longTranscript: 'This is a longer transcript with more content.',
        })}
      />
    );

    /* Component shows "Short: 11 chars · Long: 46 chars" */
    expect(screen.getByText(/Short: 11 chars/)).toBeInTheDocument();
    expect(screen.getByText(/Long: 46 chars/)).toBeInTheDocument();
  });

  it('does not show transcript section when transcripts are empty', () => {
    render(
      <WizardStepReview
        {...buildProps({
          shortTranscript: '',
          longTranscript: '',
        })}
      />
    );

    /* No transcript section is rendered when both are empty */
    expect(screen.queryByText(/Transcripts/)).not.toBeInTheDocument();
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

    const image = screen.getByRole('img', { name: /thumbnail/i });
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
    expect(screen.queryByRole('img', { name: /thumbnail/i })).not.toBeInTheDocument();
  });

  it('shows bulletin attachment count when files exist', () => {
    render(
      <WizardStepReview
        {...buildProps({
          bulletinFileNames: ['report-q1.pdf', 'appendix-a.pdf'],
        })}
      />
    );

    /* Component shows file count (e.g., "2 files") rather than individual names */
    expect(screen.getByText('2 files')).toBeInTheDocument();
  });

  it('shows "Not provided" when no bulletin attachments exist', () => {
    render(
      <WizardStepReview
        {...buildProps({
          bulletinFileNames: [],
        })}
      />
    );

    /* FilePill for Attachments shows "Not provided" when empty */
    const attachmentsSection = screen.getByText('Attachments').closest('div');
    expect(attachmentsSection?.textContent).toContain('Not provided');
  });
});
