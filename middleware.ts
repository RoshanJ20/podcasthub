/**
 * Next.js middleware for The Audit Brief authentication and request tracing.
 *
 * Uses NextAuth v4's withAuth wrapper for JWT-based route protection.
 *
 * Key responsibilities:
 * - Generates a unique correlation ID (x-request-id) for every request
 * - Stamps x-request-start for downstream duration calculation
 * - Protects admin routes (requires admin/superadmin role)
 * - Protects write API routes (requires valid session)
 * - Allows public GET API routes without auth
 * - Injects x-user-id, x-user-email, x-user-role headers from the NextAuth token
 *
 * Dependencies:
 * - next-auth/middleware (withAuth)
 */
import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import type { NextRequestWithAuth } from 'next-auth/middleware';

/**
 * Checks whether the pathname is a public page route that does not require authentication.
 *
 * @param pathname - The URL pathname to check.
 * @returns True if the route is public (login, register, unauthorized).
 */
function isPublicPageRoute(pathname: string): boolean {
  return pathname === '/login' || pathname === '/register' || pathname === '/unauthorized';
}

/**
 * Checks whether the pathname is an admin route requiring elevated roles.
 *
 * @param pathname - The URL pathname to check.
 * @returns True if the route is under /admin.
 */
function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * Checks whether the pathname is a public GET API endpoint.
 *
 * @param pathname - The URL pathname to check.
 * @param method - The HTTP method of the request.
 * @returns True if the endpoint is a publicly accessible GET API.
 */
function isPublicGetApi(pathname: string, method: string): boolean {
  return (
    method === 'GET' &&
    (pathname.startsWith('/api/audit-briefs') ||
      pathname.startsWith('/api/learning-graphs') ||
      pathname.startsWith('/api/search'))
  );
}

/**
 * Main middleware function wrapped by NextAuth's withAuth.
 * Handles correlation ID injection, user header propagation, and admin role checks.
 */
export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const requestId = crypto.randomUUID();
    const requestStart = Date.now().toString();
    const { pathname } = request.nextUrl;
    const token = request.nextauth?.token;

    // Admin route role enforcement
    if (isAdminRoute(pathname) && token) {
      if (token.role !== 'admin' && token.role !== 'superadmin') {
        const unauthorizedUrl = request.nextUrl.clone();
        unauthorizedUrl.pathname = '/unauthorized';
        const response = NextResponse.redirect(unauthorizedUrl);
        response.headers.set('x-request-id', requestId);
        return response;
      }
    }

    // Build enriched request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', requestId);
    requestHeaders.set('x-request-start', requestStart);

    if (token) {
      requestHeaders.set('x-user-id', token.userId ?? '');
      requestHeaders.set('x-user-email', (token.email as string) ?? '');
      requestHeaders.set('x-user-role', token.role ?? '');
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('x-request-id', requestId);
    return response;
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Health/readiness endpoints — always accessible
        if (pathname === '/api/health' || pathname === '/api/ready' || pathname === '/api/media') {
          return true;
        }

        // NextAuth's own routes — always accessible
        if (pathname.startsWith('/api/auth/')) {
          return true;
        }

        // Public page routes — always accessible
        if (isPublicPageRoute(pathname)) {
          return true;
        }

        // Public GET APIs — accessible without auth
        if (isPublicGetApi(pathname, req.method)) {
          return true;
        }

        // Everything else requires authentication
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  // `api/upload/file` is excluded so Next.js does not buffer large multipart
  // bodies (up to 500MB for audio) through edge middleware, which caps at 10MB
  // by default. The handler authenticates itself via requireAuth + requireRole.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/upload/file|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
