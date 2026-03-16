/**
 * Shared schema definitions for Podcast Hub v2.
 *
 * Contains domain constants, the domain enum schema, and reusable
 * pagination query parameter schemas.
 */
import { z } from 'zod';

/** Knowledge domains specific to podcast content. */
export const PODCAST_DOMAINS = [
  'Audit Methodology',
  'Accounting and Reporting',
  'Audit Technology',
  'Quality and Risk',
  'LEAP',
] as const;

/** Knowledge domains specific to learning series content. */
export const LEARNING_SERIES_DOMAINS = ['Auditing', 'Accounting and Reporting'] as const;

/**
 * All valid knowledge domains in Podcast Hub.
 *
 * Manually maintained union of PODCAST_DOMAINS and LEARNING_SERIES_DOMAINS
 * with duplicates removed. Keep in sync when adding new domains.
 */
export const DOMAINS = [
  'Audit Methodology',
  'Accounting and Reporting',
  'Audit Technology',
  'Quality and Risk',
  'LEAP',
  'Auditing',
] as const;

/** TypeScript type for a valid domain value. */
export type Domain = (typeof DOMAINS)[number];

/** Zod schema for validating domain values against the DOMAINS enum. */
export const domainSchema = z.enum(DOMAINS);

/**
 * Zod schema for pagination query parameters.
 *
 * - `page`: coerced to integer, minimum 1, defaults to 1
 * - `limit`: coerced to integer, minimum 1, maximum 100, defaults to 20
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Inferred type for pagination query parameters. */
export type PaginationParams = z.infer<typeof paginationSchema>;
