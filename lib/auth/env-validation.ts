/**
 * Auth-critical environment variable validation for The Audit Brief.
 *
 * Key responsibilities:
 * - Validates NEXTAUTH_URL is set and well-formed
 * - Validates NEXTAUTH_SECRET meets minimum length requirements
 * - Warns about common production misconfigurations (localhost, HTTP)
 *
 * Call this at application startup (module load time) to catch
 * misconfigurations before they cause cryptic auth failures.
 */

/**
 * Validates auth-critical environment variables.
 *
 * @returns An array of warning messages (empty if no warnings).
 *          Warnings are non-fatal issues like HTTP in production.
 * @throws {Error} If a required variable is missing or invalid.
 *
 * @example
 * ```ts
 * const warnings = validateAuthEnvironment();
 * warnings.forEach(w => logger.warn(w));
 * ```
 */
export function validateAuthEnvironment(): string[] {
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nodeEnv = process.env.NODE_ENV;
  const warnings: string[] = [];

  if (!nextAuthUrl) {
    throw new Error(
      'NEXTAUTH_URL is not set. This is required for NextAuth to verify request origins. ' +
        'Set it to the canonical URL of your application (e.g., https://your-domain.com).'
    );
  }

  try {
    const parsed = new URL(nextAuthUrl);

    if (nodeEnv === 'production') {
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        warnings.push(
          `NEXTAUTH_URL points to localhost in production ("${nextAuthUrl}") — this will cause auth failures`
        );
      }
      if (parsed.protocol === 'http:') {
        warnings.push(
          `NEXTAUTH_URL uses HTTP in production ("${nextAuthUrl}") — should be HTTPS for secure cookies`
        );
      }
    }
  } catch {
    throw new Error(
      `NEXTAUTH_URL is not a valid URL: "${nextAuthUrl}". ` +
        'Set it to the canonical URL (e.g., https://your-domain.com).'
    );
  }

  if (!nextAuthSecret || nextAuthSecret.length < 32) {
    throw new Error(
      'NEXTAUTH_SECRET must be at least 32 characters. ' +
        'Generate one with: openssl rand -base64 32'
    );
  }

  return warnings;
}
