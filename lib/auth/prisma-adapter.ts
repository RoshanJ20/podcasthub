/**
 * Custom NextAuth Prisma adapter for The Audit Brief.
 *
 * Key responsibilities:
 * - Wraps @next-auth/prisma-adapter to map NextAuth's `name` field to our `displayName` column
 * - Avoids renaming the database column and breaking existing queries
 *
 * Dependencies:
 * - @next-auth/prisma-adapter (PrismaAdapter)
 * - @prisma/client (PrismaClient)
 */
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { PrismaClient } from '@prisma/client';
import type { Adapter, AdapterUser } from 'next-auth/adapters';

/**
 * Creates a custom Prisma adapter that maps NextAuth's `name` property
 * to the `displayName` column in the database.
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
      const user = await prisma.user.create({
        data: {
          email: data.email,
          displayName: data.name ?? null,
          emailVerified: data.emailVerified,
          image: data.image ?? null,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        displayName: user.displayName,
      } as AdapterUser;
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        displayName: user.displayName,
      } as AdapterUser;
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        displayName: user.displayName,
      } as AdapterUser;
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

      const user = account.user;
      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        displayName: user.displayName,
      } as AdapterUser;
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

      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        displayName: user.displayName,
      } as AdapterUser;
    },
  };
}
