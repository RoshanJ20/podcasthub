/**
 * User registration API endpoint for The Audit Brief.
 *
 * Key responsibilities:
 * - Validates registration input using Zod schema
 * - Checks for duplicate email addresses
 * - Creates user with hashed password and default 'public' role
 * - Returns created user data (excluding password hash)
 * - Client handles sign-in via NextAuth after registration
 *
 * Dependencies:
 * - next/server (NextResponse)
 * - @/lib/schemas/user (registerSchema)
 * - @/lib/auth/password (hashPassword)
 * - @/lib/db (prisma)
 * - @/lib/api/errors (badRequest, validationFailed, createErrorResponse)
 *
 * @route POST /api/auth/register
 * @body { email: string, password: string, displayName?: string }
 * @returns { user: { id, email, displayName, role, createdAt } }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { registerSchema } from '@/lib/schemas/user';
import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db';
import { badRequest, validationFailed, createErrorResponse } from '@/lib/api/errors';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';

/**
 * Handles user registration.
 *
 * Validates input, checks for duplicate emails, creates the user with a
 * default 'public' role and hashed password. The client is responsible for
 * signing in via NextAuth after a successful registration.
 *
 * @param request - The incoming POST request with registration data.
 * @returns JSON response with user data, or an error response.
 */
export const POST = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  const body: unknown = await request.json();

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse(validationFailed(parsed.error.issues));
  }

  const { email, password, displayName } = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return createErrorResponse(badRequest('A user with this email already exists'));
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName ?? null,
      role: 'public',
    },
  });

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
    { status: 201 }
  );
});
