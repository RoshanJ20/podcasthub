/**
 * Unit tests for JWT access and refresh token signing and verification.
 *
 * Sets environment variables for secrets and expiry before each test.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type JwtPayload,
} from '@/lib/auth/jwt';

const testPayload: JwtPayload = {
  userId: 'user-123',
  email: 'test@example.com',
  role: 'host',
};

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough';
  delete process.env.JWT_ACCESS_EXPIRY;
  delete process.env.JWT_REFRESH_EXPIRY;
});

describe('signAccessToken', () => {
  it('returns a string with 3 dot-separated parts', () => {
    const token = signAccessToken(testPayload);
    expect(token).toBeTypeOf('string');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyAccessToken', () => {
  it('decodes correct payload', () => {
    const token = signAccessToken(testPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(testPayload.userId);
    expect(decoded.email).toBe(testPayload.email);
    expect(decoded.role).toBe(testPayload.role);
  });

  it('throws on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('throws on expired token', async () => {
    // Sign with a very short expiry
    process.env.JWT_ACCESS_EXPIRY = '1ms';
    const token = signAccessToken(testPayload);
    // Wait for token to expire
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(() => verifyAccessToken(token)).toThrow();
  });
});

describe('signRefreshToken / verifyRefreshToken', () => {
  it('signs and verifies refresh token correctly', () => {
    const token = signRefreshToken(testPayload);
    expect(token.split('.')).toHaveLength(3);

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(testPayload.userId);
    expect(decoded.email).toBe(testPayload.email);
    expect(decoded.role).toBe(testPayload.role);
  });

  it('throws when verifying refresh token with access secret', () => {
    const token = signRefreshToken(testPayload);
    expect(() => verifyAccessToken(token)).toThrow();
  });
});
