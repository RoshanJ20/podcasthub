/**
 * Unit tests for the NextAuth analytics-emission wiring.
 *
 * Tests cover:
 * - events.signIn fires a `signin` UserActivity row with provider + isNewUser
 *   metadata for both credentials and Azure AD providers.
 * - events.signOut continues to revoke the JWT (regression) and additionally
 *   fires a `signout` UserActivity row.
 * - The credentials authorize() callback persists `signin_failed` rows for
 *   known users with bad credentials, but NOT for unknown emails (privacy).
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import type { NextAuthOptions } from 'next-auth';

/* Set env vars BEFORE the next-auth-options module loads, since the module
 * reads them at evaluation time to decide which providers to build.
 * NODE_ENV is typed as readonly by @types/node — cast to bypass at the test boundary. */
(process.env as Record<string, string>).NODE_ENV = 'development';
process.env.AZURE_AD_CLIENT_ID = 'test-id';
process.env.AZURE_AD_CLIENT_SECRET = 'test-secret';
process.env.AZURE_AD_TENANT_ID = 'test-tenant';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    account: { findUnique: vi.fn() },
    userActivity: { create: vi.fn() },
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

const { revokeTokenSpy } = vi.hoisted(() => ({ revokeTokenSpy: vi.fn() }));
vi.mock('@/lib/auth/token-revocation', () => ({
  revokeToken: revokeTokenSpy,
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

import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';

const USER_ID = '11111111-1111-1111-1111-111111111111';

type AuthOptions = NextAuthOptions;
type CredentialsProvider = {
  id: string;
  authorize: (
    credentials: Record<string, string> | undefined
  ) => Promise<{ id: string; email: string; role: string } | null>;
};

let authOptions: AuthOptions;

beforeAll(async () => {
  const mod = await import('@/lib/auth/next-auth-options');
  authOptions = mod.authOptions;
});

beforeEach(() => {
  vi.mocked(prisma.user.findUnique).mockReset();
  vi.mocked(prisma.userActivity.create).mockReset();
  vi.mocked(verifyPassword).mockReset();
  revokeTokenSpy.mockReset();
});

afterAll(() => {
  delete process.env.AZURE_AD_CLIENT_ID;
  delete process.env.AZURE_AD_CLIENT_SECRET;
  delete process.env.AZURE_AD_TENANT_ID;
});

describe('events.signIn', () => {
  it('emits `signin` for a credentials login', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    await authOptions.events!.signIn!({
      user: { id: USER_ID, email: 'u@example.com', name: 'U', role: 'public', displayName: 'U' },
      account: { provider: 'credentials', providerAccountId: USER_ID, type: 'credentials' },
      isNewUser: false,
    });

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        activityType: 'signin',
        metadata: { provider: 'credentials', isNewUser: false },
      }),
    });
  });

  it('emits `signin` with provider=azure-ad for SSO logins', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    await authOptions.events!.signIn!({
      user: { id: USER_ID, email: 'u@example.com', name: 'U', role: 'public', displayName: 'U' },
      account: { provider: 'azure-ad', providerAccountId: 'abc', type: 'oauth' },
      isNewUser: true,
    });

    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activityType: 'signin',
        metadata: { provider: 'azure-ad', isNewUser: true },
      }),
    });
  });

  it('does not emit when user.id is missing', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    await authOptions.events!.signIn!({
      // @ts-expect-error - simulating malformed user without id
      user: { email: 'u@example.com' },
      account: { provider: 'credentials', providerAccountId: 'x', type: 'credentials' },
      isNewUser: false,
    });

    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });

  it('does not throw when the analytics write fails (auth must still succeed)', async () => {
    vi.mocked(prisma.userActivity.create).mockRejectedValue(new Error('db down'));

    await expect(
      authOptions.events!.signIn!({
        user: { id: USER_ID, email: 'u@example.com', name: 'U', role: 'public', displayName: 'U' },
        account: { provider: 'credentials', providerAccountId: USER_ID, type: 'credentials' },
        isNewUser: false,
      })
    ).resolves.toBeUndefined();
  });
});

