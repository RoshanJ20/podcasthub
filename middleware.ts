/**
 * Next.js middleware for The Audit Brief authentication, authorization, and request tracing.
 *
 * Uses `jose` library for JWT verification (Edge runtime compatible).
 * `jsonwebtoken` does NOT work in Edge middleware — it requires Node.js crypto.
 *
 * Key responsibilities:
 * - Generates a unique correlation ID (x-request-id) for every request
 * - Stamps x-request-start for downstream duration calculation
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
  newAccessToken: string | null,
  requestId: string,
  requestStart: string
): NextResponse {
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return stampResponse(NextResponse.redirect(loginUrl), requestId);
  }
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return stampResponse(NextResponse.redirect(new URL('/unauthorized', request.url)), requestId);
  }
  return addUserHeaders(request, user, newAccessToken, requestId, requestStart);
}

/**
 * Handles authorization for API routes.
 *
 * Public GET endpoints (`/api/audit-briefs`, `/api/learning-graphs`, `/api/search`) are
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
  newAccessToken: string | null,
  requestId: string,
  requestStart: string
): NextResponse {
  const { pathname } = request.nextUrl;
  const isPublicApi =
    request.method === 'GET' &&
    (pathname.startsWith('/api/audit-briefs') ||
      pathname.startsWith('/api/learning-graphs') ||
      pathname.startsWith('/api/search'));

  if (isPublicApi) {
    if (user) return addUserHeaders(request, user, newAccessToken, requestId, requestStart);
    return passthrough(request, requestId, requestStart);
  }

  if (!user) {
    return stampResponse(
      NextResponse.json(
        { status: 401, error_code: 'UNAUTHORIZED', message: 'Unauthorized' },
        { status: 401 }
      ),
      requestId
    );
  }
  return addUserHeaders(request, user, newAccessToken, requestId, requestStart);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const requestStart = Date.now().toString();
  const { pathname } = request.nextUrl;

  // Health/readiness checks, auth routes, and media proxy are always accessible
  if (
    pathname === '/api/health' ||
    pathname === '/api/ready' ||
    pathname === '/api/media' ||
    isAuthRoute(pathname)
  ) {
    return passthrough(request, requestId, requestStart);
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';

  const { user, newAccessToken } = await resolveAuthenticatedUser(
    request,
    accessSecret,
    refreshSecret
  );

  if (isAdminRoute(pathname)) {
    return handleAdminRoute(request, user, newAccessToken, requestId, requestStart);
  }

  if (isApiRoute(pathname)) {
    return handleApiRoute(request, user, newAccessToken, requestId, requestStart);
  }

  // Public page routes
  if (isPublicRoute(pathname)) {
    if (user) return addUserHeaders(request, user, newAccessToken, requestId, requestStart);
    return passthrough(request, requestId, requestStart);
  }

  // All other routes: require auth
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return stampResponse(NextResponse.redirect(loginUrl), requestId);
  }

  return addUserHeaders(request, user, newAccessToken, requestId, requestStart);
}

/**
 * Creates a pass-through response with correlation headers on request and response.
 *
 * Used for unauthenticated paths (health checks, public routes) where user headers
 * are not needed but correlation tracking is still required.
 *
 * @param request - The incoming request whose headers will be cloned and extended.
 * @param requestId - The unique correlation ID for this request.
 * @param requestStart - Epoch milliseconds when the request entered middleware.
 * @returns A NextResponse with x-request-id and x-request-start on both request and response.
 */
function passthrough(request: NextRequest, requestId: string, requestStart: string): NextResponse {
  const headers = new Headers(request.headers);
  headers.set('x-request-id', requestId);
  headers.set('x-request-start', requestStart);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('x-request-id', requestId);
  return response;
}

/**
 * Stamps x-request-id on a response that doesn't forward request headers.
 *
 * Used for redirects and error JSON responses where request header forwarding
 * is not applicable but response correlation is still needed.
 *
 * @param response - The response to stamp.
 * @param requestId - The unique correlation ID for this request.
 * @returns The same response with x-request-id set.
 */
function stampResponse(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('x-request-id', requestId);
  return response;
}

/**
 * Builds a pass-through `NextResponse` that forwards user identity and correlation
 * headers as request headers.
 *
 * Sets `x-user-id`, `x-user-email`, `x-user-role`, `x-request-id`, and `x-request-start`
 * so that API route handlers and Server Components can read the authenticated user and
 * correlation context without re-verifying the JWT.
 * When a silent token refresh has occurred, the new access token is written back as an
 * HttpOnly cookie so the client receives the updated credential transparently.
 *
 * @param request - The incoming Next.js request whose headers will be cloned and extended.
 * @param user - The authenticated user whose identity will be injected into the headers.
 * @param refreshedAccessToken - A newly issued access token to persist as a cookie, or
 *   `null`/`undefined` when no refresh took place.
 * @param requestId - The unique correlation ID for this request.
 * @param requestStart - Epoch milliseconds when the request entered middleware.
 * @returns A `NextResponse` that continues the request with the enriched headers (and,
 *   if provided, the refreshed cookie).
 */
function addUserHeaders(
  request: NextRequest,
  user: UserPayload,
  refreshedAccessToken: string | null | undefined,
  requestId: string,
  requestStart: string
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.userId);
  requestHeaders.set('x-user-email', user.email);
  requestHeaders.set('x-user-role', user.role);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-request-start', requestStart);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('x-request-id', requestId);

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
