/**
 * User role management API route.
 *
 * @route PUT /api/users/[id]/role — Update a user's role (superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import {
  ApiError,
  createErrorResponse,
  badRequest,
  notFound,
  internalError,
} from '@/lib/api/errors';

const VALID_ROLES = ['public', 'admin', 'superadmin'];

/**
 * Handles PUT requests to update a user's role.
 *
 * Requires superadmin role. Validates that the role is one of 'public', 'admin',
 * or 'superadmin'. Prevents superadmins from changing their own role. Updates
 * the role field directly on the user record.
 *
 * @param request - The incoming Next.js request object with the new role in the body
 * @param params - Route parameters containing the target user ID
 * @returns JSON response with the updated user data (id, name, email, role)
 * @throws {ApiError} 400 if the role is invalid or the user attempts to change their own role
 * @throws {ApiError} 401 if the user is not authenticated
 * @throws {ApiError} 403 if the user does not have the superadmin role
 * @throws {ApiError} 404 if the target user is not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const user = await requireAuth();
    requireRole(user, ['superadmin']);

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

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, displayName: true, email: true },
    });

    if (!targetUser) {
      return createErrorResponse(notFound('User'));
    }

    await prisma.user.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json({
      data: {
        id: targetUser.id,
        name: targetUser.displayName,
        email: targetUser.email,
        role,
      },
    });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    return createErrorResponse(internalError(), requestId);
  }
}
