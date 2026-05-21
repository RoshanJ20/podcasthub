/**
 * Zod schemas for the public POST /api/activity endpoint.
 *
 * Each `activityType` has a defined metadata shape; the request schema is a
 * discriminated union keyed on `activityType` so a malformed metadata payload
 * is rejected with a precise error rather than silently persisted.
 *
 * Server-side emissions go through `trackActivity()` directly and are typed at
 * compile time — this schema only protects the public HTTP boundary.
 *
 * @see lib/analytics/track-activity.ts — server-side composition point.
 */
import { z } from 'zod';

const sharedEnvelope = {
  auditBriefId: z.string().optional(),
  episodeId: z.string().optional(),
  graphId: z.string().optional(),
};

const listenMetadata = z.object({
  positionSeconds: z.number().nonnegative(),
  playbackRate: z.number().positive(),
  audioType: z.enum(['short', 'long']),
  sessionId: z.string().min(1),
  elapsedSinceLastPingMs: z.number().nonnegative(),
});

const bookmarkMetadata = z.object({
  bookmarkId: z.string().min(1),
  timestampSeconds: z.number().nonnegative(),
  hasNote: z.boolean(),
});

const unbookmarkMetadata = z.object({
  bookmarkId: z.string().min(1),
  timestampSeconds: z.number().nonnegative(),
});

const viewMetadata = z.object({ source: z.string().optional() }).optional();

const searchMetadata = z.object({
  query: z.string().min(1).max(500),
  resultCount: z.number().int().nonnegative(),
  kind: z.enum(['keyword', 'semantic']),
});

const emptyMetadata = z.object({}).optional();

const signinMetadata = z.object({
  provider: z.enum(['credentials', 'azure-ad']),
  isNewUser: z.boolean(),
});

const signinFailedMetadata = z.object({
  provider: z.enum(['credentials']),
  reason: z.enum(['invalid_password', 'sso_only_user']),
});

export const activityRequestSchema = z.discriminatedUnion('activityType', [
  z.object({
    activityType: z.literal('listen'),
    ...sharedEnvelope,
    metadata: listenMetadata.optional(),
  }),
  z.object({
    activityType: z.literal('bookmark'),
    ...sharedEnvelope,
    metadata: bookmarkMetadata.optional(),
  }),
  z.object({
    activityType: z.literal('unbookmark'),
    ...sharedEnvelope,
    metadata: unbookmarkMetadata,
  }),
  z.object({
    activityType: z.literal('complete_episode'),
    ...sharedEnvelope,
    metadata: emptyMetadata,
  }),
  z.object({
    activityType: z.literal('view_audit_brief'),
    ...sharedEnvelope,
    metadata: viewMetadata,
  }),
  z.object({
    activityType: z.literal('view_path'),
    ...sharedEnvelope,
    metadata: viewMetadata,
  }),
  z.object({
    activityType: z.literal('search'),
    ...sharedEnvelope,
    metadata: searchMetadata,
  }),
  z.object({
    activityType: z.literal('favorite'),
    ...sharedEnvelope,
    metadata: emptyMetadata,
  }),
  z.object({
    activityType: z.literal('unfavorite'),
    ...sharedEnvelope,
    metadata: emptyMetadata,
  }),
  z.object({
    activityType: z.literal('signin'),
    ...sharedEnvelope,
    metadata: signinMetadata,
  }),
  z.object({
    activityType: z.literal('signout'),
    ...sharedEnvelope,
    metadata: emptyMetadata,
  }),
  z.object({
    activityType: z.literal('signin_failed'),
    ...sharedEnvelope,
    metadata: signinFailedMetadata,
  }),
]);

export type ActivityRequest = z.infer<typeof activityRequestSchema>;
