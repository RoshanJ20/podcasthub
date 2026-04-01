/**
 * Zod schemas for bookmark validation.
 *
 * Provides schemas for creating and updating bookmarks.
 * Bookmarks can be scoped to either an audit brief or a learning path episode.
 * Exactly one of `auditBriefId` or `episodeId` must be provided when creating.
 */
import { z } from 'zod';

/**
 * Schema for creating a new bookmark.
 *
 * Exactly one of auditBriefId (UUID) or episodeId (UUID) is required.
 * Required: timestampSeconds (non-negative number).
 * Optional: note (max 1000 characters).
 */
export const createBookmarkSchema = z
  .object({
    /** UUID of the audit brief being bookmarked. Mutually exclusive with episodeId. */
    auditBriefId: z.string().uuid().optional(),
    /** UUID of the learning path episode being bookmarked. Mutually exclusive with auditBriefId. */
    episodeId: z.string().uuid().optional(),
    /** Timestamp in seconds within the audio (non-negative). */
    timestampSeconds: z.number().min(0),
    /** Optional note associated with the bookmark (max 1000 characters). */
    note: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      const hasAuditBrief = data.auditBriefId !== undefined;
      const hasEpisode = data.episodeId !== undefined;
      return (hasAuditBrief && !hasEpisode) || (!hasAuditBrief && hasEpisode);
    },
    { message: 'Exactly one of auditBriefId or episodeId must be provided' }
  );

/** Inferred type for bookmark creation input. */
export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;

/**
 * Schema for updating an existing bookmark.
 *
 * Only the note field can be updated (max 1000 characters).
 */
export const updateBookmarkSchema = z.object({
  /** Optional updated note (max 1000 characters). */
  note: z.string().max(1000).optional(),
});

/** Inferred type for bookmark update input. */
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;
