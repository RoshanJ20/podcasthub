/**
 * Cache revalidation helpers for admin mutations.
 *
 * Key responsibilities:
 * - Invalidate Next.js ISR/server-component caches for public pages after
 *   admin edits, archives, or deletes.
 * - Centralize path + tag conventions so every admin route busts the same
 *   set of surfaces consistently.
 *
 * This module is server-only. Importing it from a client component will
 * cause the Next.js build to fail loudly, which is the desired behavior.
 *
 * @example
 * await prisma.auditBrief.update({ ... });
 * revalidateAuditBrief(id);
 */
import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Cache tags used by public list endpoints. Update both the tag on the
 * `fetch`/`unstable_cache` call sites and here at the same time.
 */
export const CACHE_TAGS = {
  auditBriefsList: 'audit-briefs:list',
  learningGraphsList: 'learning-graphs:list',
} as const;

/**
 * Invalidates the public library listing and the affected audit brief's
 * detail page after a mutation.
 *
 * @param id - UUID of the audit brief that changed.
 */
export function revalidateAuditBrief(id: string): void {
  revalidatePath('/library');
  revalidatePath(`/audit-brief/${id}`);
  revalidatePath('/audit-brief/[id]', 'page');
  revalidateTag(CACHE_TAGS.auditBriefsList);
}

/**
 * Invalidates the public learning path listing and the affected graph's
 * detail page after a mutation.
 *
 * @param id - UUID of the learning graph that changed.
 */
export function revalidateLearningGraph(id: string): void {
  revalidatePath('/learning-path');
  revalidatePath(`/learning-path/${id}`);
  revalidatePath('/learning-path/[id]', 'page');
  revalidateTag(CACHE_TAGS.learningGraphsList);
}
