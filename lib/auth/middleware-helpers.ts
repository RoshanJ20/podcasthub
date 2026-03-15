/**
 * Middleware route classification helpers for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Classifies request pathnames into public, auth, admin, and API categories
 * - Used by the Next.js middleware to determine authentication requirements
 *
 * Dependencies:
 * - None (pure functions with no external dependencies)
 *
 * @example
 * import { isPublicRoute, isAdminRoute } from '@/lib/auth/middleware-helpers';
 *
 * if (isPublicRoute('/bulletins')) {
 *   // Allow access without authentication
 * }
 */

/**
 * Routes that are accessible without any authentication.
 *
 * Includes landing page, login, unauthorized, and content browsing routes.
 * Some routes use prefix matching (e.g., /podcast/*) to cover dynamic segments.
 */
const PUBLIC_EXACT_ROUTES: ReadonlySet<string> = new Set([
  '/',
  '/login',
  '/unauthorized',
  '/bulletins',
  '/learning-path',
  '/search',
]);

/**
 * Route prefixes that are publicly accessible.
 *
 * Any pathname starting with one of these prefixes is treated as public.
 */
const PUBLIC_PREFIX_ROUTES: readonly string[] = ['/podcast/', '/learning-path/'];

/**
 * Determines whether a pathname is a public route that requires no authentication.
 *
 * Public routes include the home page, login, unauthorized, bulletins,
 * podcast detail pages, learning paths, and search.
 *
 * @param pathname - The URL pathname to classify.
 * @returns True if the route is publicly accessible without authentication.
 */
export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIX_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Determines whether a pathname is an auth API route (e.g., /api/auth/*).
 *
 * Auth routes handle login, registration, token refresh, and logout.
 * These routes must be accessible without a valid JWT since they are used
 * to obtain or refresh tokens.
 *
 * @param pathname - The URL pathname to classify.
 * @returns True if the route is an auth API endpoint.
 */
export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/api/auth/');
}

/**
 * Determines whether a pathname is an admin route (e.g., /admin/*).
 *
 * Admin routes require both a valid JWT and an admin or superadmin role.
 * Only matches page routes, not API routes (e.g., /api/admin is not matched).
 *
 * @param pathname - The URL pathname to classify.
 * @returns True if the route requires admin privileges.
 */
export function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * Determines whether a pathname is an API route (e.g., /api/*).
 *
 * API routes return JSON responses and use 401 status codes for
 * unauthorized access instead of redirects.
 *
 * @param pathname - The URL pathname to classify.
 * @returns True if the route is an API endpoint.
 */
export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}
