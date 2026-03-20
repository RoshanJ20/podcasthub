/**
 * Logout API endpoint for The Audit Brief.
 *
 * Key responsibilities:
 * - Clears access_token and refresh_token HttpOnly cookies
 * - Returns a success response confirming the logout
 *
 * Dependencies:
 * - next/server (NextResponse)
 * - @/lib/auth/cookies (clearAuthCookies)
 *
 * @route POST /api/auth/logout
 * @returns { message: 'Logged out successfully' }
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/cookies';

/**
 * Handles user logout by clearing authentication cookies.
 *
 * Clears both the access_token and refresh_token cookies, effectively
 * ending the user's session on the client side.
 *
 * @returns JSON response confirming logout with cleared auth cookies.
 */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({
    message: 'Logged out successfully',
  });

  clearAuthCookies(response);

  return response;
}
