/**
 * Microsoft Entra ID (Azure AD) OIDC utility functions.
 *
 * Key responsibilities:
 * - Build the OIDC authorization URL for the Authorization Code Flow
 * - Exchange an authorization code for tokens at the Entra ID token endpoint
 * - Validate the ID token (signature, issuer, audience, nonce, expiry)
 * - Extract user claims (oid, email, displayName) from the validated ID token
 *
 * Dependencies:
 * - jose (v6.x) — JWT verification and JWKS fetching
 * - Environment variables: ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, ENTRA_TENANT_ID, ENTRA_REDIRECT_URI
 *
 * @module lib/auth/entra-id
 */
import * as jose from 'jose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Entra ID OIDC configuration derived from environment variables.
 */
export interface EntraIdConfig {
  /** Application (client) ID from the App Registration. */
  clientId: string;
  /** Client secret value. */
  clientSecret: string;
  /** Directory (tenant) ID. */
  tenantId: string;
  /** OAuth2 redirect URI (must match the App Registration exactly). */
  redirectUri: string;
  /** OIDC authority base URL. */
  authority: string;
  /** Authorization endpoint URL. */
  authorizationEndpoint: string;
  /** Token endpoint URL. */
  tokenEndpoint: string;
  /** JWKS URI for ID token signature verification. */
  jwksUri: string;
}

/**
 * User claims extracted from a validated Entra ID token.
 */
export interface EntraIdUserClaims {
  /** Object ID — immutable user identifier in Azure AD. */
  oid: string;
  /** User email address (from preferred_username, email, or upn claim). */
  email: string;
  /** Display name (from the name claim). */
  displayName: string;
  /** Tenant ID (from the tid claim). */
  tenantId: string;
}

/**
 * Error codes for Entra ID authentication failures.
 */
export type EntraIdErrorCode =
  | 'CONFIG_MISSING'
  | 'TOKEN_EXCHANGE_FAILED'
  | 'TOKEN_VALIDATION_FAILED'
  | 'USER_CLAIMS_INVALID';

/**
 * Custom error class for Entra ID authentication failures.
 *
 * Carries a machine-readable code alongside the human-readable message
 * to enable callers to handle different failure modes distinctly.
 */
export class EntraIdError extends Error {
  public readonly code: EntraIdErrorCode;

  constructor(message: string, code: EntraIdErrorCode, cause?: unknown) {
    super(message, { cause });
    this.name = 'EntraIdError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Loads and validates Entra ID configuration from environment variables.
 *
 * @returns Validated EntraIdConfig.
 * @throws EntraIdError with code CONFIG_MISSING if any required variable is absent.
 */
export function loadEntraIdConfig(): EntraIdConfig {
  const clientId = process.env.ENTRA_CLIENT_ID;
  const clientSecret = process.env.ENTRA_CLIENT_SECRET;
  const tenantId = process.env.ENTRA_TENANT_ID;
  const redirectUri = process.env.ENTRA_REDIRECT_URI;

  if (!clientId || !clientSecret || !tenantId || !redirectUri) {
    const missing = [
      !clientId && 'ENTRA_CLIENT_ID',
      !clientSecret && 'ENTRA_CLIENT_SECRET',
      !tenantId && 'ENTRA_TENANT_ID',
      !redirectUri && 'ENTRA_REDIRECT_URI',
    ].filter(Boolean);

    throw new EntraIdError(
      `Missing required Entra ID environment variables: ${missing.join(', ')}`,
      'CONFIG_MISSING'
    );
  }

  const authority = `https://login.microsoftonline.com/${tenantId}/v2.0`;

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri,
    authority,
    authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  };
}

// ---------------------------------------------------------------------------
// Authorization URL
// ---------------------------------------------------------------------------

/**
 * Builds the OIDC authorization URL to redirect the user to Microsoft login.
 *
 * @param state - CSRF protection state parameter (random string stored in a cookie).
 * @param nonce - Nonce embedded in the ID token to prevent replay attacks.
 * @param redirectTo - Optional post-login redirect path to encode in the state.
 * @returns The full authorization URL string.
 * @throws EntraIdError with code CONFIG_MISSING if config is incomplete.
 */
export function buildAuthorizationUrl(state: string, nonce: string, redirectTo?: string): string {
  const config = loadEntraIdConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state,
    nonce,
  });

  if (redirectTo) {
    params.set('login_hint', '');
    // redirectTo is encoded within the state cookie, not as a URL param.
    // This avoids exposing internal paths in the authorization URL.
  }

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Token Exchange
// ---------------------------------------------------------------------------

