/**
 * Next.js middleware for Podcast Hub v2 authentication and authorization.
 *
 * Key responsibilities:
 * - Protects admin routes by verifying JWT and checking admin/superadmin role
 * - Protects API routes by verifying JWT and returning 401 JSON on failure
 * - Protects page routes by verifying JWT and redirecting to /login on failure
 * - Allows public routes without authentication but attaches user info if available
 *
 * Dependencies:
 * - next/server (NextResponse, NextRequest)
 * - @/lib/auth/jwt (verifyAccessToken)
 * - @/lib/auth/middleware-helpers (route classifiers)
 * - @/lib/auth/cookies (ACCESS_TOKEN_COOKIE)
 *
 * @route Runs on all routes except static files, _next, and favicon.ico
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  isPublicRoute,
  isAuthRoute,
  isAdminRoute,
  isApiRoute,
} from '@/lib/auth/middleware-helpers';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';

/**
 * Next.js middleware that enforces authentication and authorization.
 *
 * Route handling priority:
 * 1. Health check (/api/health) — always allowed
 * 2. Auth API routes (/api/auth/*) — always allowed
 * 3. Admin routes (/admin/*) — requires valid JWT with admin or superadmin role
 * 4. Protected API routes (/api/*) — requires valid JWT, returns 401 JSON if invalid
 * 5. Public routes (/, /login, /bulletins, etc.) — allowed, attaches user info if present
 * 6. All other routes — requires valid JWT, redirects to /login if invalid
 *
 * @param request - The incoming Next.js request object.
 * @returns A NextResponse — either a redirect, a 401 JSON, or the request with user headers.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Health check is always accessible
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // Auth API routes are always accessible (login, register, refresh, logout)
  if (isAuthRoute(pathname)) {
    return NextResponse.next();
  }

  // Attempt to extract and verify the JWT from the access_token cookie
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  let user: { userId: string; email: string; role: string } | null = null;

  if (token) {
    try {
      user = verifyAccessToken(token);
    } catch {
      // Token is invalid or expired — user remains null
    }
  }

  // Admin routes: require admin or superadmin role
  if (isAdminRoute(pathname)) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      const unauthorizedUrl = new URL('/unauthorized', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    // Attach user info to request headers for downstream use
    return addUserHeaders(request, user);
  }

  // Protected API routes: return 401 JSON if no valid token
  if (isApiRoute(pathname)) {
    if (!user) {
      return NextResponse.json(
        {
          status: 401,
          error_code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    return addUserHeaders(request, user);
  }

  // Public routes: allow access, attach user info if available
  if (isPublicRoute(pathname)) {
    if (user) {
      return addUserHeaders(request, user);
    }
    return NextResponse.next();
  }

  // All other routes (protected pages): redirect to login if no valid token
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return addUserHeaders(request, user);
}

/**
 * Attaches authenticated user information to request headers.
 *
 * Sets x-user-id, x-user-email, and x-user-role headers so that
 * downstream API route handlers and server components can access
 * the current user without re-verifying the JWT.
 *
 * @param request - The incoming Next.js request.
 * @param user - The verified JWT payload containing user info.
 * @returns A NextResponse with user information headers attached.
 */
function addUserHeaders(
  request: NextRequest,
  user: { userId: string; email: string; role: string }
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.userId);
  requestHeaders.set('x-user-email', user.email);
  requestHeaders.set('x-user-role', user.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Next.js middleware matcher configuration.
 *
 * Excludes static files, Next.js internals, and common image formats
 * from middleware processing to avoid unnecessary JWT verification overhead.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
