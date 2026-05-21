/**
 * Bookmark API routes — update and delete a specific bookmark.
 *
 * - PUT: Update bookmark note. User must own the bookmark.
 * - DELETE: Delete a bookmark. User must own the bookmark.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session-helpers';
import {
  ApiError,
  createErrorResponse,
  internalError,
  notFound,
  forbidden,
  badRequest,
} from '@/lib/api/errors';
import { updateBookmarkSchema } from '@/lib/schemas/bookmark';
import { trackActivity } from '@/lib/analytics/track-activity';

/**
 * Handles PUT requests to update an existing bookmark's note.
 *
 * Verifies the bookmark exists and belongs to the authenticated user before
 * applying the update. Validates the request body against updateBookmarkSchema.
 *
 * @param request - The incoming Next.js request object with update data in the body
 * @param params - Route parameters containing the bookmark ID
 * @returns JSON response with the updated bookmark
 * @throws {ApiError} 400 if the update data fails schema validation
 * @throws {ApiError} 401 if the user is not authenticated
 * @throws {ApiError} 403 if the user does not own the bookmark
 * @throws {ApiError} 404 if the bookmark is not found
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const bookmark = await prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark) {
      return createErrorResponse(notFound('Bookmark'));
    }
    if (bookmark.userId !== user.userId) {
      return createErrorResponse(forbidden('You do not own this bookmark'));
    }

    const body = await request.json();
    const parsed = updateBookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(badRequest('Invalid update data', parsed.error.flatten()));
    }

    const updated = await prisma.bookmark.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
}

/**
 * Handles DELETE requests to remove a bookmark.
 *
 * Verifies the bookmark exists and belongs to the authenticated user before
 * deleting it.
 *
 * @param request - The incoming Next.js request object
 * @param params - Route parameters containing the bookmark ID
 * @returns JSON response with a confirmation message
 * @throws {ApiError} 401 if the user is not authenticated
 * @throws {ApiError} 403 if the user does not own the bookmark
 * @throws {ApiError} 404 if the bookmark is not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const bookmark = await prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark) {
      return createErrorResponse(notFound('Bookmark'));
    }
    if (bookmark.userId !== user.userId) {
      return createErrorResponse(forbidden('You do not own this bookmark'));
    }

    await prisma.bookmark.delete({ where: { id } });

    await trackActivity({
      userId: user.userId,
      activityType: 'unbookmark',
      auditBriefId: bookmark.auditBriefId,
      episodeId: bookmark.episodeId,
      metadata: {
        bookmarkId: id,
        timestampSeconds: bookmark.timestampSeconds,
      },
    });

    return NextResponse.json({ message: 'Bookmark deleted' });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
}
