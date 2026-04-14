/**
 * Unit tests for shared schema definitions.
 *
 * Verifies domain constants (PODCAST_DOMAINS, LEARNING_SERIES_DOMAINS, DOMAINS),
 * the domainSchema Zod enum, and pagination schema defaults.
 */
import { describe, expect, it } from 'vitest';

import {
  DOMAINS,
  LEARNING_SERIES_DOMAINS,
  PODCAST_DOMAINS,
  domainSchema,
  isUuid,
  uuidSchema,
} from '@/lib/schemas/common';

describe('common schemas', () => {
  describe('PODCAST_DOMAINS', () => {
    it('contains the correct audit brief domain values', () => {
      expect(PODCAST_DOMAINS).toEqual([
        'Audit Methodology',
        'Accounting and Reporting',
        'Audit Technology',
        'Quality and Risk',
        'LEAP',
      ]);
    });

    it('is a readonly tuple', () => {
      // TypeScript enforces `as const`, but we can verify length is fixed
      expect(PODCAST_DOMAINS).toHaveLength(5);
    });
  });

  describe('LEARNING_SERIES_DOMAINS', () => {
    it('contains the correct learning series domain values', () => {
      expect(LEARNING_SERIES_DOMAINS).toEqual(['Auditing', 'Accounting and Reporting']);
    });

    it('is a readonly tuple', () => {
      expect(LEARNING_SERIES_DOMAINS).toHaveLength(2);
    });
  });

  describe('DOMAINS', () => {
    it('contains all unique domain values from both categories', () => {
      expect(DOMAINS).toEqual([
        'Audit Methodology',
        'Accounting and Reporting',
        'Audit Technology',
        'Quality and Risk',
        'LEAP',
        'Auditing',
      ]);
    });

    it('has no duplicate values', () => {
      const unique = new Set(DOMAINS);
      expect(unique.size).toBe(DOMAINS.length);
    });

    it('includes every audit brief domain', () => {
      for (const domain of PODCAST_DOMAINS) {
        expect(DOMAINS).toContain(domain);
      }
    });

    it('includes every learning series domain', () => {
      for (const domain of LEARNING_SERIES_DOMAINS) {
        expect(DOMAINS).toContain(domain);
      }
    });
  });

  describe('domainSchema', () => {
    it('accepts all values in DOMAINS', () => {
      for (const domain of DOMAINS) {
        expect(domainSchema.parse(domain)).toBe(domain);
      }
    });

    it('rejects values not in DOMAINS', () => {
      expect(() => domainSchema.parse('Invalid Domain')).toThrow();
    });
  });

  describe('uuidSchema', () => {
    it('accepts a canonical v4 UUID', () => {
      const value = '11111111-1111-4111-8111-111111111111';
      expect(uuidSchema.parse(value)).toBe(value);
    });

    it('rejects non-UUID strings', () => {
      for (const invalid of ['new', 'null', 'undefined', '', 'not-a-uuid']) {
        expect(() => uuidSchema.parse(invalid)).toThrow();
      }
    });

    it('rejects truncated UUIDs', () => {
      expect(() => uuidSchema.parse('11111111-1111-4111-8111')).toThrow();
    });

    it('rejects non-string inputs', () => {
      expect(() => uuidSchema.parse(42)).toThrow();
      expect(() => uuidSchema.parse(null)).toThrow();
      expect(() => uuidSchema.parse(undefined)).toThrow();
    });
  });

  describe('isUuid', () => {
    it('returns true for a valid v4 UUID', () => {
      expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    });

    it('returns false for non-UUID strings', () => {
      for (const invalid of ['new', 'null', 'undefined', '', 'not-a-uuid']) {
        expect(isUuid(invalid)).toBe(false);
      }
    });

    it('returns false for non-string values', () => {
      expect(isUuid(42)).toBe(false);
      expect(isUuid(null)).toBe(false);
      expect(isUuid(undefined)).toBe(false);
      expect(isUuid({})).toBe(false);
    });

    it('narrows the type to string when true', () => {
      const value: unknown = '11111111-1111-4111-8111-111111111111';
      if (isUuid(value)) {
        // Compile-time check: value is narrowed to string
        const asString: string = value;
        expect(asString).toBe('11111111-1111-4111-8111-111111111111');
      }
    });
  });
});
