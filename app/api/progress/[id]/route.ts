/**
 * Progress API route — delete (unmark) episode completion.
 *
 * - DELETE: Unmark episode completion. User must own the progress record.
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
} from '@/lib/api/errors';

/**
 * Handles DELETE requests to unmark an episode completion.
 *
 * Verifies the progress record exists and belongs to the authenticated user
 * before deleting it.
 *
 * @param request - The incoming Next.js request object
 * @param params - Route parameters containing the progress record ID
 * @returns JSON response with a confirmation message
 * @throws {ApiError} 401 if the user is not authenticated
 * @throws {ApiError} 403 if the user does not own the progress record
 * @throws {ApiError} 404 if the progress record is not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    const { id } = await params;

    const progress = await prisma.userProgress.findUnique({ where: { id } });
    if (!progress) {
      return createErrorResponse(notFound('Progress record'));
    }
    if (progress.userId !== user.userId) {
      return createErrorResponse(forbidden('You do not own this progress record'));
    }

    await prisma.userProgress.delete({ where: { id } });

    return NextResponse.json({ message: 'Progress record deleted' });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}
