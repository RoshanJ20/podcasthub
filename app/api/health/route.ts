/**
 * Health check endpoint for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Returns liveness status for container orchestrators and load balancers
 * - Includes app version and timestamp for debugging
 *
 * @route GET /api/health
 * @returns { status: 'ok', timestamp: ISO string, version: string }
 */
import { NextResponse } from 'next/server';

/**
 * Handles GET requests to check application liveness.
 *
 * @returns JSON response with status, timestamp, and version
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
}
