/**
 * Search API routes for The Audit Brief.
 *
 * @route GET  /api/search — Basic text search across audit briefs
 * @route POST /api/search — Semantic search using pgvector embeddings
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';
import { createErrorResponse, badRequest } from '@/lib/api/errors';
import { parsePaginationParams } from '@/lib/api/pagination';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';

/**
 * Basic text search across audit brief title, description, and tags.
 * Wrapped with request logging for operation tracking.
 *
 * Query params:
 * - q: search term (required)
 * - page, limit: pagination
 */
export const GET = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('q');

  if (!searchQuery || !searchQuery.trim()) {
    return createErrorResponse(badRequest('Query parameter "q" is required'));
  }

  const { page, limit } = parsePaginationParams(url);
  const skip = (page - 1) * limit;

  const where = {
    isArchived: false,
    OR: [
      { title: { contains: searchQuery, mode: 'insensitive' as const } },
      { description: { contains: searchQuery, mode: 'insensitive' as const } },
      { tags: { has: searchQuery.toLowerCase() } },
    ],
  };

  const [results, total] = await Promise.all([
    prisma.auditBrief.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        domain: true,
        tags: true,
        thumbnailUrl: true,
      },
      skip,
      take: limit,
    }),
    prisma.auditBrief.count({ where }),
  ]);

  return NextResponse.json({ results, query: searchQuery, total, page, limit });
});

/**
 * Semantic search using pgvector embeddings.
 * Wrapped with request logging — tracks Azure OpenAI embedding call duration.
 *
 * Request body: { query: string }
 * Returns transcript segments with similarity scores.
 */
export const POST = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json();
  const { query } = body;

  if (!query || !query.trim()) {
    return createErrorResponse(badRequest('query is required'));
  }

  const embedding = await generateEmbedding(query);
  const embeddingStr = `[${embedding.join(',')}]`;

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      auditBriefId: string;
      auditBriefTitle: string;
      content: string;
      startTime: number;
      endTime: number;
      similarity: number;
    }>
  >(
    `SELECT t.id, t.audit_brief_id AS "auditBriefId", p.title AS "auditBriefTitle",
            t.full_text AS content, 0 AS "startTime", 0 AS "endTime",
            1 - (t.embedding <=> $1::vector) AS similarity
     FROM transcripts t
     JOIN audit_briefs p ON p.id = t.audit_brief_id
     WHERE t.embedding IS NOT NULL
       AND 1 - (t.embedding <=> $1::vector) > 0.7
     ORDER BY t.embedding <=> $1::vector
     LIMIT 10`,
    embeddingStr
  );

  return NextResponse.json({ results, query });
});
