/**
 * JWT Token Generation and Verification Utilities
 *
 * @module lib/auth/jwt
 *
 * @description Provides JWT token generation and verification utilities for the
 * authentication system. Handles both short-lived access tokens and long-lived
 * refresh tokens using distinct signing secrets.
 *
 * @responsibilities
 * - Sign JWT access tokens embedding user identity and role claims
 * - Sign JWT refresh tokens for obtaining new access tokens without re-login
 * - Verify and decode access tokens, returning typed payloads
 * - Verify and decode refresh tokens, returning typed payloads
 *
 * @dependencies
 * - jsonwebtoken — JWT signing and verification
 * - JWT_ACCESS_SECRET — environment variable; secret used to sign access tokens
 * - JWT_REFRESH_SECRET — environment variable; secret used to sign refresh tokens
 * - JWT_ACCESS_EXPIRY — optional env var; access token lifetime (default: '15m')
 * - JWT_REFRESH_EXPIRY — optional env var; refresh token lifetime (default: '7d')
 *
 * @security
 * Access and refresh tokens are signed with separate secrets so that a
 * compromised refresh secret cannot be used to forge access tokens and vice
 * versa. Access tokens are intentionally short-lived (15 minutes by default)
 * to limit the blast radius of token leakage.
 */
import jwt, { type SignOptions } from 'jsonwebtoken';

/**
 * Payload embedded in both access and refresh tokens.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Signs a JWT access token with the configured secret and expiry.
 *
 * @param payload - The user payload to embed in the token.
 * @returns A signed JWT string.
 * @throws If JWT_ACCESS_SECRET is not set.
 */
export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET environment variable is not set');
  }
  const expiresIn = process.env.JWT_ACCESS_EXPIRY ?? '15m';
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload }, secret, options);
}

/**
 * Signs a JWT refresh token with the configured secret and expiry.
 *
 * @param payload - The user payload to embed in the token.
 * @returns A signed JWT string.
 * @throws If JWT_REFRESH_SECRET is not set.
 */
export function signRefreshToken(payload: JwtPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  }
  const expiresIn = process.env.JWT_REFRESH_EXPIRY ?? '7d';
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload }, secret, options);
}

/**
 * Verifies and decodes a JWT access token.
 *
 * @param token - The JWT string to verify.
 * @returns The decoded payload.
 * @throws If the token is invalid, expired, or JWT_ACCESS_SECRET is not set.
 */
export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET environment variable is not set');
  }
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & JwtPayload;
  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
}

/**
 * Verifies and decodes a JWT refresh token.
 *
 * @param token - The JWT string to verify.
 * @returns The decoded payload.
 * @throws If the token is invalid, expired, or JWT_REFRESH_SECRET is not set.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  }
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & JwtPayload;
  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
}
