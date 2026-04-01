/**
 * Unit tests for the buildProviders function in NextAuth options.
 *
 * Verifies that the Credentials provider is excluded in production mode
 * (defense in depth), ensuring password-based auth is only available
 * during development.
 *
 * Dependencies:
 * - vitest
 * - @/lib/auth/next-auth-options (authOptions)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

/* Mock heavy dependencies to isolate provider-building logic. */
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    account: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/auth/prisma-adapter', () => ({
  createPrismaAdapter: vi.fn(() => ({})),
}));

vi.mock('@/lib/auth/nextauth-logger', () => ({
  buildNextAuthLogger: vi.fn(() => ({})),
}));

vi.mock('@/lib/auth/env-validation', () => ({
  validateAuthEnvironment: vi.fn(() => []),
}));

vi.mock('@/lib/auth/account-linking', () => ({
  linkAzureAdAccount: vi.fn(),
}));

vi.mock('@/lib/auth/token-revocation', () => ({
  revokeToken: vi.fn(),
  isTokenRevoked: vi.fn(() => false),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('buildProviders (production vs development)', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('excludes the Credentials provider when NODE_ENV is production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    /* Ensure Azure AD env vars are set so that provider is included. */
    process.env.AZURE_AD_CLIENT_ID = 'test-id';
    process.env.AZURE_AD_CLIENT_SECRET = 'test-secret';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant';

    const { authOptions } = await import('@/lib/auth/next-auth-options');

    const providerNames = authOptions.providers.map(
      (provider) => (provider as { name?: string }).name ?? (provider as { id?: string }).id
    );

    expect(providerNames).not.toContain('Credentials');
    expect(providerNames).toContain('Azure Active Directory');

    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_CLIENT_SECRET;
    delete process.env.AZURE_AD_TENANT_ID;
  });

  it('includes the Credentials provider when NODE_ENV is development', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.AZURE_AD_CLIENT_ID = 'test-id';
    process.env.AZURE_AD_CLIENT_SECRET = 'test-secret';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant';

    const { authOptions } = await import('@/lib/auth/next-auth-options');

    const providerNames = authOptions.providers.map(
      (provider) => (provider as { name?: string }).name ?? (provider as { id?: string }).id
    );

    expect(providerNames).toContain('Credentials');
    expect(providerNames).toContain('Azure Active Directory');

    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_CLIENT_SECRET;
    delete process.env.AZURE_AD_TENANT_ID;
  });
});
