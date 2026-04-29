/**
 * Next.js middleware for The Audit Brief.
 *
 * Implements JWT-based authentication via `getToken` from `next-auth/jwt`,
 * along with per-request CSP nonce generation and request tracing.
 *
 * Why not `next-auth/middleware`'s `withAuth`?
 * `withAuth` (NextAuth v4) does not invoke its wrapped middleware function
 * under Next.js 15.5's edge runtime — the wrapper short-circuits silently
 * and our header logic (request ID, CSP, x-nonce) never runs. Calling
 * `getToken` directly mirrors what `withAuth` does internally and works
 * end-to-end on every request that matches the matcher below.
 *
 * Key responsibilities:
 * - Generates a unique correlation ID (x-request-id) for every request
 * - Stamps x-request-start for downstream duration calculation
 * - Generates a per-request CSP nonce, propagates it to the render pipeline
 *   via the `x-nonce` request header, and emits the matching
 *   `Content-Security-Policy` response header on every HTML response
 * - Protects admin routes (requires admin/superadmin role)
 * - Protects write API routes (requires valid session)
 * - Allows public GET API routes without auth
 * - Injects x-user-id, x-user-email, x-user-role headers from the JWT
 *
 * Dependencies:
 * - next-auth/jwt (getToken)
 * - lib/security/csp (nonce + policy assembly)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { buildContentSecurityPolicy, generateNonce } from '@/lib/security/csp';

/**
 * Checks whether the pathname is a public page route that does not require authentication.
 *
 * @param pathname - The URL pathname to check (basePath already stripped by Next.js).
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
 * Checks whether the route is allowed without any authentication check.
 * Mirrors the original `withAuth.callbacks.authorized` allowlist.
 */
function isAlwaysAllowed(pathname: string, method: string): boolean {
  return (
    pathname === '/api/health' ||
    pathname === '/api/ready' ||
    pathname === '/api/media' ||
    pathname.startsWith('/api/auth/') ||
    isPublicPageRoute(pathname) ||
    isPublicGetApi(pathname, method)
  );
}

export default async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestStart = Date.now().toString();
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce);
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Bypass the large-body upload route entirely. Edge middleware buffers
  // the request body when `NextResponse.next({ request: { headers } })`
  // is used and has a 10 MB cap, which would corrupt files larger than
  // that. The matcher regex below also excludes this path, but the guard
  // here defends against a future basePath change silently reintroducing
  // the bug. The route handler authenticates itself via requireAuth.
  // CSP is irrelevant on this route — it returns JSON, not HTML — but we
  // still stamp the request-id for traceability.
  if (pathname.endsWith('/api/upload/file')) {
    const response = NextResponse.next();
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // Decode the NextAuth JWT (returns null when no/invalid cookie). Reading
  // happens on every request but is fast — the JWT is HMAC-verified, no DB
  // call. Same primitive `withAuth` uses internally.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Authorization gate. Redirect unauthenticated users to /login (preserving
  // the originally-requested URL as `callbackUrl`) for routes that require a
  // session. Always-allowed routes proceed regardless of token presence.
  if (!isAlwaysAllowed(pathname, method) && !token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('x-request-id', requestId);
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  // Admin route role enforcement
  if (isAdminRoute(pathname) && token) {
    if (token.role !== 'admin' && token.role !== 'superadmin') {
      const unauthorizedUrl = request.nextUrl.clone();
      unauthorizedUrl.pathname = '/unauthorized';
      const response = NextResponse.redirect(unauthorizedUrl);
      response.headers.set('x-request-id', requestId);
      response.headers.set('Content-Security-Policy', csp);
      return response;
    }
  }

  // Build enriched request headers. `x-nonce` is the contract Next.js's
  // render pipeline uses to auto-stamp framework-emitted <script> and
  // <style> tags with the per-request nonce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-request-start', requestStart);
  requestHeaders.set('x-nonce', nonce);

  if (token) {
    requestHeaders.set('x-user-id', (token.userId as string) ?? '');
    requestHeaders.set('x-user-email', (token.email as string) ?? '');
    requestHeaders.set('x-user-role', (token.role as string) ?? '');
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('x-request-id', requestId);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // `api/upload/file` is excluded so Next.js does not buffer large multipart
  // bodies (up to 500MB for audio) through edge middleware, which caps at 10MB
  // by default. The handler authenticates itself via requireAuth + requireRole.
  // The `(?:auditbrief/)?` prefix accounts for the production basePath —
  // without it, the matcher is evaluated against `/auditbrief/api/upload/file`
  // and the exclusion silently fails.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|(?:auditbrief/)?api/upload/file|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
