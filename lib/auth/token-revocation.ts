/**
 * In-memory token revocation store for invalidating JWTs on logout.
 *
 * Key responsibilities:
 * - Tracks revoked token JTIs with automatic expiry matching the session maxAge
 * - Provides revokeToken() and isTokenRevoked() for use in NextAuth callbacks
 * - Periodically cleans up expired entries to prevent memory growth
 *
 * Suitable for single-instance deployments. For distributed setups,
 * replace with a Redis-backed implementation.
 *
 * @example
 * import { revokeToken, isTokenRevoked } from '@/lib/auth/token-revocation';
 *
 * // On logout:
 * revokeToken(token.jti);
 *
 * // On JWT validation:
 * if (isTokenRevoked(token.jti)) { ... }
 */

/** Session max age in milliseconds — must match NextAuth session.maxAge (7 days). */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Cleanup interval in milliseconds (runs every hour). */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/** Map of revoked JTIs to their expiry timestamp (ms since epoch). */
const revokedTokens = new Map<string, number>();

/**
 * Marks a token as revoked. The entry auto-expires after SESSION_MAX_AGE_MS.
 *
 * @param jti - The unique JWT identifier to revoke.
 */
export function revokeToken(jti: string): void {
  revokedTokens.set(jti, Date.now() + SESSION_MAX_AGE_MS);
}

/**
 * Checks whether a token has been revoked.
 *
 * @param jti - The unique JWT identifier to check.
 * @returns True if the token is revoked and has not yet expired.
 */
export function isTokenRevoked(jti: string): boolean {
  const expiresAt = revokedTokens.get(jti);
  if (expiresAt === undefined) return false;

  if (Date.now() > expiresAt) {
    revokedTokens.delete(jti);
    return false;
  }

  return true;
}

/**
 * Removes expired entries from the revocation store.
 * Called periodically to prevent unbounded memory growth.
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [jti, expiresAt] of revokedTokens) {
    if (now > expiresAt) {
      revokedTokens.delete(jti);
    }
  }
}

// Schedule periodic cleanup (unref so it doesn't prevent process exit)
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
  if (typeof timer === 'object' && 'unref' in timer) {
    timer.unref();
  }
}
