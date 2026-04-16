/**
 * Unit tests for the orphan blob sweep logic.
 *
 * Verifies:
 * - collectAllReferencedKeys aggregates keys from all 3 models
 * - collectAllReferencedKeys normalizes keys via toKey()
 * - findOrphanedKeys identifies blobs not referenced by any DB record
 * - findOrphanedKeys returns empty array when all blobs are referenced
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    auditBrief: { findMany: vi.fn() },
    learningGraph: { findMany: vi.fn() },
    episode: { findMany: vi.fn() },
  },
}));

import { prisma } from '@/lib/db';
import { collectAllReferencedKeys, findOrphanedKeys } from '@/lib/admin/blob-sweep';

describe('Blob Sweep Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('collectAllReferencedKeys', () => {
    it('aggregates keys from all three models', async () => {
      vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([
        {
          thumbnailUrl: 'image/uuid1/thumb.jpg',
          audioShortUrl: 'audio/uuid1/short.m4a',
          audioLongUrl: 'audio/uuid1/long.m4a',
          bulletinUrls: ['pdf/uuid1/doc1.pdf', 'pdf/uuid1/doc2.pdf'],
        },
      ] as never);

      vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([
        { thumbnailUrl: 'image/uuid2/graph-thumb.jpg' },
      ] as never);

      vi.mocked(prisma.episode.findMany).mockResolvedValue([
        { thumbnailUrl: 'image/uuid3/ep-thumb.jpg', audioUrl: 'audio/uuid3/ep.m4a' },
      ] as never);

      const keys = await collectAllReferencedKeys();

      expect(keys).toContain('image/uuid1/thumb.jpg');
      expect(keys).toContain('audio/uuid1/short.m4a');
      expect(keys).toContain('audio/uuid1/long.m4a');
      expect(keys).toContain('pdf/uuid1/doc1.pdf');
      expect(keys).toContain('pdf/uuid1/doc2.pdf');
      expect(keys).toContain('image/uuid2/graph-thumb.jpg');
      expect(keys).toContain('image/uuid3/ep-thumb.jpg');
      expect(keys).toContain('audio/uuid3/ep.m4a');
      expect(keys.size).toBe(8);
    });

    it('skips null and absolute URL fields', async () => {
      vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([
        {
          thumbnailUrl: 'https://external.com/img.jpg',
          audioShortUrl: 'audio/uuid/short.m4a',
          audioLongUrl: null,
          bulletinUrls: [],
        },
      ] as never);

      vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([{ thumbnailUrl: null }] as never);

      vi.mocked(prisma.episode.findMany).mockResolvedValue([] as never);

      const keys = await collectAllReferencedKeys();

      expect(keys.size).toBe(1);
      expect(keys).toContain('audio/uuid/short.m4a');
    });

    it('deduplicates keys referenced by multiple records', async () => {
      const sharedKey = 'image/uuid/shared-thumb.jpg';

      vi.mocked(prisma.auditBrief.findMany).mockResolvedValue([
        {
          thumbnailUrl: sharedKey,
          audioShortUrl: 'audio/uuid/a.m4a',
          audioLongUrl: null,
          bulletinUrls: [],
        },
      ] as never);

      vi.mocked(prisma.learningGraph.findMany).mockResolvedValue([
        { thumbnailUrl: sharedKey },
      ] as never);

      vi.mocked(prisma.episode.findMany).mockResolvedValue([] as never);

      const keys = await collectAllReferencedKeys();

      expect(keys.size).toBe(2);
    });
  });

  describe('findOrphanedKeys', () => {
    it('returns blob keys not in the referenced set', () => {
      const allBlobKeys = [
        'audio/uuid1/file.m4a',
        'image/uuid2/thumb.jpg',
        'audio/orphan/old-file.m4a',
      ];
      const referencedKeys = new Set(['audio/uuid1/file.m4a', 'image/uuid2/thumb.jpg']);

      const orphans = findOrphanedKeys(allBlobKeys, referencedKeys);

      expect(orphans).toEqual(['audio/orphan/old-file.m4a']);
    });

    it('returns empty array when all blobs are referenced', () => {
      const allBlobKeys = ['audio/uuid1/file.m4a'];
      const referencedKeys = new Set(['audio/uuid1/file.m4a']);

      const orphans = findOrphanedKeys(allBlobKeys, referencedKeys);

      expect(orphans).toEqual([]);
    });

    it('returns all blobs when none are referenced', () => {
      const allBlobKeys = ['audio/orphan1.m4a', 'image/orphan2.jpg'];
      const referencedKeys = new Set<string>();

      const orphans = findOrphanedKeys(allBlobKeys, referencedKeys);

      expect(orphans).toEqual(['audio/orphan1.m4a', 'image/orphan2.jpg']);
    });
  });
});
