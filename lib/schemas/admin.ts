/**
 * Shared Zod schemas for admin-surface request bodies.
 *
 * Key responsibilities:
 * - Encode optional optimistic-concurrency version tokens sent by the edit wizard.
 * - Encode the typed-confirmation body required for permanent hard deletes.
 *
 * @example
 * import { expectedUpdatedAtSchema, hardDeleteConfirmSchema } from '@/lib/schemas/admin';
 *
 * const body = hardDeleteConfirmSchema.parse(await request.json());
 */
import { z } from 'zod';

/**
 * Optional `updatedAt` value supplied by the client to opt into optimistic
 * concurrency checks. Accepts Date, ISO string, or JSON-marshalled dates.
 */
export const expectedUpdatedAtSchema = z.coerce.date().optional();

/**
 * Body schema for permanent hard-delete endpoints.
 *
 * Requires the client to echo back the literal string `"DELETE"` in the
 * `confirm` field, matching the typed-confirmation UX and preventing a
 * bare HTTP DELETE from purging content accidentally.
 */
export const hardDeleteConfirmSchema = z.object({
  /** Must equal the literal string "DELETE". */
  confirm: z.literal('DELETE'),
});

/** Inferred type for hard-delete confirmation input. */
export type HardDeleteConfirmInput = z.infer<typeof hardDeleteConfirmSchema>;
