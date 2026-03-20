/**
 * Unit tests for AuditBriefUploadWizard orchestrator component.
 *
 * Verifies:
 * - Renders step indicator at step 1 (Details) initially
 * - Shows step 1 fields on initial render
 * - Clicking "Next" without filling required fields shows validation errors
 * - After filling required fields, "Next" advances to step 2
 * - "Back" from step 2 returns to step 1
 * - Step 3 shows "Submit" button
 * - Footer shows mandatory fields note
 *
 * @dependencies vitest, @testing-library/react, AuditBriefUploadWizard
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuditBriefUploadWizard } from '@/components/admin/audit-brief-upload-wizard';

/* ---------- Mocks ---------- */

/**
 * Mock the useFileUpload hook to return idle upload state.
 * Prevents real XHR uploads during unit tests.
 */
vi.mock('@/hooks/use-file-upload', () => ({
  useFileUpload: () => ({
    progress: 0,
    isUploading: false,
    error: null,
    uploadedKey: null,
    upload: vi.fn().mockResolvedValue('mock-key'),
  }),
}));

/**
 * Mock next/image to a plain <img> element for test rendering.
 */
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

/**
 * Mock sonner toast to avoid DOM side-effects in tests.
 */
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Mock ThumbnailCropDialog to bypass canvas API limitations in jsdom.
 * Immediately calls onCrop with a synthetic file when Crop is clicked.
 */
vi.mock('@/components/admin/thumbnail-crop-dialog', () => ({
  ThumbnailCropDialog: ({
    open,
    onCrop,
    onCancel,
  }: {
    open: boolean;
    onCrop: (file: File) => void;
    onCancel: () => void;
  }) => {
    if (!open) return null;
    return (
      <div>
        <button
          onClick={() => onCrop(new File(['cropped'], 'thumbnail.jpg', { type: 'image/jpeg' }))}
        >
          Crop
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

/**
 * Mock next/navigation to satisfy useRouter calls inside the wizard.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/**
 * Mock global fetch to prevent real API calls.
 */
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

afterEach(() => {
  cleanup();
});

/**
 * Helper to fill required metadata fields and advance to a target step.
 * Fills title, description, domain, year, and provides a thumbnail file.
 *
 * @param user - The userEvent instance.
 * @param targetStep - The step to advance to (1 = Content, 2 = Review).
 */
async function fillAndAdvanceTo(
  user: ReturnType<typeof userEvent.setup>,
  targetStep: number
): Promise<void> {
  /* Fill required metadata fields */
  await user.type(screen.getByPlaceholderText('Audit brief title'), 'Test Audit Brief');
  await user.type(screen.getByPlaceholderText('Audit brief description'), 'A test description');

  /* Select domain via the native <select> element */
  const domainSelect = screen.getByRole('combobox');
  await user.selectOptions(domainSelect, 'LEAP');

  const yearInput = screen.getByRole('spinbutton');
  await user.clear(yearInput);
  await user.type(yearInput, '2025');

  /* Provide thumbnail file (required in create mode) */
  const thumbnailInput = document.querySelector(
    'input[type="file"][accept="image/*"]'
  ) as HTMLInputElement;
  const thumbnailFile = new File(['img'], 'thumb.png', { type: 'image/png' });
  await user.upload(thumbnailInput, thumbnailFile);

  /* Confirm the crop dialog that opens after file selection */
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Crop/i })).toBeInTheDocument();
  });
  await user.click(screen.getByRole('button', { name: /Crop/i }));

  /* Wait for crop dialog to close */
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: /Crop/i })).not.toBeInTheDocument();
  });

  /* Advance through steps */
  for (let step = 0; step < targetStep; step++) {
    await user.click(screen.getByRole('button', { name: /Next/i }));

    if (step === 0) {
      /* Wait for step 1 (Content) to render */
      await waitFor(() => {
        expect(screen.getByText('Files')).toBeInTheDocument();
      });

      /* If we need to advance past Content, provide a required audio file */
      if (targetStep > 1) {
        const audioInput = document.querySelector(
          'input[type="file"][accept=".mp3,.wav,.ogg,.aac,.flac,.m4a,.wma"]'
        ) as HTMLInputElement;
        const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
        await user.upload(audioInput, audioFile);
      }
    } else if (step === 1) {
      /* Wait for step 2 (Review) to render */
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
      });
    }
  }
}

describe('AuditBriefUploadWizard', () => {
  it('renders step indicator at step 1 (Details) initially', () => {
    render(<AuditBriefUploadWizard />);

    /* The step indicator should show "Details" as the active step */
    expect(screen.getByText('Details')).toBeInTheDocument();

    /* "Content" and "Review" should also be visible but not active */
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('shows step 1 fields on initial render', () => {
    render(<AuditBriefUploadWizard />);

    /* Step 1 contains Title, Description, Domain, Year, Tags, Thumbnail Image */
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Year/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags/)).toBeInTheDocument();
    expect(screen.getByText(/^Thumbnail/)).toBeInTheDocument();

    /* "Next" button should be visible on step 1 */
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();

    /* "Submit" button should NOT be visible on step 1 */
    expect(screen.queryByRole('button', { name: /Submit/i })).not.toBeInTheDocument();
  });

  it('clicking "Next" without filling required fields shows validation errors', async () => {
    const user = userEvent.setup();
    render(<AuditBriefUploadWizard />);

    /* Click Next without filling any fields */
    await user.click(screen.getByRole('button', { name: /Next/i }));

    /* Validation errors should appear for required fields */
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Domain is required')).toBeInTheDocument();
  });

  it('after filling required fields, "Next" advances to step 2', async () => {
    const user = userEvent.setup();
    render(<AuditBriefUploadWizard />);

    await fillAndAdvanceTo(user, 1);

    /* Should now be on step 2 — Content step labels visible */
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('Audio (short)')).toBeInTheDocument();
    expect(screen.getByText('Audio (long)')).toBeInTheDocument();
    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });

  it('"Back" from step 2 returns to step 1', async () => {
    const user = userEvent.setup();
    render(<AuditBriefUploadWizard />);

    /* Advance to step 2 (Content) */
    await fillAndAdvanceTo(user, 1);

    /* Click Back */
    await user.click(screen.getByRole('button', { name: /Back/i }));

    /* Should return to step 1 — Title label visible again */
    await waitFor(() => {
      expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    });
    expect(screen.getByText(/^Thumbnail/)).toBeInTheDocument();
  });

  it('step 3 shows "Submit" button', async () => {
    const user = userEvent.setup();
    render(<AuditBriefUploadWizard />);

    /* Advance to step 3 (Review) */
    await fillAndAdvanceTo(user, 2);

    /* Should show Submit button on step 3 */
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();

    /* Next button should NOT be visible on step 3 */
    expect(screen.queryByRole('button', { name: /^Next$/i })).not.toBeInTheDocument();
  });

  it('footer shows mandatory fields note', () => {
    render(<AuditBriefUploadWizard />);

    const note = screen.getByText(
      (_content, element) =>
        element?.tagName === 'P' &&
        element?.textContent?.includes('All fields marked with') === true &&
        element?.textContent?.includes('are mandatory') === true
    );
    expect(note).toBeInTheDocument();
  });
});
