/**
 * Learning graph list and creation API routes.
 *
 * @route GET  /api/learning-graphs — Paginated learning graph listing with visibility rules
 * @route POST /api/learning-graphs — Create a new learning graph (admin/superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import { ApiError, createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import { createLearningGraphSchema } from '@/lib/schemas/learning-graph';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

/**
 * Retrieves a paginated list of learning graphs.
 *
 * All learning paths are auto-published, so no visibility filtering is applied.
 * Supports query parameters:
 * - page, limit: pagination controls
 * - domain: filter by knowledge domain
 *
 * @param request - The incoming Next.js request
 * @returns Paginated JSON response with learning graph data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePaginationParams(url);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    const domain = url.searchParams.get('domain');
    if (domain) {
      where.domain = domain;
    }

    const [data, total] = await Promise.all([
      prisma.learningGraph.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.learningGraph.count({ where }),
    ]);

    return NextResponse.json(createPaginatedResponse(data, { page, limit, total }));
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Creates a new learning graph.
 *
 * Requires authentication with admin or superadmin role.
 * Validates the request body against createLearningGraphSchema.
 *
 * @param request - The incoming Next.js request with learning graph data
 * @returns 201 JSON response with the created learning graph
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const body = await request.json();
    const result = createLearningGraphSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const graph = await prisma.learningGraph.create({
      data: {
        ...result.data,
        createdBy: user.userId,
        isPublished: true,
      },
    });

    return NextResponse.json({ data: graph }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
