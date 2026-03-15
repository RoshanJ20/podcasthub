/**
 * Prisma client singleton for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Provides a single PrismaClient instance across the application
 * - Prevents connection exhaustion in development (Next.js hot reloading)
 * - Configures query logging per environment
 *
 * @example
 * import { prisma } from '@/lib/db';
 * const podcasts = await prisma.podcast.findMany();
 */
import { PrismaClient } from '@/lib/generated/prisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
