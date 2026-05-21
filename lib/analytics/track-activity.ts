/**
 * User activity tracking — single composition point for writing UserActivity rows.
 *
 * Key responsibilities:
 * - Provide a typed `ActivityType` union and matching runtime allowlist for
 *   server-side and Zod-schema use.
 * - Persist activity rows via the prisma client.
 * - Never throw — analytics writes are best-effort and must not fail the parent
 *   request. Failures are logged through Pino at warn level.
 *
 * Dependencies:
 * - @/lib/db (prisma client singleton)
 * - @/lib/logger (createLogger)
 *
 * @example
 *   await trackActivity({
 *     userId: user.userId,
 *     activityType: 'bookmark',
 *     auditBriefId,
 *     metadata: { bookmarkId, timestampSeconds, hasNote: true },
 *   });
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('track-activity');

/**
 * All activity types persisted to the `user_activity` table.
 *
 * Adding a new type requires:
 *   1. Append it here and to `ACTIVITY_TYPES`.
 *   2. Extend the Zod discriminated union in `lib/schemas/activity.ts` so the
 *      public `/api/activity` endpoint accepts and validates its metadata.
 *   3. Wire the emission from the relevant route or hook.
 */
export type ActivityType =
  | 'listen'
  | 'bookmark'
  | 'unbookmark'
  | 'complete_episode'
  | 'view_audit_brief'
  | 'view_path'
  | 'search'
  | 'favorite'
  | 'unfavorite'
  | 'signin'
  | 'signout'
  | 'signin_failed';

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  'listen',
  'bookmark',
  'unbookmark',
  'complete_episode',
  'view_audit_brief',
  'view_path',
  'search',
  'favorite',
  'unfavorite',
  'signin',
  'signout',
  'signin_failed',
] as const;

export interface TrackActivityInput {
  userId: string;
  activityType: ActivityType;
  auditBriefId?: string | null;
  episodeId?: string | null;
  graphId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Writes a UserActivity row.
 *
 * Never throws. On prisma failure the error is logged at warn level and the
 * promise resolves to undefined so callers can `void trackActivity(...)`
 * without try/catch.
 *
 * @param input - The activity to persist.
 * @returns A promise that always resolves to undefined.
 */
export async function trackActivity(input: TrackActivityInput): Promise<void> {
  try {
    await prisma.userActivity.create({
      data: {
        userId: input.userId,
        activityType: input.activityType,
        auditBriefId: input.auditBriefId ?? null,
        episodeId: input.episodeId ?? null,
        graphId: input.graphId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    log.warn(
      { error, activityType: input.activityType, userId: input.userId },
      'Failed to write UserActivity'
    );
  }
}
