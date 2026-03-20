/**
 * Token refresh API endpoint for The Audit Brief.
 *
 * Key responsibilities:
 * - Reads the refresh_token cookie
 * - Verifies the refresh token and looks up the user
 * - Performs token rotation by issuing new access and refresh tokens
 * - Sets new HttpOnly cookies with rotated tokens
 *
 * Dependencies:
 * - next/server (NextResponse)
 * - @/lib/auth/jwt (verifyRefreshToken, signAccessToken, signRefreshToken)
 * - @/lib/auth/cookies (REFRESH_TOKEN_COOKIE, setAuthCookies)
 * - @/lib/db (prisma)
 * - @/lib/api/errors (unauthorized, internalError, createErrorResponse)
 *
 * @route POST /api/auth/refresh
 * @returns { user: { id, email, displayName, role, createdAt } }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { REFRESH_TOKEN_COOKIE, setAuthCookies } from '@/lib/auth/cookies';
import { prisma } from '@/lib/db';
import { unauthorized, internalError, createErrorResponse } from '@/lib/api/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth-refresh');

/**
 * Handles JWT token rotation via refresh token.
 *
 * Verifies the existing refresh token, confirms the user still exists
 * in the database, then issues new access and refresh tokens (rotation)
 * to mitigate token theft risks.
 *
 * @param request - The incoming POST request with refresh_token cookie.
 * @returns JSON response with user data and new auth cookies, or an error response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Read refresh token from cookie
    const refreshTokenValue = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshTokenValue) {
      return createErrorResponse(unauthorized('No refresh token provided'));
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenValue);
    } catch {
      return createErrorResponse(unauthorized('Invalid or expired refresh token'));
    }

    // Confirm user still exists in the database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user) {
      return createErrorResponse(unauthorized('User no longer exists'));
    }

    const userRole = user.role?.role ?? 'public';

    // Sign new tokens (token rotation)
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: userRole,
    };

    const newAccessToken = signAccessToken(jwtPayload);
    const newRefreshToken = signRefreshToken(jwtPayload);

    // Build response with user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: userRole,
        createdAt: user.createdAt,
      },
    });

    // Set new HttpOnly cookies (completes token rotation)
    setAuthCookies(response, newAccessToken, newRefreshToken);

    return response;
  } catch (error) {
    log.error({ error }, 'Token refresh failed');
    return createErrorResponse(internalError());
  }
}
