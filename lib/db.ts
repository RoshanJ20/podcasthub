/**
 * Prisma client singleton for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Provides a single PrismaClient instance across the application
 * - Prevents connection exhaustion in development (Next.js hot reloading)
 * - Configures the PostgreSQL driver adapter for Prisma v7
 *
 * @example
 * import { prisma } from '@/lib/db';
 * const podcasts = await prisma.podcast.findMany();
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  // @ts-expect-error — pg Pool type mismatch between @types/pg and @prisma/adapter-pg
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
