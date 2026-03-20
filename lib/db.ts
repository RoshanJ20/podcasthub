/**
 * Prisma client singleton for The Audit Brief.
 *
 * Key responsibilities:
 * - Provides a single PrismaClient instance across the application
 * - Prevents connection exhaustion in development (Next.js hot reloading)
 * - Configures the PostgreSQL driver adapter for Prisma v7
 * - Instruments all queries with slow query detection via $extends
 *
 * @example
 * import { prisma } from '@/lib/db';
 * const auditBriefs = await prisma.auditBrief.findMany();
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createLogger } from '@/lib/logger';
import { logSlowQuery } from '@/lib/db-instrumentation';

const slowQueryLog = createLogger('prisma-slow-query');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  // @ts-expect-error — pg Pool type mismatch between @types/pg and @prisma/adapter-pg
  const adapter = new PrismaPg(pool);
  const baseClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  // Wrap all model operations to detect and log slow queries
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const durationMs = Math.round(performance.now() - start);
          logSlowQuery(model ?? 'unknown', operation, durationMs, slowQueryLog);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
  // Type assertion: $extends returns an extended client type, but consumers
  // expect PrismaClient. The extended client is a superset, so this is safe.
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
