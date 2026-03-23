/**
 * Single audit brief API routes for retrieval, update, and deletion.
 *
 * @route GET    /api/audit-briefs/[id] — Get a single audit brief with transcripts
 * @route PUT    /api/audit-briefs/[id] — Update an audit brief (admin/superadmin)
 * @route DELETE /api/audit-briefs/[id] — Soft delete an audit brief (superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  ApiError,
  createErrorResponse,
  notFound,
  badRequest,
  internalError,
} from '@/lib/api/errors';
import { updateAuditBriefSchema } from '@/lib/schemas/audit-brief';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import type { Prisma } from '@prisma/client';

/** Route context providing the audit brief ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Retrieves a single non-archived audit brief by ID, including its transcripts.
 *
 * @param _request - The incoming Next.js request (unused)
 * @param context - Route context containing the audit brief ID
 * @returns JSON response with the audit brief data or 404 if not found
 */
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const auditBrief = await prisma.auditBrief.findFirst({
      where: { id, isArchived: false },
      include: { transcripts: true },
    });

    if (!auditBrief) {
      return createErrorResponse(notFound('AuditBrief'));
    }

    return NextResponse.json({ data: auditBrief });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Updates an existing audit brief by ID.
 *
 * Requires authentication with admin or superadmin role.
 * Validates the request body against updateAuditBriefSchema (partial, at least one field).
 *
 * @param request - The incoming Next.js request with update data in the body
 * @param context - Route context containing the audit brief ID
 * @returns JSON response with the updated audit brief
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;
    const body = await request.json();
    const result = updateAuditBriefSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const { bulletinUrls, tags, ...rest } = result.data;
    const updateData: Prisma.AuditBriefUncheckedUpdateInput = {
      ...rest,
      ...(tags !== undefined && { tags }),
      ...(bulletinUrls !== undefined && { bulletinUrls: bulletinUrls ?? [] }),
    };
    const auditBrief = await prisma.auditBrief.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: auditBrief });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Soft deletes an audit brief by setting isArchived to true.
 *
 * Requires authentication with superadmin role.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the audit brief ID
 * @returns JSON response confirming the deletion
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['superadmin']);

    const { id } = await context.params;

    await prisma.auditBrief.update({
      where: { id },
      data: { isArchived: true },
    });

    return NextResponse.json({ message: 'Audit brief archived successfully' });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
