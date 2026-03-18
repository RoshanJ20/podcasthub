/**
 * Readiness check endpoint for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Verifies database connectivity by executing a lightweight query
 * - Returns 200 when all dependencies are reachable (ready to serve traffic)
 * - Returns 503 when any dependency is unreachable (not ready)
 * - Used by container orchestrators and load balancers to determine traffic routing
 *
 * Unlike /api/health (liveness), this endpoint actively checks dependencies.
 * A passing liveness check with a failing readiness check means the process is
 * running but cannot serve requests — the orchestrator should stop routing traffic
 * but NOT restart the container.
 *
 * Dependencies:
 * - @/lib/db (prisma)
 * - @/lib/logger (createLogger)
 *
 * @route GET /api/ready
 * @returns { status: 'ready' | 'not_ready', checks: { database: 'ok' | 'failed' }, timestamp: string }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('readiness');

/**
 * Handles GET requests to check application readiness.
 *
 * Runs a lightweight `SELECT 1` query to verify database connectivity.
 * Returns 200 with check results on success, or 503 with failure details.
 *
 * @returns JSON response with readiness status and dependency check results
 */
export async function GET(): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    log.error({ error }, 'Readiness check failed');

    return NextResponse.json(
      {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'failed',
        },
      },
      { status: 503 }
    );
  }
}
