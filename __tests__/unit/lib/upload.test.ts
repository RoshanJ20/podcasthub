/**
 * Unit tests for file upload utilities.
 *
 * Verifies:
 * - MIME type validation (case-insensitive matching)
 * - Filename sanitization (lowercase, special chars replaced, hyphens collapsed)
 * - File size formatting (B, KB, MB, GB)
 * - Unique key generation (prefix/uuid/sanitized-name format)
 * - Constant definitions for allowed types and max sizes
 */
import { describe, it, expect } from 'vitest';
import {
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_PDF_TYPES,
  FILE_TYPE_GROUPS,
  MAX_FILE_SIZES,
  validateFileType,
  sanitizeFilename,
  formatFileSize,
  generateUniqueKey,
} from '@/lib/upload';

describe('Upload Utilities', () => {
  describe('Constants', () => {
    it('defines allowed audio MIME types', () => {
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/mpeg');
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/wav');
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/mp4');
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/ogg');
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/webm');
      expect(ALLOWED_AUDIO_TYPES).toContain('audio/x-m4a');
    });

    it('defines allowed image MIME types', () => {
      expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/webp');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/gif');
    });

    it('defines allowed PDF MIME types', () => {
      expect(ALLOWED_PDF_TYPES).toContain('application/pdf');
    });

    it('defines FILE_TYPE_GROUPS mapping categories to allowed types', () => {
      expect(FILE_TYPE_GROUPS.audio).toBe(ALLOWED_AUDIO_TYPES);
      expect(FILE_TYPE_GROUPS.image).toBe(ALLOWED_IMAGE_TYPES);
      expect(FILE_TYPE_GROUPS.pdf).toBe(ALLOWED_PDF_TYPES);
    });

    it('defines MAX_FILE_SIZES with correct byte values', () => {
      expect(MAX_FILE_SIZES.audio).toBe(500 * 1024 * 1024); // 500MB
      expect(MAX_FILE_SIZES.image).toBe(5 * 1024 * 1024); // 5MB
      expect(MAX_FILE_SIZES.pdf).toBe(50 * 1024 * 1024); // 50MB
    });
  });

  describe('validateFileType', () => {
    it('returns true for a matching MIME type', () => {
      expect(validateFileType('audio/mpeg', ALLOWED_AUDIO_TYPES)).toBe(true);
    });

    it('returns false for a non-matching MIME type', () => {
      expect(validateFileType('video/mp4', ALLOWED_AUDIO_TYPES)).toBe(false);
    });

    it('performs case-insensitive matching', () => {
      expect(validateFileType('Audio/MPEG', ALLOWED_AUDIO_TYPES)).toBe(true);
      expect(validateFileType('IMAGE/JPEG', ALLOWED_IMAGE_TYPES)).toBe(true);
    });

    it('returns false for an empty string', () => {
      expect(validateFileType('', ALLOWED_AUDIO_TYPES)).toBe(false);
    });

    it('returns false when allowed list is empty', () => {
      expect(validateFileType('audio/mpeg', [])).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('converts filename to lowercase', () => {
      expect(sanitizeFilename('MyFile.MP3')).toBe('myfile.mp3');
    });

    it('replaces special characters with hyphens', () => {
      expect(sanitizeFilename('my file (1).mp3')).toBe('my-file-1-.mp3');
    });

    it('collapses consecutive hyphens', () => {
      expect(sanitizeFilename('my---file.mp3')).toBe('my-file.mp3');
    });

    it('handles filenames with multiple special characters', () => {
      expect(sanitizeFilename('My @#$ File!!!.mp3')).toBe('my-file-.mp3');
    });

    it('preserves dots and hyphens', () => {
      expect(sanitizeFilename('my-file.name.mp3')).toBe('my-file.name.mp3');
    });

    it('trims leading and trailing hyphens', () => {
      expect(sanitizeFilename('---file---')).toBe('file');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.00 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.00 GB');
    });

    it('formats fractional sizes correctly', () => {
      expect(formatFileSize(1536)).toBe('1.50 KB');
    });

    it('handles zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('generateUniqueKey', () => {
    it('generates a key in the format prefix/uuid/sanitized-name', () => {
      const key = generateUniqueKey('audio', 'My File.mp3');
      const parts = key.split('/');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('audio');
      // UUID v4 pattern
      expect(parts[1]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
      expect(parts[2]).toBe('my-file.mp3');
    });

    it('generates unique keys on successive calls', () => {
      const key1 = generateUniqueKey('images', 'photo.png');
      const key2 = generateUniqueKey('images', 'photo.png');

      expect(key1).not.toBe(key2);
    });

    it('sanitizes the filename in the key', () => {
      const key = generateUniqueKey('docs', 'My Document (Final).pdf');
      const filename = key.split('/')[2];

      expect(filename).toBe('my-document-final-.pdf');
    });
  });
});