describe('events.signOut', () => {
  it('revokes the JWT and emits a `signout` row when jti and userId are present', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    await authOptions.events!.signOut!({
      session: null,
      token: { jti: 'jti-1', userId: USER_ID },
    } as unknown as Parameters<NonNullable<NonNullable<NextAuthOptions['events']>['signOut']>>[0]);

    expect(revokeTokenSpy).toHaveBeenCalledWith('jti-1');
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        activityType: 'signout',
      }),
    });
  });

  it('does nothing when the token has no jti', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    await authOptions.events!.signOut!({
      session: null,
      token: {},
    } as unknown as Parameters<NonNullable<NonNullable<NextAuthOptions['events']>['signOut']>>[0]);

    expect(revokeTokenSpy).not.toHaveBeenCalled();
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });

  it('still revokes the JWT when the analytics write fails', async () => {
    vi.mocked(prisma.userActivity.create).mockRejectedValue(new Error('db down'));

    await authOptions.events!.signOut!({
      session: null,
      token: { jti: 'jti-2', userId: USER_ID },
    } as unknown as Parameters<NonNullable<NonNullable<NextAuthOptions['events']>['signOut']>>[0]);

    expect(revokeTokenSpy).toHaveBeenCalledWith('jti-2');
  });
});

describe('Credentials authorize() — signin_failed emission', () => {
  function getCredentialsAuthorize(): CredentialsProvider['authorize'] {
    const credentialsProvider = authOptions.providers.find(
      (p) => (p as { id?: string }).id === 'credentials'
    ) as unknown as { options?: { authorize?: CredentialsProvider['authorize'] } };
    /* NextAuth v4 stores the user-supplied authorize on provider.options.authorize.
     * The top-level provider.authorize is a () => null stub. */
    const authorize = credentialsProvider?.options?.authorize;
    if (!authorize) {
      throw new Error('Credentials provider missing in test environment');
    }
    return authorize;
  }

  it('emits `signin_failed` with reason=invalid_password when password is wrong', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: USER_ID,
      email: 'u@example.com',
      passwordHash: 'hash',
      displayName: 'U',
      image: null,
      role: 'public',
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const authorize = getCredentialsAuthorize();
    const result = await authorize({ email: 'u@example.com', password: 'wrong' });

    expect(result).toBeNull();
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        activityType: 'signin_failed',
        metadata: { provider: 'credentials', reason: 'invalid_password' },
      }),
    });
  });

  it('emits `signin_failed` with reason=sso_only_user when user has no password hash', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: USER_ID,
      email: 'u@example.com',
      passwordHash: null,
      displayName: 'U',
      image: null,
      role: 'public',
    } as never);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const authorize = getCredentialsAuthorize();
    const result = await authorize({ email: 'u@example.com', password: 'anything' });

    expect(result).toBeNull();
    expect(prisma.userActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        activityType: 'signin_failed',
        metadata: { provider: 'credentials', reason: 'sso_only_user' },
      }),
    });
  });

  it('does NOT emit when the email is unknown (privacy — avoids enumeration)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const authorize = getCredentialsAuthorize();
    const result = await authorize({ email: 'noone@example.com', password: 'x' });

    expect(result).toBeNull();
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });

  it('does NOT emit when credentials are missing', async () => {
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const authorize = getCredentialsAuthorize();
    const result1 = await authorize(undefined);
    const result2 = await authorize({ email: 'u@example.com' } as unknown as Record<
      string,
      string
    >);

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(prisma.userActivity.create).not.toHaveBeenCalled();
  });

  it('returns the user object and does not emit signin_failed on a successful login', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: USER_ID,
      email: 'u@example.com',
      passwordHash: 'hash',
      displayName: 'U',
      image: null,
      role: 'public',
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(prisma.userActivity.create).mockResolvedValue({} as never);

    const authorize = getCredentialsAuthorize();
    const result = await authorize({ email: 'u@example.com', password: 'right' });

    expect(result).toMatchObject({ id: USER_ID, email: 'u@example.com', role: 'public' });
    expect(prisma.userActivity.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activityType: 'signin_failed' }),
      })
    );
  });
});
