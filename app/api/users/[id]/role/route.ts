/**
 * User role management API route.
 *
 * @route PUT /api/users/[id]/role — Update a user's role (superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';
import {
  ApiError,
  createErrorResponse,
  badRequest,
  notFound,
  internalError,
} from '@/lib/api/errors';

const VALID_ROLES = ['public', 'admin', 'superadmin'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const user = requireAuth(request);
    requireRole(user, ['superadmin']);

    // Prevent changing own role
    if (user.userId === id) {
      return createErrorResponse(badRequest('Cannot change your own role'));
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return createErrorResponse(
        badRequest(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`)
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, displayName: true, email: true },
    });

    if (!targetUser) {
      return createErrorResponse(notFound('User'));
    }

    // Upsert user role
    await prisma.userRole.upsert({
      where: { userId: id },
      update: { role },
      create: { userId: id, role },
    });

    return NextResponse.json({
      id: targetUser.id,
      name: targetUser.displayName,
      email: targetUser.email,
      role,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