/** Shape of the Entra ID token endpoint response. */
interface TokenResponse {
  id_token: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Exchanges an authorization code for Entra ID tokens.
 *
 * Performs a server-to-server POST to the Entra ID token endpoint using
 * the authorization code grant type.
 *
 * @param code - The authorization code from the callback query params.
 * @returns Object containing the raw idToken and accessToken strings.
 * @throws EntraIdError with code TOKEN_EXCHANGE_FAILED if the exchange fails.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  idToken: string;
  accessToken: string;
}> {
  const config = loadEntraIdConfig();

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    scope: 'openid profile email',
  });

  let response: Response;
  try {
    response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (error) {
    throw new EntraIdError(
      'Failed to connect to Entra ID token endpoint',
      'TOKEN_EXCHANGE_FAILED',
      error
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new EntraIdError(
      `Token exchange failed with status ${response.status}: ${errorBody}`,
      'TOKEN_EXCHANGE_FAILED'
    );
  }

  const data = (await response.json()) as TokenResponse;

  return {
    idToken: data.id_token,
    accessToken: data.access_token,
  };
}

// ---------------------------------------------------------------------------
// ID Token Validation
// ---------------------------------------------------------------------------

/** Cached JWKS fetcher to avoid re-fetching keys on every request. */
let _jwks: ReturnType<typeof jose.createRemoteJWKSet> | undefined;

/**
 * Returns a cached jose JWKS fetcher for the configured tenant.
 *
 * @returns A jose GetKeyFunction that resolves signing keys from the JWKS endpoint.
 */
function getJwks(): ReturnType<typeof jose.createRemoteJWKSet> {
  if (!_jwks) {
    const config = loadEntraIdConfig();
    _jwks = jose.createRemoteJWKSet(new URL(config.jwksUri));
  }
  return _jwks;
}

/**
 * Resets the cached JWKS fetcher.
 *
 * @internal For use in unit tests only — do not call in application code.
 */
export function _resetJwksForTesting(): void {
  _jwks = undefined;
}

/**
 * Validates an Entra ID token and extracts user claims.
 *
 * Verifies the token signature against the Entra ID JWKS, and checks
 * issuer, audience, nonce, and expiry.
 *
 * @param idToken - The raw ID token JWT string from the token exchange.
 * @param expectedNonce - The nonce that was sent in the authorization request.
 * @returns Validated user claims extracted from the ID token.
 * @throws EntraIdError with code TOKEN_VALIDATION_FAILED if validation fails.
 * @throws EntraIdError with code USER_CLAIMS_INVALID if required claims are missing.
 */
export async function validateIdToken(
  idToken: string,
  expectedNonce: string
): Promise<EntraIdUserClaims> {
  const config = loadEntraIdConfig();
  const jwks = getJwks();

  let payload: jose.JWTPayload;
  try {
    const result = await jose.jwtVerify(idToken, jwks, {
      issuer: config.authority,
      audience: config.clientId,
      clockTolerance: 60,
    });
    payload = result.payload;
  } catch (error) {
    throw new EntraIdError(
      'ID token signature or claims verification failed',
      'TOKEN_VALIDATION_FAILED',
      error
    );
  }

  // Verify nonce to prevent replay attacks
  if (payload.nonce !== expectedNonce) {
    throw new EntraIdError(
      'ID token nonce does not match the expected value',
      'TOKEN_VALIDATION_FAILED'
    );
  }

  // Extract user identity claims
  const oid = payload.oid as string | undefined;
  const email =
    (payload.preferred_username as string | undefined) ??
    (payload.email as string | undefined) ??
    (payload.upn as string | undefined);
  const displayName = (payload.name as string | undefined) ?? '';
  const tenantId = (payload.tid as string | undefined) ?? config.tenantId;

  if (!oid || !email) {
    throw new EntraIdError(
      `Missing required claims in ID token. oid: ${oid ?? 'missing'}, email: ${email ?? 'missing'}`,
      'USER_CLAIMS_INVALID'
    );
  }

  return { oid, email: email.toLowerCase(), displayName, tenantId };
}
