/**
 * Bookmark API routes — list and create bookmarks.
 *
 * - GET: Paginated list of user's bookmarks, optional filter by podcastId.
 * - POST: Create a new bookmark. Validates with createBookmarkSchema.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { ApiError, createErrorResponse, internalError, badRequest } from '@/lib/api/errors';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import { createBookmarkSchema } from '@/lib/schemas/bookmark';

/**
 * Handles GET requests to retrieve the authenticated user's bookmarks.
 *
 * Returns a paginated list of bookmarks, optionally filtered by podcastId.
 * Supports page and limit query parameters for pagination.
 *
 * @param request - The incoming Next.js request object with optional query params
 * @returns Paginated JSON response with bookmark data and pagination metadata
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const url = new URL(request.url);
    const { page, limit } = parsePaginationParams(url);
    const skip = (page - 1) * limit;

    const podcastId = url.searchParams.get('podcastId');

    const where: Record<string, unknown> = { userId: user.userId };
    if (podcastId) {
      where.podcastId = podcastId;
    }

    const [data, total] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bookmark.count({ where }),
    ]);

    return NextResponse.json(createPaginatedResponse(data, { page, limit, total }));
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}

/**
 * Handles POST requests to create a new bookmark.
 *
 * Validates the request body against createBookmarkSchema and creates a bookmark
 * associated with the authenticated user.
 *
 * @param request - The incoming Next.js request object with bookmark data in the body
 * @returns JSON response with the created bookmark and 201 status
 * @throws {ApiError} 400 if the bookmark data fails schema validation
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();

    const parsed = createBookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(badRequest('Invalid bookmark data', parsed.error.flatten()));
    }

    const { podcastId, timestampSeconds, note } = parsed.data;

    const bookmark = await prisma.bookmark.create({
      data: {
        userId: user.userId,
        podcastId,
        timestampSeconds,
        note,
      },
    });

    return NextResponse.json({ data: bookmark }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}
