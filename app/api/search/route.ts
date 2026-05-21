/**
 * Search API routes for The Audit Brief.
 *
 * @route GET  /api/search — Basic text search across audit briefs
 * @route POST /api/search — Semantic search using pgvector embeddings
 *
 * Both handlers persist a `search` UserActivity row with the query (capped at
 * 500 chars), the result count, and the search kind so future analytics pulls
 * can derive top queries, semantic-vs-keyword ratio, and zero-result rates.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';
import { ApiError, createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import { parsePaginationParams } from '@/lib/api/pagination';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';
import { requireAuth } from '@/lib/auth/session-helpers';
import { trackActivity } from '@/lib/analytics/track-activity';

const QUERY_MAX_LEN = 500;

/**
 * Basic text search across audit brief title, description, and tags.
 * Wrapped with request logging for operation tracking.
 *
 * Query params:
 * - q: search term (required)
 * - page, limit: pagination
 */
export const GET = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  try {
    const user = await requireAuth();
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

    await trackActivity({
      userId: user.userId,
      activityType: 'search',
      metadata: {
        query: searchQuery.slice(0, QUERY_MAX_LEN),
        resultCount: results.length,
        kind: 'keyword',
      },
    });

    return NextResponse.json({ results, query: searchQuery, total, page, limit });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
});

/**
 * Semantic search using pgvector embeddings.
 * Wrapped with request logging — tracks Azure OpenAI embedding call duration.
 *
 * Request body: { query: string }
 * Returns transcript segments with similarity scores.
 */
export const POST = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { query } = body;

    if (!query || !query.trim()) {
      return createErrorResponse(badRequest('query is required'));
    }

    const embedding = await generateEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Use $queryRaw tagged template literal for proper parameterization.
    // The embedding string is interpolated safely by Prisma's template engine.
    const results = await prisma.$queryRaw<
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
      Prisma.sql`SELECT t.id, t.audit_brief_id AS "auditBriefId", p.title AS "auditBriefTitle",
              t.full_text AS content, 0 AS "startTime", 0 AS "endTime",
              1 - (t.embedding <=> ${embeddingStr}::vector) AS similarity
       FROM transcripts t
       JOIN audit_briefs p ON p.id = t.audit_brief_id
       WHERE t.embedding IS NOT NULL
         AND 1 - (t.embedding <=> ${embeddingStr}::vector) > 0.7
       ORDER BY t.embedding <=> ${embeddingStr}::vector
       LIMIT 10`
    );

    await trackActivity({
      userId: user.userId,
      activityType: 'search',
      metadata: {
        query: String(query).slice(0, QUERY_MAX_LEN),
        resultCount: results.length,
        kind: 'semantic',
      },
    });

    return NextResponse.json({ results, query });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
});
