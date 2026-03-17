/**
 * Unit tests for attachment filename extraction utility.
 *
 * Key responsibilities:
 * - Verify human-readable name extraction from storage URL paths
 * - Verify fallback behaviour for empty/missing URLs
 * - Verify title-casing and separator replacement (hyphens, underscores)
 */
import { describe, it, expect } from 'vitest';
import { extractAttachmentName } from '@/lib/attachment-utils';

describe('extractAttachmentName', () => {
  it('extracts human-readable name from URL path', () => {
    expect(extractAttachmentName('/bulletins/Q3-Bulletin.pdf')).toBe('Q3 Bulletin');
  });
  it('replaces underscores with spaces', () => {
    expect(extractAttachmentName('/bulletins/standards_update.pdf')).toBe('Standards Update');
  });
  it('handles deeply nested paths', () => {
    expect(extractAttachmentName('/storage/podcasts/123/reference-guide.pdf')).toBe(
      'Reference Guide'
    );
  });
  it('returns fallback for empty string', () => {
    expect(extractAttachmentName('')).toBe('Attachment');
  });
  it('returns fallback with index when provided', () => {
    expect(extractAttachmentName('', 2)).toBe('Attachment 3');
  });
  it('handles URL without extension', () => {
    expect(extractAttachmentName('/bulletins/my-document')).toBe('My Document');
  });
  it('handles storage keys (not paths)', () => {
    expect(extractAttachmentName('bulletins/audit-report-2025.pdf')).toBe('Audit Report 2025');
  });
});
