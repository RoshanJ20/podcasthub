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

interface UserPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verifies a JWT using the jose library (Edge-compatible).
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
 * Signs a new access token using jose (Edge-compatible).
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

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Health check and auth routes are always accessible
  if (pathname === '/api/health' || isAuthRoute(pathname)) {
    return NextResponse.next();
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';

  // Try access token first
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

  // Admin routes: require admin or superadmin role
  if (isAdminRoute(pathname)) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    return addUserHeaders(request, user, newAccessToken);
  }

  // API routes: public GETs allowed, writes require auth
  if (isApiRoute(pathname)) {
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
