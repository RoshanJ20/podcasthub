/**
 * Zod schemas for audit brief validation.
 *
 * Provides schemas for creating, updating, and batch-reordering auditBriefs.
 */
import { z } from 'zod';
import { domainSchema } from './common';
import { expectedUpdatedAtSchema } from './admin';

/**
 * Schema for creating a new auditBrief.
 *
 * Required: title, description, domain, year, thumbnailUrl, audioShortUrl.
 * Optional: tags, audioLongUrl, bulletinUrls.
 */
export const createAuditBriefSchema = z.object({
  /** Audit brief title (1-200 characters). */
  title: z.string().min(1).max(200),
  /** Audit brief description (1-2000 characters). */
  description: z.string().min(1).max(2000),
  /** Knowledge domain this audit brief belongs to. */
  domain: domainSchema,
  /** Publication year (2020-2099, must be an integer). */
  year: z.coerce.number().int().min(2020).max(2099),
  /** Optional array of string tags. */
  tags: z.array(z.string()).optional(),
  /** Storage key or URL for the audit brief thumbnail image. */
  thumbnailUrl: z.string().min(1),
  /** Storage key or URL for the short-form audio file. */
  audioShortUrl: z.string().min(1),
  /** Optional storage key or URL for the long-form audio file. */
  audioLongUrl: z.string().min(1).nullable().optional(),
  /** Optional array of bulletin document storage keys or URLs. */
  bulletinUrls: z.array(z.string().min(1)).nullable().optional(),
});

/** Inferred type for audit brief creation input. */
export type CreateAuditBriefInput = z.infer<typeof createAuditBriefSchema>;

/**
 * Schema for updating an existing auditBrief.
 *
 * All fields are optional but at least one must be provided.
 * Field constraints from createAuditBriefSchema still apply.
 *
 * Includes optional `isArchived` (used by unarchive UX via PUT) and
 * optional `expectedUpdatedAt` (opt-in optimistic concurrency check). Clients
 * that omit `expectedUpdatedAt` retain legacy last-writer-wins behavior so
 * the edit wizard can be migrated incrementally.
 */
export const updateAuditBriefSchema = createAuditBriefSchema
  .partial()
  .extend({
    /** Allow toggling archived state through PUT (used by the unarchive action). */
    isArchived: z.boolean().optional(),
    /** Optional snapshot of `updatedAt` from the last client read for concurrency. */
    expectedUpdatedAt: expectedUpdatedAtSchema,
  })
  .refine(
    (data) => {
      // At least one *mutation* field must be provided — expectedUpdatedAt alone is not a change.
      const { expectedUpdatedAt: _ignored, ...rest } = data;
      void _ignored;
      return Object.keys(rest).length > 0;
    },
    {
      message: 'At least one field must be provided for update',
    }
  );

/** Inferred type for audit brief update input. */
export type UpdateAuditBriefInput = z.infer<typeof updateAuditBriefSchema>;

/**
 * Schema for batch-updating audit brief sort orders.
 *
 * Expects a non-empty array of objects with `id` (UUID) and `sortOrder` (integer).
 */
export const batchUpdateSortOrderSchema = z
  .array(
    z.object({
      /** Audit brief UUID. */
      id: z.uuid(),
      /** New sort order position (integer). */
      sortOrder: z.number().int(),
    })
  )
  .min(1);

/** Inferred type for batch sort order update input. */
export type BatchUpdateSortOrderInput = z.infer<typeof batchUpdateSortOrderSchema>;
