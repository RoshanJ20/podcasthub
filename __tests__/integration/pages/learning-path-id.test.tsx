/**
 * Integration tests for the `[id]` learning path server components.
 *
 * Verifies that both the public viewer (`app/(public)/learning-path/[id]`)
 * and the admin editor (`app/(admin)/admin/learning-graphs/[id]`) short-
 * circuit to `notFound()` before calling Prisma when the route parameter
 * is not a valid UUID. This prevents the `PrismaClientValidationError`
 * that the upstream query engine throws when handed a non-UUID value
 * for a `@db.Uuid` column.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

class NotFoundSentinel extends Error {
  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NotFoundSentinel';
  }
}

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new NotFoundSentinel();
  }),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    learningGraph: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/components/learning-path/path-viewer-wrapper', () => ({
  PathViewerWrapper: () => null,
}));

vi.mock('@/components/learning-path/linear-editor', () => ({
  LinearEditor: () => null,
}));
vi.mock('@/components/learning-path/graph-editor-initializer', () => ({
  GraphEditorInitializer: () => null,
}));

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

const validGraphId = '550e8400-e29b-41d4-a716-446655440010';

describe('public /learning-path/[id] server component', () => {
  let LearningPathViewerPage: (args: {
    params: Promise<{ id: string }>;
  }) => Promise<React.ReactElement>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/(public)/learning-path/[id]/page');
    LearningPathViewerPage = mod.default;
  });

  it('calls notFound() and skips Prisma when id is not a UUID', async () => {
    await expect(
      LearningPathViewerPage({ params: Promise.resolve({ id: 'new' }) })
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFound).toHaveBeenCalledTimes(1);
    expect(prisma.learningGraph.findUnique).not.toHaveBeenCalled();
  });

  it('queries Prisma when id is a valid UUID', async () => {
    vi.mocked(prisma.learningGraph.findUnique).mockResolvedValue({
      id: validGraphId,
      title: 'Test',
      description: null,
      domain: 'Auditing',
      pathType: 'linear',
      episodes: [],
      edges: [],
    } as never);

    await LearningPathViewerPage({ params: Promise.resolve({ id: validGraphId }) });

    expect(prisma.learningGraph.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: validGraphId } })
    );
  });
});

describe('admin /admin/learning-graphs/[id] server component', () => {
  let AdminLearningGraphEditorPage: (args: {
    params: Promise<{ id: string }>;
  }) => Promise<React.ReactElement>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/(admin)/admin/learning-graphs/[id]/page');
    AdminLearningGraphEditorPage = mod.default;
  });

  it('calls notFound() and skips Prisma when id is not a UUID', async () => {
    await expect(
      AdminLearningGraphEditorPage({ params: Promise.resolve({ id: 'new' }) })
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFound).toHaveBeenCalledTimes(1);
    expect(prisma.learningGraph.findUnique).not.toHaveBeenCalled();
  });
});
