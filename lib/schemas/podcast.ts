/**
 * Zod schemas for podcast validation.
 *
 * Provides schemas for creating, updating, and batch-reordering podcasts.
 */
import { z } from 'zod';
import { domainSchema } from './common';

/**
 * Schema for creating a new podcast.
 *
 * Required: title, description, domain, year, thumbnailUrl, audioShortUrl.
 * Optional: tags, audioLongUrl, bulletinUrls.
 */
export const createPodcastSchema = z.object({
  /** Podcast title (1-200 characters). */
  title: z.string().min(1).max(200),
  /** Podcast description (1-2000 characters). */
  description: z.string().min(1).max(2000),
  /** Knowledge domain this podcast belongs to. */
  domain: domainSchema,
  /** Publication year (2020-2099, must be an integer). */
  year: z.coerce.number().int().min(2020).max(2099),
  /** Optional array of string tags. */
  tags: z.array(z.string()).optional(),
  /** Storage key or URL for the podcast thumbnail image. */
  thumbnailUrl: z.string().min(1),
  /** Storage key or URL for the short-form audio file. */
  audioShortUrl: z.string().min(1),
  /** Optional storage key or URL for the long-form audio file. */
  audioLongUrl: z.string().min(1).nullable().optional(),
  /** Optional array of bulletin document storage keys or URLs. */
  bulletinUrls: z.array(z.string().min(1)).nullable().optional(),
});

/** Inferred type for podcast creation input. */
export type CreatePodcastInput = z.infer<typeof createPodcastSchema>;

/**
 * Schema for updating an existing podcast.
 *
 * All fields are optional but at least one must be provided.
 * Field constraints from createPodcastSchema still apply.
 */
export const updatePodcastSchema = createPodcastSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/** Inferred type for podcast update input. */
export type UpdatePodcastInput = z.infer<typeof updatePodcastSchema>;

/**
 * Schema for batch-updating podcast sort orders.
 *
 * Expects a non-empty array of objects with `id` (UUID) and `sortOrder` (integer).
 */
export const batchUpdateSortOrderSchema = z
  .array(
    z.object({
      /** Podcast UUID. */
      id: z.uuid(),
      /** New sort order position (integer). */
      sortOrder: z.number().int(),
    })
  )
  .min(1);

/** Inferred type for batch sort order update input. */
export type BatchUpdateSortOrderInput = z.infer<typeof batchUpdateSortOrderSchema>;
