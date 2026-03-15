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
