/**
 * Deployment base path configuration for The Audit Brief.
 *
 * Key responsibilities:
 * - Exports the basePath constant that matches next.config.ts basePath
 * - Provides withBasePath() utility for client-side fetch() and window.location calls
 *
 * Browser fetch() and window.location.href do not respect Next.js basePath,
 * so all client-side HTTP calls and hard navigations must use this utility.
 *
 * @example
 * import { withBasePath } from '@/lib/config/base-path';
 * fetch(withBasePath('/api/search'));  // → fetch('/auditbrief/api/search')
 */

/** The subpath prefix under which the app is deployed (matches next.config.ts basePath). */
export const BASE_PATH = '/auditbrief';

/**
 * Prepends the deployment basePath to a URL path.
 *
 * @param path - The path to prefix, e.g. '/api/search' or '/login'.
 * @returns The prefixed path, e.g. '/auditbrief/api/search'.
 */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
