/**
 * Unit tests for the custom Prisma adapter utilities.
 *
 * Covers:
 * - mapUserToAdapterUser: Prisma User to NextAuth AdapterUser mapping
 * - createPrismaAdapter: P2002 handling in createUser
 */
import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { mapUserToAdapterUser } from '@/lib/auth/prisma-adapter-utils';
import { createPrismaAdapter } from '@/lib/auth/prisma-adapter';

describe('mapUserToAdapterUser', () => {
  it('maps displayName to name in the AdapterUser shape', () => {
    const prismaUser = {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: new Date('2024-01-01'),
      image: 'https://example.com/avatar.jpg',
      role: 'admin',
    };

    const result = mapUserToAdapterUser(prismaUser);

    expect(result.id).toBe('user-123');
    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('Test User');
    expect(result.emailVerified).toEqual(new Date('2024-01-01'));
    expect(result.image).toBe('https://example.com/avatar.jpg');
  });

  it('handles null displayName', () => {
    const prismaUser = {
      id: 'user-456',
      email: 'no-name@example.com',
      displayName: null,
      emailVerified: null,
      image: null,
      role: 'public',
    };

    const result = mapUserToAdapterUser(prismaUser);

    expect(result.name).toBeNull();
    expect(result.emailVerified).toBeNull();
    expect(result.image).toBeNull();
  });

  it('preserves role and displayName as custom fields', () => {
    const prismaUser = {
      id: 'user-789',
      email: 'admin@example.com',
      displayName: 'Admin User',
      emailVerified: null,
      image: null,
      role: 'superadmin',
    };

    const result = mapUserToAdapterUser(prismaUser);

    // Custom fields accessible via type assertion
    const extended = result as typeof result & { role: string; displayName: string | null };
    expect(extended.role).toBe('superadmin');
    expect(extended.displayName).toBe('Admin User');
  });
});

describe('createPrismaAdapter - createUser P2002 handling', () => {
  const mockUser = {
    id: 'user-abc',
    email: 'sso@example.com',
    displayName: 'SSO User',
    emailVerified: null,
    image: null,
    role: 'public',
    passwordHash: null,
    entraId: null,
    authProvider: 'entra_id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function createMockPrisma(overrides: Record<string, unknown> = {}) {
    return {
      user: {
        create: vi.fn().mockResolvedValue(mockUser),
        findUnique: vi.fn().mockResolvedValue(mockUser),
        update: vi.fn().mockResolvedValue(mockUser),
        ...overrides,
      },
      account: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        delete: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      verificationToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    };
  }

  it('creates user normally when no conflict', async () => {
    const mockPrisma = createMockPrisma();
    const adapter = createPrismaAdapter(mockPrisma as never);

    const result = await adapter.createUser!({
      email: 'sso@example.com',
      emailVerified: null,
    });

    expect(result.email).toBe('sso@example.com');
    expect(result.name).toBe('SSO User');
    expect(mockPrisma.user.create).toHaveBeenCalledOnce();
  });

  it('catches P2002 and returns existing user on concurrent race', async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      { code: 'P2002', clientVersion: '7.5.0' }
    );

    const mockPrisma = createMockPrisma({
      create: vi.fn().mockRejectedValue(p2002Error),
      findUnique: vi.fn().mockResolvedValue(mockUser),
    });
    const adapter = createPrismaAdapter(mockPrisma as never);

    const result = await adapter.createUser!({
      email: 'sso@example.com',
      emailVerified: null,
    });

    expect(result.email).toBe('sso@example.com');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'sso@example.com' },
    });
  });

  it('re-throws non-P2002 Prisma errors', async () => {
    const otherError = new Error('Connection refused');
    const mockPrisma = createMockPrisma({
      create: vi.fn().mockRejectedValue(otherError),
    });
    const adapter = createPrismaAdapter(mockPrisma as never);

    await expect(
      adapter.createUser!({ email: 'sso@example.com', emailVerified: null })
    ).rejects.toThrow('Connection refused');
  });

  it('re-throws P2002 when findUnique returns null on retry', async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.5.0',
    });

    const mockPrisma = createMockPrisma({
      create: vi.fn().mockRejectedValue(p2002Error),
      findUnique: vi.fn().mockResolvedValue(null),
    });
    const adapter = createPrismaAdapter(mockPrisma as never);

    await expect(
      adapter.createUser!({ email: 'sso@example.com', emailVerified: null })
    ).rejects.toThrow('Unique constraint failed');
  });
});
