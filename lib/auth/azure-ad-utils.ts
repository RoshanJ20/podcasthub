/**
 * Azure AD profile utility functions for The Audit Brief.
 *
 * Key responsibilities:
 * - Extracts email from Azure AD profile objects with fallback chain
 *
 * These are pure functions with no side effects, extracted from
 * next-auth-options.ts for testability and single responsibility.
 */

/**
 * Extracts a usable email address from an Azure AD profile.
 *
 * Azure AD may place the email in different fields depending on
 * tenant configuration and token version (v1 vs v2). This function
 * tries `email`, then `preferred_username`, then `mail` in order.
 *
 * @param profile - The raw Azure AD profile object from the OIDC token.
 * @returns The email address, or null if no valid email is found.
 *
 * @example
 * ```ts
 * const email = extractAzureAdEmail({ preferred_username: 'user@org.com' });
 * // returns 'user@org.com'
 * ```
 */
export function extractAzureAdEmail(profile: Record<string, unknown>): string | null {
  const candidates = [profile.email, profile.preferred_username, profile.mail];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.includes('@')) {
      return candidate;
    }
  }

  return null;
}
