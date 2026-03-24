/**
 * Session-based authentication helpers for The Audit Brief API routes.
 *
 * Key responsibilities:
 * - Provides requireAuth() and requireRole() using NextAuth's getServerSession
 * - Maintains the same throw-based pattern as the original api-helpers.ts
 * - Returns a consistent AuthUser shape for downstream consumers
 *
 * Dependencies:
 * - next-auth (getServerSession)
 * - @/lib/auth/next-auth-options (authOptions)
 * - @/lib/api/errors (ApiError, ErrorCode)
 *
 * @example
 * import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
 *
 * export async function POST(request: NextRequest) {
 *   const user = await requireAuth();
 *   requireRole(user, ['admin', 'superadmin']);
 *   // ... handle request
 * }
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/next-auth-options';
import { ApiError, ErrorCode } from '@/lib/api/errors';

/**
 * Authenticated user shape returned by requireAuth().
 * Mirrors the fields previously available from JwtPayload.
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Returns the current session, or null if not authenticated.
 *
 * @returns The NextAuth session or null.
 */
export async function getAuthSession() {
  return getServerSession(authOptions);
}

/**
 * Requires authentication. Throws ApiError(401) if no valid session exists.
 *
 * @returns The authenticated user's identity (userId, email, role).
 * @throws {ApiError} 401 if the user is not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Authentication required');
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
  };
}

/**
 * Requires specific role(s). Throws ApiError(403) if role doesn't match.
 *
 * @param user - The authenticated user (from requireAuth).
 * @param allowedRoles - Array of role strings that are permitted.
 * @throws {ApiError} 403 if the user's role is not in allowedRoles.
 */
export function requireRole(user: AuthUser, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
  }
}
