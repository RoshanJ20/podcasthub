/**
 * Unit tests for bookmark Zod schemas.
 *
 * Validates createBookmarkSchema and updateBookmarkSchema
 * against valid inputs, missing required fields, out-of-range values, and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { createBookmarkSchema, updateBookmarkSchema } from '@/lib/schemas/bookmark';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('createBookmarkSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      timestampSeconds: 120.5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with optional note', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      timestampSeconds: 0,
      note: 'Important section about audit risk',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when neither auditBriefId nor episodeId is provided', () => {
    const result = createBookmarkSchema.safeParse({
      timestampSeconds: 120,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid auditBriefId (not uuid)', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: 'not-a-uuid',
      timestampSeconds: 120,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing timestampSeconds', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative timestampSeconds', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      timestampSeconds: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts timestampSeconds at boundary of 0', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      timestampSeconds: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts float timestampSeconds', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      timestampSeconds: 45.75,
    });
    expect(result.success).toBe(true);
  });

  it('rejects note exceeding 1000 characters', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      timestampSeconds: 120,
      note: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts note at boundary of 1000 characters', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      timestampSeconds: 120,
      note: 'a'.repeat(1000),
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty note (treated as optional)', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      timestampSeconds: 120,
      note: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with episodeId instead of auditBriefId', () => {
    const result = createBookmarkSchema.safeParse({
      episodeId: validUuid,
      timestampSeconds: 60,
    });
    expect(result.success).toBe(true);
  });

  it('accepts episodeId with optional note', () => {
    const result = createBookmarkSchema.safeParse({
      episodeId: validUuid,
      timestampSeconds: 30,
      note: 'Episode note',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when both auditBriefId and episodeId are provided', () => {
    const result = createBookmarkSchema.safeParse({
      auditBriefId: validUuid,
      episodeId: validUuid,
      timestampSeconds: 60,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid episodeId (not uuid)', () => {
    const result = createBookmarkSchema.safeParse({
      episodeId: 'not-a-uuid',
      timestampSeconds: 60,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateBookmarkSchema', () => {
  it('accepts valid note', () => {
    const result = updateBookmarkSchema.safeParse({
      note: 'Updated note content',
    });
    expect(result.success).toBe(true);
  });

  it('rejects note exceeding 1000 characters', () => {
    const result = updateBookmarkSchema.safeParse({
      note: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts note at boundary of 1000 characters', () => {
    const result = updateBookmarkSchema.safeParse({
      note: 'a'.repeat(1000),
    });
    expect(result.success).toBe(true);
  });

  it('accepts omitted note', () => {
    const result = updateBookmarkSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts empty note', () => {
    const result = updateBookmarkSchema.safeParse({ note: '' });
    expect(result.success).toBe(true);
  });
});
