/**
 * Unit tests for lib/admin/revalidate.ts.
 *
 * Covers:
 * - revalidateAuditBrief busts the library list, the detail path, and the list tag.
 * - revalidateLearningGraph busts the learning-path list, detail, and list tag.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateAuditBrief, revalidateLearningGraph, CACHE_TAGS } from '@/lib/admin/revalidate';

const pathMock = vi.mocked(revalidatePath);
const tagMock = vi.mocked(revalidateTag);

describe('revalidateAuditBrief', () => {
  beforeEach(() => {
    pathMock.mockReset();
    tagMock.mockReset();
  });

  it('invalidates the library, detail page, and list tag', () => {
    revalidateAuditBrief('brief-1');

    expect(pathMock).toHaveBeenCalledWith('/library');
    expect(pathMock).toHaveBeenCalledWith('/audit-brief/brief-1');
    expect(pathMock).toHaveBeenCalledWith('/audit-brief/[id]', 'page');
    expect(tagMock).toHaveBeenCalledWith(CACHE_TAGS.auditBriefsList);
  });
});

describe('revalidateLearningGraph', () => {
  beforeEach(() => {
    pathMock.mockReset();
    tagMock.mockReset();
  });

  it('invalidates the learning-path list, detail page, and list tag', () => {
    revalidateLearningGraph('graph-1');

    expect(pathMock).toHaveBeenCalledWith('/learning-path');
    expect(pathMock).toHaveBeenCalledWith('/learning-path/graph-1');
    expect(pathMock).toHaveBeenCalledWith('/learning-path/[id]', 'page');
    expect(tagMock).toHaveBeenCalledWith(CACHE_TAGS.learningGraphsList);
  });
});
