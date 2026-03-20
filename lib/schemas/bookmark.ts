/**
 * Zod schemas for bookmark validation.
 *
 * Provides schemas for creating and updating audit brief bookmarks.
 */
import { z } from 'zod';

/**
 * Schema for creating a new bookmark.
 *
 * Required: auditBriefId (UUID), timestampSeconds (non-negative number).
 * Optional: note (max 1000 characters).
 */
export const createBookmarkSchema = z.object({
  /** UUID of the audit brief being bookmarked. */
  auditBriefId: z.uuid(),
  /** Timestamp in seconds within the audit brief audio (non-negative). */
  timestampSeconds: z.number().min(0),
  /** Optional note associated with the bookmark (max 1000 characters). */
  note: z.string().max(1000).optional(),
});

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
