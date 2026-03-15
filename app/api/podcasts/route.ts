/**
 * Podcast list and creation API routes.
 *
 * @route GET  /api/podcasts — Paginated podcast listing with filtering and sorting
 * @route POST /api/podcasts — Create a new podcast (admin/superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import { ApiError, createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import { createPodcastSchema } from '@/lib/schemas/podcast';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

/**
 * Retrieves a paginated list of non-archived podcasts.
 *
 * Supports query parameters:
 * - page, limit: pagination controls
 * - domain: filter by knowledge domain
 * - year: filter by publication year
 * - tags: comma-separated list; matches podcasts containing any of the given tags
 * - sort: "newest" (default), "oldest", or "title"
 *
 * @param request - The incoming Next.js request
 * @returns Paginated JSON response with podcast data and metadata
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePaginationParams(url);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { isArchived: false };

    const domain = url.searchParams.get('domain');
    if (domain) {
      where.domain = domain;
    }

    const yearParam = url.searchParams.get('year');
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        where.year = year;
      }
    }

    const tagsParam = url.searchParams.get('tags');
    if (tagsParam) {
      const tags = tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        where.tags = { hasSome: tags };
      }
    }

    // Build orderBy clause
    const sort = url.searchParams.get('sort') || 'newest';
    let orderBy: Record<string, string>;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'title':
        orderBy = { title: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [data, total] = await Promise.all([
      prisma.podcast.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.podcast.count({ where }),
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
 * Creates a new podcast.
 *
 * Requires authentication with admin or superadmin role.
 * Validates the request body against createPodcastSchema.
 *
 * @param request - The incoming Next.js request with podcast data in the body
 * @returns 201 JSON response with the created podcast
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const body = await request.json();
    const result = createPodcastSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const podcast = await prisma.podcast.create({
      data: result.data,
    });

    return NextResponse.json({ data: podcast }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
