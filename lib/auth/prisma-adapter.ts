/**
 * Custom NextAuth Prisma adapter for The Audit Brief.
 *
 * Key responsibilities:
 * - Wraps @next-auth/prisma-adapter to map NextAuth's `name` field to our `displayName` column
 * - Handles P2002 unique constraint violations in createUser for concurrent SSO race conditions
 * - Avoids renaming the database column and breaking existing queries
 *
 * Dependencies:
 * - @next-auth/prisma-adapter (PrismaAdapter)
 * - @prisma/client (PrismaClient, Prisma)
 * - @/lib/auth/prisma-adapter-utils (mapUserToAdapterUser)
 * - @/lib/logger (createLogger)
 */
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { Adapter } from 'next-auth/adapters';
import { mapUserToAdapterUser } from '@/lib/auth/prisma-adapter-utils';
import { createLogger } from '@/lib/logger';

const adapterLog = createLogger('prisma-adapter');

/**
 * Creates a custom Prisma adapter that maps NextAuth's `name` property
 * to the `displayName` column in the database. Handles P2002 unique
 * constraint violations in createUser for concurrent SSO login race conditions.
 *
 * @param prisma - The Prisma client instance.
 * @returns An Adapter compatible with NextAuth v4.
 */
export function createPrismaAdapter(prisma: PrismaClient): Adapter {
  const baseAdapter = PrismaAdapter(prisma);

  return {
    ...baseAdapter,

    async createUser(data: {
      name?: string | null;
      email: string;
      emailVerified?: Date | null;
      image?: string | null;
    }) {
      try {
        const user = await prisma.user.create({
          data: {
            email: data.email,
            displayName: data.name ?? null,
            emailVerified: data.emailVerified,
            image: data.image ?? null,
          },
        });

        return mapUserToAdapterUser(user);
      } catch (error) {
        // P2002: unique constraint violation — a concurrent request already
        // created this user (SSO race condition with multiple tabs).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          adapterLog.warn(
            { email: data.email },
            'User already exists (concurrent P2002) — returning existing user'
          );

          const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
          });

          if (!existingUser) {
            adapterLog.error(
              { email: data.email },
              'P2002 caught but user not found on retry lookup'
            );
            throw error;
          }

          return mapUserToAdapterUser(existingUser);
        }

        throw error;
      }
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;

      return mapUserToAdapterUser(user);
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;

      return mapUserToAdapterUser(user);
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: { user: true },
      });

      if (!account?.user) return null;

      return mapUserToAdapterUser(account.user);
    },

    async updateUser(data) {
      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.displayName = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;
      if (data.image !== undefined) updateData.image = data.image;

      const user = await prisma.user.update({
        where: { id: data.id },
        data: updateData,
      });

      return mapUserToAdapterUser(user);
    },
  };
}
