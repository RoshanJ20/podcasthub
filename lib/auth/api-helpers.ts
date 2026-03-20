/**
 * API route authentication helpers for The Audit Brief.
 *
 * Key responsibilities:
 * - Extracts and verifies JWT from request cookies or headers
 * - Provides role-based authorization checks for API routes
 *
 * @example
 * import { getAuthUser, requireAuth, requireRole } from '@/lib/auth/api-helpers';
 *
 * export async function POST(request: NextRequest) {
 *   const user = requireAuth(request); // throws 401 if not authenticated
 *   requireRole(user, ['admin', 'superadmin']); // throws 403 if wrong role
 *   // ... handle request
 * }
 */
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import type { JwtPayload } from '@/lib/auth/jwt';
import { ApiError, ErrorCode } from '@/lib/api/errors';

/**
 * Extracts and verifies the JWT from request cookies or x-user headers.
 *
 * @param request - The incoming Next.js request
 * @returns The decoded JWT payload, or null if not authenticated
 */
export function getAuthUser(request: NextRequest): JwtPayload | null {
  // First try the x-user headers set by middleware
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');

  if (userId && email && role) {
    return { userId, email, role };
  }

  // Fallback: try cookie directly
  const token = request.cookies.get('access_token')?.value;
  if (!token) return null;

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Requires authentication. Throws ApiError(401) if not authenticated.
 *
 * @param request - The incoming Next.js request
 * @returns The decoded JWT payload
 * @throws ApiError with status 401 if not authenticated
 */
export function requireAuth(request: NextRequest): JwtPayload {
  const user = getAuthUser(request);
  if (!user) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
  }
  return user;
}

/**
 * Requires specific role(s). Throws ApiError(403) if role doesn't match.
 *
 * @param user - The authenticated user's JWT payload
 * @param allowedRoles - Array of role strings that are permitted
 * @throws ApiError with status 403 if user's role is not in allowedRoles
 */
export function requireRole(user: JwtPayload, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
  }
}
