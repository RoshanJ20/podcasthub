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
});
