/**
 * User login API endpoint for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Validates login input using Zod schema
 * - Authenticates user by verifying email and password
 * - Signs and sets JWT access and refresh token cookies
 * - Returns authenticated user data (excluding password hash)
 *
 * Dependencies:
 * - next/server (NextResponse)
 * - @/lib/schemas/user (loginSchema)
 * - @/lib/auth/password (verifyPassword)
 * - @/lib/auth/jwt (signAccessToken, signRefreshToken)
 * - @/lib/auth/cookies (setAuthCookies)
 * - @/lib/db (prisma)
 * - @/lib/api/errors (unauthorized, validationFailed, internalError, createErrorResponse)
 *
 * @route POST /api/auth/login
 * @body { email: string, password: string }
 * @returns { user: { id, email, displayName, role, createdAt } }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { loginSchema } from '@/lib/schemas/user';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/cookies';
import { prisma } from '@/lib/db';
import {
  unauthorized,
  validationFailed,
  internalError,
  createErrorResponse,
} from '@/lib/api/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth-login');

/**
 * Handles user login authentication.
 *
 * Validates credentials, verifies the password against the stored hash,
 * signs JWT tokens, and sets HttpOnly cookies on successful authentication.
 *
 * @param request - The incoming POST request with login credentials.
 * @returns JSON response with user data and auth cookies, or an error response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    // Validate request body against login schema
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(validationFailed(parsed.error.issues));
    }

    const { email, password } = parsed.data;

    // Find user by email, including their role
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      // Use generic message to prevent email enumeration
      return createErrorResponse(unauthorized('Invalid email or password'));
    }

    // Verify password against stored hash
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return createErrorResponse(unauthorized('Invalid email or password'));
    }

    const userRole = user.role?.role ?? 'public';

    // Sign JWT tokens
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: userRole,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    // Build response with user data (no password hash)
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: userRole,
        createdAt: user.createdAt,
      },
    });

    // Set HttpOnly auth cookies
    setAuthCookies(response, accessToken, refreshToken);

    return response;
  } catch (error) {
    log.error({ error }, 'Login failed');
    return createErrorResponse(internalError());
  }
}
