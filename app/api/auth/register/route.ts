/**
 * User registration API endpoint for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Validates registration input using Zod schema
 * - Checks for duplicate email addresses
 * - Creates user and associated UserRole records in a single transaction
 * - Signs and sets JWT access and refresh token cookies
 * - Returns created user data (excluding password hash)
 *
 * Dependencies:
 * - next/server (NextResponse)
 * - @/lib/schemas/user (registerSchema)
 * - @/lib/auth/password (hashPassword)
 * - @/lib/auth/jwt (signAccessToken, signRefreshToken)
 * - @/lib/auth/cookies (setAuthCookies)
 * - @/lib/db (prisma)
 * - @/lib/api/errors (badRequest, validationFailed, internalError, createErrorResponse)
 *
 * @route POST /api/auth/register
 * @body { email: string, password: string, displayName?: string }
 * @returns { user: { id, email, displayName, role, createdAt } }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { registerSchema } from '@/lib/schemas/user';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/cookies';
import { prisma } from '@/lib/db';
import { badRequest, validationFailed, internalError, createErrorResponse } from '@/lib/api/errors';

/**
 * Handles user registration.
 *
 * Validates input, checks for duplicate emails, creates the user with a
 * default 'public' role, signs JWT tokens, and sets HttpOnly cookies.
 *
 * @param request - The incoming POST request with registration data.
 * @returns JSON response with user data and auth cookies, or an error response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    // Validate request body against registration schema
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(validationFailed(parsed.error.issues));
    }

    const { email, password, displayName } = parsed.data;

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createErrorResponse(badRequest('A user with this email already exists'));
    }

    // Hash the password and create user + role in a transaction
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName ?? null,
        role: {
          create: {
            role: 'public',
          },
        },
      },
      include: {
        role: true,
      },
    });

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
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: userRole,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );

    // Set HttpOnly auth cookies
    setAuthCookies(response, accessToken, refreshToken);

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return createErrorResponse(internalError());
  }
}
