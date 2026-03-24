/**
 * Bookmark API routes — list and create bookmarks.
 *
 * - GET: Paginated list of user's bookmarks, optional filter by auditBriefId.
 * - POST: Create a new bookmark. Validates with createBookmarkSchema.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session-helpers';
import { ApiError, createErrorResponse, internalError, badRequest } from '@/lib/api/errors';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import { createBookmarkSchema } from '@/lib/schemas/bookmark';

/**
 * Handles GET requests to retrieve the authenticated user's bookmarks.
 *
 * Returns a paginated list of bookmarks, optionally filtered by auditBriefId.
 * Supports page and limit query parameters for pagination.
 *
 * @param request - The incoming Next.js request object with optional query params
 * @returns Paginated JSON response with bookmark data and pagination metadata
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const { page, limit } = parsePaginationParams(url);
    const skip = (page - 1) * limit;

    const auditBriefId = url.searchParams.get('auditBriefId');

    const where: Record<string, unknown> = { userId: user.userId };
    if (auditBriefId) {
      where.auditBriefId = auditBriefId;
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
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
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
    const user = await requireAuth();
    const body = await request.json();

    const parsed = createBookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(badRequest('Invalid bookmark data', parsed.error.flatten()));
    }

    const { auditBriefId, timestampSeconds, note } = parsed.data;

    const auditBrief = await prisma.auditBrief.findUnique({
      where: { id: auditBriefId },
      select: { id: true },
    });
    if (!auditBrief) {
      return createErrorResponse(badRequest('Audit brief not found'));
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId: user.userId,
        auditBriefId,
        timestampSeconds,
        note,
      },
    });

    return NextResponse.json({ data: bookmark }, { status: 201 });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
}
