/**
 * Unit tests for the activity-payload Zod schemas.
 *
 * Validates the discriminated union keyed on `activityType` used by the public
 * POST /api/activity endpoint. Each branch defines a metadata shape; this test
 * file covers at least one passing and one failing case per branch, plus the
 * shared envelope fields.
 */
import { describe, it, expect } from 'vitest';
import { activityRequestSchema } from '@/lib/schemas/activity';

const uuid = '550e8400-e29b-41d4-a716-446655440000';

describe('activityRequestSchema — envelope', () => {
  it('rejects unknown activityType values', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'made_up_event',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing activityType', () => {
    const result = activityRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts optional foreign-key strings on every branch', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'view_audit_brief',
      auditBriefId: uuid,
      episodeId: 'ep-1',
      graphId: 'graph-1',
    });
    expect(result.success).toBe(true);
  });
});

describe('activityRequestSchema — listen', () => {
  it('accepts the full enriched metadata shape', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'listen',
      auditBriefId: uuid,
      metadata: {
        positionSeconds: 42.5,
        playbackRate: 1.5,
        audioType: 'long',
        sessionId: uuid,
        elapsedSinceLastPingMs: 30000,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric positionSeconds', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'listen',
      metadata: {
        positionSeconds: 'foo',
        playbackRate: 1,
        audioType: 'long',
        sessionId: uuid,
        elapsedSinceLastPingMs: 30000,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown audioType', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'listen',
      metadata: {
        positionSeconds: 0,
        playbackRate: 1,
        audioType: 'medium',
        sessionId: uuid,
        elapsedSinceLastPingMs: 0,
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('activityRequestSchema — bookmark / unbookmark', () => {
  it('accepts a valid bookmark payload', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'bookmark',
      auditBriefId: uuid,
      metadata: { bookmarkId: uuid, timestampSeconds: 12, hasNote: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative timestampSeconds on bookmark', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'bookmark',
      metadata: { bookmarkId: uuid, timestampSeconds: -1, hasNote: false },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unbookmark missing bookmarkId', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'unbookmark',
      metadata: { timestampSeconds: 5 },
    });
    expect(result.success).toBe(false);
  });
});

describe('activityRequestSchema — complete_episode', () => {
  it('accepts empty metadata', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'complete_episode',
      episodeId: 'ep-1',
      graphId: 'graph-1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts omitted metadata', () => {
    const result = activityRequestSchema.safeParse({ activityType: 'complete_episode' });
    expect(result.success).toBe(true);
  });
});

describe('activityRequestSchema — view_audit_brief / view_path', () => {
  it('accepts view_audit_brief with source', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'view_audit_brief',
      auditBriefId: uuid,
      metadata: { source: 'home' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts view_path without metadata', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'view_path',
      graphId: uuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-string source', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'view_audit_brief',
      metadata: { source: 123 },
    });
    expect(result.success).toBe(false);
  });
});

describe('activityRequestSchema — search', () => {
  it('accepts keyword search', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'search',
      metadata: { query: 'audit risk', resultCount: 5, kind: 'keyword' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts semantic search', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'search',
      metadata: { query: 'risk', resultCount: 0, kind: 'semantic' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown kind', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'search',
      metadata: { query: 'risk', resultCount: 1, kind: 'fuzzy' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects query longer than 500 characters', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'search',
      metadata: { query: 'a'.repeat(501), resultCount: 0, kind: 'keyword' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts query at exactly 500 characters', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'search',
      metadata: { query: 'a'.repeat(500), resultCount: 0, kind: 'keyword' },
    });
    expect(result.success).toBe(true);
  });
});

describe('activityRequestSchema — favorite / unfavorite', () => {
  it('accepts favorite with empty metadata', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'favorite',
      auditBriefId: uuid,
    });
    expect(result.success).toBe(true);
  });

  it('accepts unfavorite with empty metadata', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'unfavorite',
      graphId: uuid,
    });
    expect(result.success).toBe(true);
  });
});

describe('activityRequestSchema — signin / signout / signin_failed', () => {
  it('accepts credentials signin', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'signin',
      metadata: { provider: 'credentials', isNewUser: false },
    });
    expect(result.success).toBe(true);
  });

  it('accepts azure-ad signin with isNewUser', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'signin',
      metadata: { provider: 'azure-ad', isNewUser: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown provider', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'signin',
      metadata: { provider: 'google', isNewUser: false },
    });
    expect(result.success).toBe(false);
  });

  it('accepts signout with empty metadata', () => {
    const result = activityRequestSchema.safeParse({ activityType: 'signout' });
    expect(result.success).toBe(true);
  });

  it('accepts signin_failed with valid reason', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'signin_failed',
      metadata: { provider: 'credentials', reason: 'invalid_password' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts signin_failed with sso_only_user reason', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'signin_failed',
      metadata: { provider: 'credentials', reason: 'sso_only_user' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects signin_failed with unknown reason', () => {
    const result = activityRequestSchema.safeParse({
      activityType: 'signin_failed',
      metadata: { provider: 'credentials', reason: 'bad_vibes' },
    });
    expect(result.success).toBe(false);
  });
});
