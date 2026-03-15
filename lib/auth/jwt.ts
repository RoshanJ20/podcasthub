/**
 * JWT access and refresh token utilities.
 *
 * Signs and verifies tokens using separate secrets for access and refresh
 * tokens. Expiry durations are configurable via environment variables
 * JWT_ACCESS_EXPIRY (default '15m') and JWT_REFRESH_EXPIRY (default '7d').
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
