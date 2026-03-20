/**
 * Unit tests for WizardStepContent component.
 *
 * Verifies:
 * - Renders all 5 field labels with correct names
 * - No `*` indicators on any field
 * - No "(Optional)" text
 * - Shows filename when audio is uploaded
 * - Shows transcript character count when loaded
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  WizardStepContent,
  type WizardStepContentProps,
} from '@/components/admin/wizard-step-content';

/**
 * Builds a complete set of default props for WizardStepContent.
 *
 * @param overrides - Partial props to override defaults.
 * @returns Full WizardStepContentProps with sensible defaults.
 */
function buildProps(overrides: Partial<WizardStepContentProps> = {}): WizardStepContentProps {
  return {
    audioShortUrl: null,
    audioShortFileName: null,
    onAudioShortChange: vi.fn(),
    audioLongUrl: null,
    audioLongFileName: null,
    onAudioLongChange: vi.fn(),
    bulletinUrls: [],
    bulletinFileNames: [],
    onBulletinsChange: vi.fn(),
    onBulletinRemove: vi.fn(),
    shortTranscript: '',
    onShortTranscriptChange: vi.fn(),
    longTranscript: '',
    onLongTranscriptChange: vi.fn(),
    isUploading: false,
    uploadProgress: 0,
    ...overrides,
  };
}

describe('WizardStepContent', () => {
  it('renders all field labels with correct names', () => {
    render(<WizardStepContent {...buildProps()} />);

    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('Audio (short)')).toBeInTheDocument();
    expect(screen.getByText('Audio (long)')).toBeInTheDocument();
    expect(screen.getByText('Attachments')).toBeInTheDocument();
    expect(screen.getByText('Brief Summary Transcript (Short)')).toBeInTheDocument();
    expect(screen.getByText('Detailed Overview Transcript (Long)')).toBeInTheDocument();
  });

  it('does not show any * indicators on fields', () => {
    const { container } = render(<WizardStepContent {...buildProps()} />);

    /* No label text should contain an asterisk */
    const labels = container.querySelectorAll('label');
    labels.forEach((label) => {
      expect(label.textContent).not.toContain('*');
    });
  });

  it('does not show any "(Optional)" text', () => {
    render(<WizardStepContent {...buildProps()} />);

    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  });

  it('shows filename when audio short is uploaded', () => {
    render(
      <WizardStepContent
        {...buildProps({
          audioShortUrl: 'https://example.com/audio-short.mp3',
          audioShortFileName: 'brief-summary.mp3',
        })}
      />
    );

    expect(screen.getByText('brief-summary.mp3')).toBeInTheDocument();
  });

  it('shows filename when audio long is uploaded', () => {
    render(
      <WizardStepContent
        {...buildProps({
          audioLongUrl: 'https://example.com/audio-long.mp3',
          audioLongFileName: 'detailed-overview.mp3',
        })}
      />
    );

    expect(screen.getByText('detailed-overview.mp3')).toBeInTheDocument();
  });

  it('shows transcript character count when short transcript is loaded', () => {
    const transcript = 'Hello, this is a test transcript.';

    render(
      <WizardStepContent
        {...buildProps({
          shortTranscript: transcript,
        })}
      />
    );

    expect(screen.getByText(`${transcript.length} chars`)).toBeInTheDocument();
  });

  it('shows transcript character count when long transcript is loaded', () => {
    const transcript = 'This is the detailed overview transcript content.';

    render(
      <WizardStepContent
        {...buildProps({
          longTranscript: transcript,
        })}
      />
    );

    expect(screen.getByText(`${transcript.length} chars`)).toBeInTheDocument();
  });

  it('shows upload progress when isUploading is true', () => {
    const { container } = render(
      <WizardStepContent
        {...buildProps({
          isUploading: true,
          uploadProgress: 45,
        })}
      />
    );

    /* The progress bar should be rendered with the correct width */
    const progressBar = container.querySelector('[style*="width: 45%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders audio file inputs that accept audio files', () => {
    const { container } = render(<WizardStepContent {...buildProps()} />);

    /* Both audio inputs should accept the explicit audio format list */
    const audioInputs = container.querySelectorAll(
      'input[accept=".mp3,.wav,.ogg,.aac,.flac,.m4a,.wma"]'
    );
    expect(audioInputs).toHaveLength(2);
  });

  it('shows bulletin filenames when attachments are uploaded', () => {
    render(
      <WizardStepContent
        {...buildProps({
          bulletinUrls: ['https://example.com/a.pdf', 'https://example.com/b.pdf'],
          bulletinFileNames: ['report-a.pdf', 'report-b.pdf'],
        })}
      />
    );

    expect(screen.getByText('report-a.pdf')).toBeInTheDocument();
    expect(screen.getByText('report-b.pdf')).toBeInTheDocument();
  });
});
