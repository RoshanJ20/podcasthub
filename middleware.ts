/**
 * Next.js middleware for Podcast Hub v2 authentication and authorization.
 *
 * Uses `jose` library for JWT verification (Edge runtime compatible).
 * `jsonwebtoken` does NOT work in Edge middleware — it requires Node.js crypto.
 *
 * Key responsibilities:
 * - Protects admin routes (requires admin/superadmin role)
 * - Protects write API routes (requires valid JWT)
 * - Allows public GET API routes without auth
 * - Auto-refreshes expired access tokens using refresh tokens
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import {
  isPublicRoute,
  isAuthRoute,
  isAdminRoute,
  isApiRoute,
} from '@/lib/auth/middleware-helpers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies';

/**
 * Represents the decoded JWT payload for an authenticated user.
 * Carried through middleware to propagate identity to downstream request handlers via headers.
 */
interface UserPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verifies a JWT using the jose library (Edge-compatible).
 *
 * @param token - The raw JWT string to verify.
 * @param secret - The HMAC secret used to sign the token.
 * @returns The decoded {@link UserPayload} on success, or `null` if the token is invalid or expired.
 */
async function verifyToken(token: string, secret: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/**
 * Signs a new short-lived access token using jose (Edge-compatible).
 *
 * Reads the expiry duration from `JWT_ACCESS_EXPIRY` (e.g. `"15m"`, `"1h"`, `"1d"`).
 * Falls back to `"15m"` when the variable is absent or unparseable.
 *
 * @param payload - The {@link UserPayload} to embed in the token claims.
 * @param secret - The HMAC secret to sign the token with.
 * @returns A signed JWT string.
 * @throws Never — signing errors propagate to the caller (middleware) which will handle them.
 */
async function signNewAccessToken(payload: UserPayload, secret: string): Promise<string> {
  const expiry = process.env.JWT_ACCESS_EXPIRY || '15m';
  // Parse expiry string to seconds
  const match = expiry.match(/^(\d+)(m|h|d)$/);
  let expiresIn = '15m';
  if (match) {
    const [, num, unit] = match;
    const seconds = unit === 'm' ? +num * 60 : unit === 'h' ? +num * 3600 : +num * 86400;
    expiresIn = `${seconds}s`;
  }

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

/**
 * Resolves the authenticated user from the request cookies.
 *
 * Tries the access token first. If it is absent or expired, attempts a silent refresh
 * using the refresh token and issues a new access token.
 *
 * @param request - The incoming Next.js request.
 * @param accessSecret - The HMAC secret used for access tokens.
 * @param refreshSecret - The HMAC secret used for refresh tokens.
 * @returns An object containing the resolved `user` payload (or `null`) and a
 *   `newAccessToken` string (or `null`) when a silent refresh occurred.
 */
async function resolveAuthenticatedUser(
  request: NextRequest,
  accessSecret: string,
  refreshSecret: string
): Promise<{ user: UserPayload | null; newAccessToken: string | null }> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  let user: UserPayload | null = null;
  let newAccessToken: string | null = null;

  if (accessToken) {
    user = await verifyToken(accessToken, accessSecret);
  }

  // If access token invalid/expired, try refresh
  if (!user && refreshToken) {
    const refreshPayload = await verifyToken(refreshToken, refreshSecret);
    if (refreshPayload) {
      user = refreshPayload;
      newAccessToken = await signNewAccessToken(refreshPayload, accessSecret);
    }
  }

  return { user, newAccessToken };
}

/**
 * Handles authorization for admin routes.
 *
 * Redirects unauthenticated visitors to `/login` and visitors without an admin
 * role to `/unauthorized`. Passes through admins with enriched headers.
 *
 * @param request - The incoming Next.js request.
 * @param user - The resolved user payload, or `null` if unauthenticated.
 * @param newAccessToken - A refreshed access token to set on the response, if any.
 * @returns A `NextResponse` redirect or a header-enriched pass-through response.
 */
function handleAdminRoute(
  request: NextRequest,
  user: UserPayload | null,
  newAccessToken: string | null
): NextResponse {
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  return addUserHeaders(request, user, newAccessToken);
}

/**
 * Handles authorization for API routes.
 *
 * Public GET endpoints (`/api/podcasts`, `/api/learning-graphs`, `/api/search`) are
 * accessible without authentication. All other API calls require a valid JWT.
 *
 * @param request - The incoming Next.js request.
 * @param user - The resolved user payload, or `null` if unauthenticated.
 * @param newAccessToken - A refreshed access token to set on the response, if any.
 * @returns A `NextResponse` with appropriate status or enriched headers.
 */
function handleApiRoute(
  request: NextRequest,
  user: UserPayload | null,
  newAccessToken: string | null
): NextResponse {
  const { pathname } = request.nextUrl;
  const isPublicApi =
    request.method === 'GET' &&
    (pathname.startsWith('/api/podcasts') ||
      pathname.startsWith('/api/learning-graphs') ||
      pathname.startsWith('/api/search'));

  if (isPublicApi) {
    if (user) return addUserHeaders(request, user, newAccessToken);
    return NextResponse.next();
  }

  if (!user) {
    return NextResponse.json(
      { status: 401, error_code: 'UNAUTHORIZED', message: 'Unauthorized' },
      { status: 401 }
    );
  }
  return addUserHeaders(request, user, newAccessToken);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Health check, auth routes, and media proxy are always accessible
  if (pathname === '/api/health' || pathname === '/api/media' || isAuthRoute(pathname)) {
    return NextResponse.next();
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';

  const { user, newAccessToken } = await resolveAuthenticatedUser(
    request,
    accessSecret,
    refreshSecret
  );

  if (isAdminRoute(pathname)) return handleAdminRoute(request, user, newAccessToken);

  if (isApiRoute(pathname)) return handleApiRoute(request, user, newAccessToken);

  // Public page routes
  if (isPublicRoute(pathname)) {
    if (user) return addUserHeaders(request, user, newAccessToken);
    return NextResponse.next();
  }

  // All other routes: require auth
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return addUserHeaders(request, user, newAccessToken);
}

/**
 * Builds a pass-through `NextResponse` that forwards user identity as request headers.
 *
 * Sets `x-user-id`, `x-user-email`, and `x-user-role` so that API route handlers and
 * Server Components can read the authenticated user without re-verifying the JWT.
 * When a silent token refresh has occurred, the new access token is written back as an
 * HttpOnly cookie so the client receives the updated credential transparently.
 *
 * @param request - The incoming Next.js request whose headers will be cloned and extended.
 * @param user - The authenticated user whose identity will be injected into the headers.
 * @param refreshedAccessToken - A newly issued access token to persist as a cookie, or
 *   `null`/`undefined` when no refresh took place.
 * @returns A `NextResponse` that continues the request with the enriched headers (and,
 *   if provided, the refreshed cookie).
 */
function addUserHeaders(
  request: NextRequest,
  user: UserPayload,
  refreshedAccessToken?: string | null
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.userId);
  requestHeaders.set('x-user-email', user.email);
  requestHeaders.set('x-user-role', user.role);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (refreshedAccessToken) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, refreshedAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
