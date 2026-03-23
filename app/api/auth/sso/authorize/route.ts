/**
 * SSO initiation endpoint — redirects the user to Microsoft Entra ID login.
 *
 * Key responsibilities:
 * - Generates cryptographic state (CSRF) and nonce values
 * - Stores SSO state in a short-lived HttpOnly cookie for callback verification
 * - Builds the Entra ID authorization URL with OIDC parameters
 * - Returns a 302 redirect to the Microsoft login page
 *
 * Dependencies:
 * - @/lib/auth/entra-id (buildAuthorizationUrl)
 * - @/lib/api/request-logging-middleware (withRequestLogging)
 * - @/lib/logger (logger)
 *
 * @route GET /api/auth/sso/authorize
 * @query redirectTo - Optional post-login redirect path (default: "/")
 * @returns 302 Redirect to Entra ID authorization endpoint
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { buildAuthorizationUrl, EntraIdError } from '@/lib/auth/entra-id';
import { withRequestLogging } from '@/lib/api/request-logging-middleware';

import { logger } from '@/lib/logger';

/** SSO state cookie name. */
const SSO_STATE_COOKIE = 'sso_state';

/** SSO state cookie max age in seconds (10 minutes). */
const SSO_STATE_MAX_AGE = 10 * 60;

/**
 * Handles SSO initiation by redirecting to Entra ID.
 *
 * Generates CSRF state and nonce, stores them in an HttpOnly cookie,
 * and redirects the user to the Microsoft login page. The redirectTo
 * query parameter is preserved in the cookie for post-callback redirect.
 *
 * @param request - The incoming GET request.
 * @returns A 302 redirect response to the Entra ID authorization endpoint.
 */
export const GET = withRequestLogging(async (request: NextRequest): Promise<NextResponse> => {
  const redirectTo = request.nextUrl.searchParams.get('redirectTo') ?? '/';

  const csrf = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  let authorizationUrl: string;
  try {
    authorizationUrl = buildAuthorizationUrl(csrf, nonce, redirectTo);
  } catch (error) {
    if (error instanceof EntraIdError && error.code === 'CONFIG_MISSING') {
      logger.error({ error: error.message }, 'SSO configuration is incomplete');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'sso_not_configured');
      return NextResponse.redirect(loginUrl.toString());
    }
    throw error;
  }

  // Store state + nonce + redirectTo in an HttpOnly cookie for callback verification
  const statePayload = JSON.stringify({ csrf, nonce, redirectTo });
  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(SSO_STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SSO_STATE_MAX_AGE,
  });

  logger.info({ redirectTo }, 'SSO authorization initiated');

  return response;
});
