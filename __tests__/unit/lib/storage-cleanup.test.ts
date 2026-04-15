/**
 * Unit tests for lib/storage-cleanup.ts.
 *
 * Covers:
 * - collectKeys normalizes heterogeneous OrphanSource inputs, rejects absolute URLs,
 *   and deduplicates repeated keys.
 * - diffOrphanedKeys returns only keys present in `prev` but missing in `next`.
 * - deleteKeys swallows per-blob failures, treats BlobNotFound as success, and
 *   short-circuits on empty input without calling the storage SDK.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/storage', () => ({
  deleteObject: vi.fn(),
}));

import { collectKeys, diffOrphanedKeys, deleteKeys } from '@/lib/storage-cleanup';
import { deleteObject } from '@/lib/storage';

const deleteObjectMock = vi.mocked(deleteObject);

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Parameters<typeof deleteKeys>[1];
}

describe('collectKeys', () => {
  it('returns an empty array for null/undefined sources', () => {
    expect(collectKeys(null)).toEqual([]);
    expect(collectKeys(undefined)).toEqual([]);
  });

  it('flattens every populated field into bare keys', () => {
    const keys = collectKeys({
      thumbnailUrl: 'thumbs/a.png',
      audioShortUrl: 'audio/short.m3u8',
      audioLongUrl: 'audio/long.m3u8',
      bulletinUrls: ['docs/b1.pdf', 'docs/b2.pdf'],
    });

    expect(keys).toEqual([
      'thumbs/a.png',
      'audio/short.m3u8',
      'audio/long.m3u8',
      'docs/b1.pdf',
      'docs/b2.pdf',
    ]);
  });

  it('ignores absolute URLs that cannot be translated to keys', () => {
    const keys = collectKeys({
      thumbnailUrl: 'https://cdn.example.com/thumb.png',
      audioShortUrl: 'audio/short.m3u8',
    });

    expect(keys).toEqual(['audio/short.m3u8']);
  });

  it('strips a single leading slash and deduplicates repeated keys', () => {
    const keys = collectKeys({
      thumbnailUrl: '/thumbs/x.png',
      bulletinUrls: ['thumbs/x.png', 'docs/d.pdf', 'docs/d.pdf'],
    });

    expect(keys).toEqual(['thumbs/x.png', 'docs/d.pdf']);
  });

  it('ignores empty strings, null, and undefined field values', () => {
    const keys = collectKeys({
      thumbnailUrl: '',
      audioShortUrl: undefined,
      audioLongUrl: null,
      bulletinUrls: [],
    });

    expect(keys).toEqual([]);
  });
});

describe('diffOrphanedKeys', () => {
  it('returns keys present in prev but absent from next', () => {
    const orphans = diffOrphanedKeys(
      { thumbnailUrl: 'thumbs/old.png', audioShortUrl: 'audio/keep.m3u8' },
      { thumbnailUrl: 'thumbs/new.png', audioShortUrl: 'audio/keep.m3u8' }
    );

    expect(orphans).toEqual(['thumbs/old.png']);
  });

  it('detects removals from bulletinUrls arrays', () => {
    const orphans = diffOrphanedKeys(
      { bulletinUrls: ['docs/a.pdf', 'docs/b.pdf', 'docs/c.pdf'] },
      { bulletinUrls: ['docs/a.pdf'] }
    );

    expect(orphans.sort()).toEqual(['docs/b.pdf', 'docs/c.pdf']);
  });

  it('returns empty when no keys are removed', () => {
    const orphans = diffOrphanedKeys(
      { thumbnailUrl: 'thumbs/same.png' },
      { thumbnailUrl: 'thumbs/same.png', audioShortUrl: 'audio/added.m3u8' }
    );

    expect(orphans).toEqual([]);
  });

  it('returns empty when prev is nullish', () => {
    expect(diffOrphanedKeys(null, { thumbnailUrl: 'thumbs/x.png' })).toEqual([]);
  });
});

describe('deleteKeys', () => {
  beforeEach(() => {
    deleteObjectMock.mockReset();
  });

  it('returns empty arrays and does not call the SDK when the input is empty', async () => {
    const result = await deleteKeys([], makeLogger());
    expect(result).toEqual({ deleted: [], failed: [] });
    expect(deleteObjectMock).not.toHaveBeenCalled();
  });

  it('marks all keys as deleted on success', async () => {
    deleteObjectMock.mockResolvedValue(undefined);
    const result = await deleteKeys(['a', 'b'], makeLogger());

    expect(result.deleted).toEqual(['a', 'b']);
    expect(result.failed).toEqual([]);
    expect(deleteObjectMock).toHaveBeenCalledTimes(2);
  });

  it('swallows BlobNotFound and reports the key as deleted', async () => {
    const notFound = Object.assign(new Error('The specified blob does not exist.'), {
      code: 'BlobNotFound',
    });
    deleteObjectMock.mockRejectedValueOnce(notFound).mockResolvedValueOnce(undefined);

    const result = await deleteKeys(['gone', 'alive'], makeLogger());

    expect(result.deleted.sort()).toEqual(['alive', 'gone']);
    expect(result.failed).toEqual([]);
  });

  it('captures other errors in `failed` without throwing', async () => {
    deleteObjectMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);

    const result = await deleteKeys(['bad', 'good'], makeLogger());

    expect(result.deleted).toEqual(['good']);
    expect(result.failed).toEqual([{ key: 'bad', error: 'boom' }]);
  });
});
