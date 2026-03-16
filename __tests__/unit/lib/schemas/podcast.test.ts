/**
 * Unit tests for podcast Zod schemas.
 *
 * Validates createPodcastSchema, updatePodcastSchema, and batchUpdateSortOrderSchema
 * against valid inputs, missing required fields, out-of-range values, and edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  createPodcastSchema,
  updatePodcastSchema,
  batchUpdateSortOrderSchema,
} from '@/lib/schemas/podcast';

const validCreateInput = {
  title: 'Introduction to Audit Methodology',
  description: 'A comprehensive overview of audit methodology fundamentals.',
  domain: 'Audit Methodology' as const,
  year: 2024,
  thumbnailUrl: 'https://example.com/thumb.jpg',
  audioShortUrl: 'https://example.com/audio-short.mp3',
};

describe('createPodcastSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = createPodcastSchema.safeParse(validCreateInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all optional fields', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      tags: ['audit', 'methodology'],
      audioLongUrl: 'https://example.com/audio-long.mp3',
      bulletinUrls: ['https://example.com/bulletin1.pdf'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty tags array', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      tags: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const { title: _title, ...rest } = validCreateInput;
    const result = createPodcastSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = createPodcastSchema.safeParse({ ...validCreateInput, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 200 characters', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('accepts title at boundary of 200 characters', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      title: 'a'.repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it('accepts title at boundary of 1 character', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      title: 'a',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty description', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      description: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 2000 characters', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      description: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts description at boundary of 2000 characters', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      description: 'a'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid domain', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      domain: 'Invalid Domain',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid domains', () => {
    const domains = [
      'Audit Methodology',
      'Accounting and Reporting',
      'Audit Technology',
      'Quality and Risk',
      'LEAP',
      'Auditing',
    ];
    for (const domain of domains) {
      const result = createPodcastSchema.safeParse({ ...validCreateInput, domain });
      expect(result.success).toBe(true);
    }
  });

  it('rejects year below 2020', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      year: 2019,
    });
    expect(result.success).toBe(false);
  });

  it('rejects year above 2099', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      year: 2100,
    });
    expect(result.success).toBe(false);
  });

  it('accepts year at lower boundary 2020', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      year: 2020,
    });
    expect(result.success).toBe(true);
  });

  it('accepts year at upper boundary 2099', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      year: 2099,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty thumbnailUrl', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      thumbnailUrl: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty audioShortUrl', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      audioShortUrl: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty audioLongUrl', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      audioLongUrl: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty bulletinUrls entries', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      bulletinUrls: [''],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing domain', () => {
    const { domain: _domain, ...rest } = validCreateInput;
    const result = createPodcastSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing year', () => {
    const { year: _year, ...rest } = validCreateInput;
    const result = createPodcastSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer year', () => {
    const result = createPodcastSchema.safeParse({
      ...validCreateInput,
      year: 2024.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('updatePodcastSchema', () => {
  it('accepts partial update with only title', () => {
    const result = updatePodcastSchema.safeParse({ title: 'New Title' });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with only description', () => {
    const result = updatePodcastSchema.safeParse({ description: 'New description' });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with multiple fields', () => {
    const result = updatePodcastSchema.safeParse({
      title: 'New Title',
      year: 2025,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty object (no fields)', () => {
    const result = updatePodcastSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('still validates field constraints on partial update', () => {
    const result = updatePodcastSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('still validates year range on partial update', () => {
    const result = updatePodcastSchema.safeParse({ year: 1999 });
    expect(result.success).toBe(false);
  });
});

describe('batchUpdateSortOrderSchema', () => {
  it('accepts valid array of id and sortOrder pairs', () => {
    const result = batchUpdateSortOrderSchema.safeParse([
      { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 1 },
      { id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', sortOrder: 2 },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid id', () => {
    const result = batchUpdateSortOrderSchema.safeParse([{ id: 'not-a-uuid', sortOrder: 1 }]);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer sortOrder', () => {
    const result = batchUpdateSortOrderSchema.safeParse([
      { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 1.5 },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects empty array', () => {
    const result = batchUpdateSortOrderSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = batchUpdateSortOrderSchema.safeParse([{ sortOrder: 1 }]);
    expect(result.success).toBe(false);
  });

  it('rejects missing sortOrder', () => {
    const result = batchUpdateSortOrderSchema.safeParse([
      { id: '550e8400-e29b-41d4-a716-446655440000' },
    ]);
    expect(result.success).toBe(false);
  });
});
