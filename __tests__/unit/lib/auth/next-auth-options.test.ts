/**
 * Unit tests for NextAuth deployment hardening utilities.
 *
 * Covers:
 * - extractAzureAdEmail: Azure AD profile email extraction with fallback
 * - buildNextAuthLogger: Pino-delegating NextAuth logger
 */
import { describe, it, expect, vi } from 'vitest';
import { extractAzureAdEmail } from '@/lib/auth/azure-ad-utils';
import { buildNextAuthLogger } from '@/lib/auth/nextauth-logger';

describe('extractAzureAdEmail', () => {
  it('returns email when profile.email is present', () => {
    const profile = { email: 'user@example.com', preferred_username: 'other@example.com' };
    expect(extractAzureAdEmail(profile)).toBe('user@example.com');
  });

  it('falls back to preferred_username when email is absent', () => {
    const profile = { preferred_username: 'user@example.com' };
    expect(extractAzureAdEmail(profile)).toBe('user@example.com');
  });

  it('falls back to mail when email and preferred_username are absent', () => {
    const profile = { mail: 'user@example.com' };
    expect(extractAzureAdEmail(profile)).toBe('user@example.com');
  });

  it('returns null when no email field is present', () => {
    const profile = { sub: '123', name: 'Test User' };
    expect(extractAzureAdEmail(profile)).toBeNull();
  });

  it('rejects values without @ symbol', () => {
    const profile = { email: 'not-an-email', preferred_username: 'also-not-email' };
    expect(extractAzureAdEmail(profile)).toBeNull();
  });

  it('rejects empty string values', () => {
    const profile = { email: '', preferred_username: '', mail: '' };
    expect(extractAzureAdEmail(profile)).toBeNull();
  });

  it('skips null/undefined fields and uses the next valid candidate', () => {
    const profile = { email: null, preferred_username: undefined, mail: 'fallback@example.com' };
    expect(extractAzureAdEmail(profile)).toBe('fallback@example.com');
  });

  it('prioritizes email over preferred_username over mail', () => {
    const profile = {
      email: 'first@example.com',
      preferred_username: 'second@example.com',
      mail: 'third@example.com',
    };
    expect(extractAzureAdEmail(profile)).toBe('first@example.com');
  });
});

describe('buildNextAuthLogger', () => {
  function createMockPinoLogger() {
    return {
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
      level: 'info',
      silent: vi.fn(),
    } as unknown as Parameters<typeof buildNextAuthLogger>[0] & {
      error: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      debug: ReturnType<typeof vi.fn>;
    };
  }

  it('returns an object with error, warn, and debug methods', () => {
    const mockLogger = createMockPinoLogger();
    const logger = buildNextAuthLogger(mockLogger);

    expect(logger.error).toBeTypeOf('function');
    expect(logger.warn).toBeTypeOf('function');
    expect(logger.debug).toBeTypeOf('function');
  });

  it('delegates error with Error metadata to pino error', () => {
    const mockLogger = createMockPinoLogger();
    const logger = buildNextAuthLogger(mockLogger);

    const testError = new Error('OAuth callback failed');
    testError.name = 'OAuthCallbackError';
    logger.error!('OAUTH_CALLBACK_ERROR', testError);

    expect(mockLogger.error).toHaveBeenCalledOnce();
    const [logObj, message] = mockLogger.error.mock.calls[0];
    expect(logObj.code).toBe('OAUTH_CALLBACK_ERROR');
    expect(logObj.errorName).toBe('OAuthCallbackError');
    expect(logObj.errorMessage).toBe('OAuth callback failed');
    expect(message).toContain('NextAuth');
  });

  it('delegates error with metadata object to pino error with verbose details', () => {
    const mockLogger = createMockPinoLogger();
    const logger = buildNextAuthLogger(mockLogger);

    const innerError = new Error('invalid_grant');
    innerError.name = 'OAuthError';
    logger.error!('OAUTH_CALLBACK_ERROR', {
      error: innerError,
      providerId: 'azure-ad',
      message: 'Callback error',
    });

    expect(mockLogger.error).toHaveBeenCalledOnce();
    const [logObj] = mockLogger.error.mock.calls[0];
    expect(logObj.code).toBe('OAUTH_CALLBACK_ERROR');
    expect(logObj.errorName).toBe('OAuthError');
    expect(logObj.errorMessage).toBe('invalid_grant');
    expect(logObj.providerId).toBe('azure-ad');
  });

  it('handles error metadata with no error property gracefully', () => {
    const mockLogger = createMockPinoLogger();
    const logger = buildNextAuthLogger(mockLogger);

    logger.error!('UNKNOWN_ERROR', { message: 'something broke' } as unknown as Error);

    expect(mockLogger.error).toHaveBeenCalledOnce();
    const [logObj] = mockLogger.error.mock.calls[0];
    expect(logObj.code).toBe('UNKNOWN_ERROR');
  });

  it('delegates warn to pino warn', () => {
    const mockLogger = createMockPinoLogger();
    const logger = buildNextAuthLogger(mockLogger);

    logger.warn!('NEXTAUTH_URL' as const);

    expect(mockLogger.warn).toHaveBeenCalledOnce();
    const [logObj, message] = mockLogger.warn.mock.calls[0];
    expect(logObj.code).toBe('NEXTAUTH_URL');
    expect(message).toContain('NextAuth');
  });

  it('delegates debug to pino debug', () => {
    const mockLogger = createMockPinoLogger();
    const logger = buildNextAuthLogger(mockLogger);

    logger.debug!('JWT_SESSION', { token: 'redacted' });

    expect(mockLogger.debug).toHaveBeenCalledOnce();
    const [logObj, message] = mockLogger.debug.mock.calls[0];
    expect(logObj.code).toBe('JWT_SESSION');
    expect(logObj.metadata).toEqual({ token: 'redacted' });
    expect(message).toContain('NextAuth');
  });
});
