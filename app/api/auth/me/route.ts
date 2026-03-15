/**
 * Current user info API endpoint for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Reads the access_token cookie
 * - Verifies the JWT and returns the decoded user payload
 * - Returns 401 if no valid token is present
 *
 * Dependencies:
 * - next/server (NextResponse)
 * - @/lib/auth/jwt (verifyAccessToken)
 * - @/lib/auth/cookies (ACCESS_TOKEN_COOKIE)
 * - @/lib/api/errors (unauthorized, createErrorResponse)
 *
 * @route GET /api/auth/me
 * @returns { user: { userId, email, role } }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { unauthorized, createErrorResponse } from '@/lib/api/errors';

/**
 * Returns the current authenticated user's information from the JWT.
 *
 * Reads the access_token cookie, verifies it, and returns the decoded
 * payload. Does not query the database — returns only what is in the token.
 *
 * @param request - The incoming GET request with access_token cookie.
 * @returns JSON response with user payload, or 401 if unauthenticated.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return createErrorResponse(unauthorized());
  }

  try {
    const payload = verifyAccessToken(token);

    return NextResponse.json({
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch {
    return createErrorResponse(unauthorized('Invalid or expired token'));
  }
}
