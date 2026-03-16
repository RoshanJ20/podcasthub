/**
 * Bookmark API routes — update and delete a specific bookmark.
 *
 * - PUT: Update bookmark note. User must own the bookmark.
 * - DELETE: Delete a bookmark. User must own the bookmark.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import {
  ApiError,
  createErrorResponse,
  internalError,
  notFound,
  forbidden,
  badRequest,
} from '@/lib/api/errors';
import { updateBookmarkSchema } from '@/lib/schemas/bookmark';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(request);
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
      return createErrorResponse(
        badRequest('Invalid update data', parsed.error.flatten())
      );
    }

    const updated = await prisma.bookmark.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    const { id } = await params;

    const bookmark = await prisma.bookmark.findUnique({ where: { id } });
    if (!bookmark) {
      return createErrorResponse(notFound('Bookmark'));
    }
    if (bookmark.userId !== user.userId) {
      return createErrorResponse(forbidden('You do not own this bookmark'));
    }

    await prisma.bookmark.delete({ where: { id } });

    return NextResponse.json({ message: 'Bookmark deleted' });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}
