/**
 * Zod schemas for learning graph validation.
 *
 * Provides schemas for creating and updating learning graphs.
 */
import { z } from 'zod';
import { domainSchema } from './common';
import { expectedUpdatedAtSchema } from './admin';

/** Valid path types for a learning graph. */
export const PATH_TYPES = ['linear', 'graph'] as const;

/**
 * Schema for creating a new learning graph.
 *
 * Required: title, domain, pathType.
 * Optional: description, thumbnailUrl.
 */
export const createLearningGraphSchema = z.object({
  /** Learning graph title (1-200 characters). */
  title: z.string().min(1).max(200),
  /** Optional description (max 2000 characters). */
  description: z.string().max(2000).optional(),
  /** Knowledge domain this learning graph belongs to. */
  domain: domainSchema,
  /** Type of learning path structure. */
  pathType: z.enum(PATH_TYPES),
  /** Optional URL to the learning graph thumbnail image. */
  thumbnailUrl: z.url().optional(),
});

/** Inferred type for learning graph creation input. */
export type CreateLearningGraphInput = z.infer<typeof createLearningGraphSchema>;

/**
 * Schema for updating an existing learning graph.
 *
 * All fields are optional. Field constraints from createLearningGraphSchema still apply.
 * Includes an opt-in `expectedUpdatedAt` for optimistic-concurrency detection —
 * clients that omit it retain legacy last-writer-wins semantics.
 */
export const updateLearningGraphSchema = createLearningGraphSchema.partial().extend({
  /** Optional snapshot of `updatedAt` from the last client read for concurrency. */
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

/** Inferred type for learning graph update input. */
export type UpdateLearningGraphInput = z.infer<typeof updateLearningGraphSchema>;
