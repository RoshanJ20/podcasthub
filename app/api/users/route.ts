/**
 * User management API route.
 *
 * @route GET /api/users — List users with roles (superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { ApiError, createErrorResponse, internalError } from '@/lib/api/errors';
import { parsePaginationParams } from '@/lib/api/pagination';

/**
 * Handles GET requests to list users with their roles.
 *
 * Requires superadmin role. Supports pagination via page/limit query parameters
 * and optional text search across displayName and email fields.
 *
 * @param request - The incoming Next.js request object with optional search and pagination params
 * @returns JSON response with user data (id, name, email, role, createdAt), total count, and pagination info
 * @throws {ApiError} 401 if the user is not authenticated
 * @throws {ApiError} 403 if the user does not have the superadmin role
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    requireRole(user, ['superadmin']);

    const url = new URL(request.url);
    const { page, limit } = parsePaginationParams(url);
    const skip = (page - 1) * limit;
    const search = url.searchParams.get('search');

    const where = search
      ? {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      name: u.displayName,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    return createErrorResponse(internalError(), requestId);
  }
}
