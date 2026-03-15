/**
 * Auth cookie management utilities for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Sets HttpOnly JWT cookies (access and refresh tokens) on NextResponse objects
 * - Clears auth cookies on logout
 * - Centralizes cookie configuration (httpOnly, secure, sameSite, path)
 *
 * Dependencies:
 * - next/server (NextResponse)
 *
 * @example
 * import { setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';
 *
 * const response = NextResponse.json({ user });
 * setAuthCookies(response, accessToken, refreshToken);
 */
import type { NextResponse } from 'next/server';

/** Cookie name for the JWT access token. */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/** Cookie name for the JWT refresh token. */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** Access token max age in seconds (15 minutes). */
const ACCESS_TOKEN_MAX_AGE = 15 * 60;

/** Refresh token max age in seconds (7 days). */
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Sets HttpOnly access and refresh token cookies on a NextResponse.
 *
 * Both cookies are configured with httpOnly, sameSite=lax, and path=/.
 * The secure flag is enabled in production environments.
 *
 * @param response - The NextResponse to attach cookies to.
 * @param accessToken - The signed JWT access token string.
 * @param refreshToken - The signed JWT refresh token string.
 * @returns The same response object with cookies set (for chaining).
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return response;
}

/**
 * Clears access and refresh token cookies from a NextResponse.
 *
 * Sets both cookies to empty values with maxAge=0 to instruct the browser
 * to remove them immediately.
 *
 * @param response - The NextResponse to clear cookies from.
 * @returns The same response object with cookies cleared (for chaining).
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
