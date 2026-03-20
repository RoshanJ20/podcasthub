/**
 * Batch operations for auditBriefs.
 *
 * @route PATCH /api/audit-briefs/batch — Batch update sort orders (admin/superadmin)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import { batchUpdateSortOrderSchema } from '@/lib/schemas/audit-brief';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

/**
 * Batch updates audit brief sort orders within a transaction.
 *
 * Requires authentication with admin or superadmin role.
 * Expects a JSON array of { id: string, sortOrder: number } objects.
 * All updates are applied atomically using a Prisma transaction.
 *
 * @param request - The incoming Next.js request with sort order updates in the body
 * @returns JSON response confirming the batch update
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const body = await request.json();
    const result = batchUpdateSortOrderSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const updates = result.data.map((item) =>
      prisma.auditBrief.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ message: 'Sort orders updated successfully' });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
