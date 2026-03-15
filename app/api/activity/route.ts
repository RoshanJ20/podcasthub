/**
 * Activity logging API route — fire-and-forget activity logging.
 *
 * - POST: Log user activity. Returns 201 immediately.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { ApiError, createErrorResponse, internalError, badRequest } from '@/lib/api/errors';
import { z } from 'zod';

const VALID_ACTIVITY_TYPES = [
  'listen',
  'bookmark',
  'complete_episode',
  'view_path',
  'search',
] as const;

const activitySchema = z.object({
  activityType: z.enum(VALID_ACTIVITY_TYPES),
  podcastId: z.string().optional(),
  episodeId: z.string().optional(),
  graphId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();

    const parsed = activitySchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(badRequest('Invalid activity data', parsed.error.flatten()));
    }

    const { activityType, podcastId, episodeId, graphId, metadata } = parsed.data;

    // Fire-and-forget: we don't await this in production, but for testability we do
    await prisma.userActivity.create({
      data: {
        userId: user.userId,
        activityType,
        podcastId: podcastId ?? null,
        episodeId: episodeId ?? null,
        graphId: graphId ?? null,
        metadata: metadata ?? {},
      },
    });

    return NextResponse.json(null, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}
