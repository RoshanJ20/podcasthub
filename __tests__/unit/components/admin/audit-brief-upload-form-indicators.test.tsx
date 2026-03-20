/**
 * Unit tests for AuditBriefUploadForm field indicators.
 *
 * Verifies:
 * - Required fields display an asterisk (*) indicator
 * - No labels contain "(Optional)" text
 * - Footer note about mandatory fields is present
 * - Short Audio (Brief Summary) does NOT have a required indicator
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AuditBriefUploadForm } from '@/components/admin/audit-brief-upload-form';

/* Mock hooks and libraries used by the form */
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/use-file-upload', () => ({
  useFileUpload: () => ({
    upload: vi.fn(),
    isUploading: false,
    progress: 0,
    error: null,
  }),
}));

vi.mock('@/lib/schemas/common', () => ({
  DOMAINS: ['Auditing', 'LEAP', 'Tax'],
}));

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

describe('AuditBriefUploadForm — field indicators', () => {
  it('renders * indicator on required field labels in create mode', () => {
    const { container } = render(<AuditBriefUploadForm mode="create" />);

    const titleLabel = getLabelByFor(container, 'title');
    const descriptionLabel = getLabelByFor(container, 'description');
    const domainLabel = getLabelByFor(container, 'domain');
    const yearLabel = getLabelByFor(container, 'year');
    const thumbnailLabel = getLabelByFor(container, 'thumbnail');

    /* Each required label should contain a * within it */
    expect(titleLabel?.textContent).toContain('*');
    expect(descriptionLabel?.textContent).toContain('*');
    expect(domainLabel?.textContent).toContain('*');
    expect(yearLabel?.textContent).toContain('*');
    expect(thumbnailLabel?.textContent).toContain('*');
  });

  it('renders * on Title, Description, Domain, Year but NOT Thumbnail in edit mode', () => {
    const { container } = render(<AuditBriefUploadForm mode="edit" />);

    const titleLabel = getLabelByFor(container, 'title');
    const descriptionLabel = getLabelByFor(container, 'description');
    const domainLabel = getLabelByFor(container, 'domain');
    const yearLabel = getLabelByFor(container, 'year');
    const thumbnailLabel = getLabelByFor(container, 'thumbnail');

    expect(titleLabel?.textContent).toContain('*');
    expect(descriptionLabel?.textContent).toContain('*');
    expect(domainLabel?.textContent).toContain('*');
    expect(yearLabel?.textContent).toContain('*');
    /* Thumbnail is only required in create mode */
    expect(thumbnailLabel?.textContent).not.toContain('*');
  });

  it('does NOT render * indicator on Brief Summary audio label', () => {
    const { container } = render(<AuditBriefUploadForm mode="create" />);

    const briefSummaryLabel = getLabelByFor(container, 'audioShort');
    expect(briefSummaryLabel?.textContent).not.toContain('*');
  });

  it('does not render "(Optional)" text in any label', () => {
    const { container } = render(<AuditBriefUploadForm mode="create" />);

    const allLabels = container.querySelectorAll('label');
    const optionalLabels = Array.from(allLabels).filter((label) =>
      label.textContent?.includes('(Optional)')
    );

    expect(optionalLabels).toHaveLength(0);
  });

  it('renders a footer note about mandatory fields', () => {
    const { container } = render(<AuditBriefUploadForm mode="create" />);

    const footer = container.querySelector('p.italic');
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toBe('All fields marked with * are mandatory');
  });
});
