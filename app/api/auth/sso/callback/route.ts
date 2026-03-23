/**
 * SSO callback endpoint — handles the redirect from Microsoft Entra ID.
 *
 * Key responsibilities:
 * - Validates the CSRF state parameter against the stored cookie
 * - Exchanges the authorization code for Entra ID tokens
 * - Validates the ID token (signature, issuer, audience, nonce, expiry)
 * - Provisions new users or links existing accounts (JIT provisioning)
 * - Issues the application's own JWT tokens (reuses existing jwt.ts functions)
 * - Sets HttpOnly auth cookies (reuses existing cookies.ts functions)
 * - Redirects to the original destination
 *
 * Dependencies:
 * - @/lib/auth/entra-id (exchangeCodeForTokens, validateIdToken)
 * - @/lib/auth/jwt (signAccessToken, signRefreshToken)
 * - @/lib/auth/cookies (setAuthCookies)
 * - @/lib/db (prisma)
 * - @/lib/logger (logger)
 *
 * @route GET /api/auth/sso/callback
 * @query code - Authorization code from Entra ID
 * @query state - CSRF state parameter for verification
 * @query error - Error code if authentication failed at Entra ID
 * @query error_description - Human-readable error message from Entra ID
 * @returns 302 Redirect to the app with auth cookies set, or to /login on error
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { exchangeCodeForTokens, validateIdToken, EntraIdError } from '@/lib/auth/entra-id';
import type { EntraIdUserClaims } from '@/lib/auth/entra-id';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/cookies';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/** SSO state cookie name (must match authorize route). */
const SSO_STATE_COOKIE = 'sso_state';

/** Shape of the SSO state stored in the cookie. */
interface SsoState {
  csrf: string;
  nonce: string;
  redirectTo?: string;
}

/**
 * Provisions a new user or links an existing account for an SSO login.
 *
 * Lookup priority:
 * 1. By entraId (returning SSO user) — issue tokens directly
 * 2. By email (existing password user) — link account by adding entraId
 * 3. Not found — JIT provision: create User + UserRole with "public" role
 *
 * @param claims - Validated user claims from the Entra ID token.
 * @returns The user's ID, email, and role for JWT payload construction.
 */
async function provisionOrLinkUser(claims: EntraIdUserClaims): Promise<{
  userId: string;
  email: string;
  role: string;
}> {
  // 1. Lookup by entraId — returning SSO user
  const existingByEntraId = await prisma.user.findUnique({
    where: { entraId: claims.oid },
    include: { role: true },
  });

  if (existingByEntraId) {
    logger.info({ userId: existingByEntraId.id }, 'Returning SSO user authenticated');
    return {
      userId: existingByEntraId.id,
      email: existingByEntraId.email,
      role: existingByEntraId.role?.role ?? 'public',
    };
  }

  // 2. Lookup by email — existing password user, link account
  const existingByEmail = await prisma.user.findUnique({
    where: { email: claims.email },
    include: { role: true },
  });

  if (existingByEmail) {
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        entraId: claims.oid,
        authProvider: existingByEmail.passwordHash ? 'both' : 'entra_id',
        ...(existingByEmail.displayName ? {} : { displayName: claims.displayName }),
      },
    });

    logger.info(
      { userId: existingByEmail.id, email: claims.email },
      'Linked existing account with Entra ID'
    );

    return {
      userId: existingByEmail.id,
      email: existingByEmail.email,
      role: existingByEmail.role?.role ?? 'public',
    };
  }

  // 3. JIT provision — new SSO-only user
  const newUser = await prisma.user.create({
    data: {
      email: claims.email,
      passwordHash: null,
      displayName: claims.displayName || null,
      entraId: claims.oid,
      authProvider: 'entra_id',
      role: {
        create: { role: 'public' },
      },
    },
    include: { role: true },
  });

  logger.info({ userId: newUser.id, email: newUser.email }, 'JIT provisioned new SSO user');

  return {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role?.role ?? 'public',
  };
}

/**
 * Builds a redirect URL to the login page with an error parameter.
 *
 * @param request - The incoming request (for constructing the base URL).
 * @param errorCode - Machine-readable error code appended as a query parameter.
 * @returns URL string pointing to /login with the error parameter.
 */
function loginErrorUrl(request: NextRequest, errorCode: string): string {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', errorCode);
  return url.toString();
}

/**
 * Handles the OAuth2 callback from Entra ID.
 *
 * Validates the state, exchanges the code, validates the ID token,
 * provisions/links the user, issues app JWT tokens, and redirects.
 *
 * @param request - The incoming GET request with code and state query params.
 * @returns A 302 redirect with auth cookies set, or to /login on error.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  // Check for Entra ID errors (e.g., user cancelled)
  const entraError = searchParams.get('error');
  if (entraError) {
    const description = searchParams.get('error_description') ?? 'Unknown error';
    logger.warn({ entraError, description }, 'Entra ID returned an error');
    return NextResponse.redirect(loginErrorUrl(request, 'sso_cancelled'));
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    logger.warn('SSO callback missing code or state parameter');
    return NextResponse.redirect(loginErrorUrl(request, 'sso_invalid_request'));
  }

  // Retrieve and parse the SSO state cookie
  const stateCookie = request.cookies.get(SSO_STATE_COOKIE);
  if (!stateCookie?.value) {
    logger.warn('SSO callback missing sso_state cookie (may have expired)');
    return NextResponse.redirect(loginErrorUrl(request, 'sso_state_expired'));
  }

  let storedState: SsoState;
  try {
    storedState = JSON.parse(stateCookie.value) as SsoState;
  } catch {
    logger.warn('SSO callback received malformed sso_state cookie');
    return NextResponse.redirect(loginErrorUrl(request, 'sso_state_invalid'));
  }

  // CSRF check: verify state matches
  if (state !== storedState.csrf) {
    logger.warn('SSO callback state mismatch (possible CSRF attack)');
    return NextResponse.redirect(loginErrorUrl(request, 'sso_state_mismatch'));
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Validate the ID token (signature, issuer, audience, nonce, expiry)
    const claims = await validateIdToken(tokens.idToken, storedState.nonce);

    // Provision or link user in the database
    const user = await provisionOrLinkUser(claims);

    // Issue the application's own JWT tokens (reuses existing JWT pipeline)
    const jwtPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    // Redirect to the original destination with auth cookies
    const redirectTo = storedState.redirectTo ?? '/';
    const redirectUrl = new URL(redirectTo, request.url);
    const response = NextResponse.redirect(redirectUrl.toString());

    // Set auth cookies (reuses existing cookie management)
    setAuthCookies(response, accessToken, refreshToken);

    // Clear the SSO state cookie
    response.cookies.set(SSO_STATE_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    logger.info(
      { userId: user.userId, email: user.email, redirectTo },
      'SSO authentication completed successfully'
    );

    return response;
  } catch (error) {
    if (error instanceof EntraIdError) {
      logger.error({ code: error.code, error: error.message }, 'SSO authentication failed');

      const errorCodeMap: Record<string, string> = {
        TOKEN_EXCHANGE_FAILED: 'sso_token_exchange_failed',
        TOKEN_VALIDATION_FAILED: 'sso_token_invalid',
        USER_CLAIMS_INVALID: 'sso_claims_invalid',
        CONFIG_MISSING: 'sso_not_configured',
      };

      const errorParam = errorCodeMap[error.code] ?? 'sso_error';
      return NextResponse.redirect(loginErrorUrl(request, errorParam));
    }

    logger.error({ error }, 'Unexpected error during SSO callback');
    return NextResponse.redirect(loginErrorUrl(request, 'sso_error'));
  }
}
