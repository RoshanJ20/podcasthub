/**
 * Progress API routes — get and mark episode completion.
 *
 * - GET: User's progress across all learning paths with graph and episode details.
 * - POST: Mark episode complete. Idempotent (upsert on unique [userId, episodeId]).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session-helpers';
import { ApiError, createErrorResponse, internalError, badRequest } from '@/lib/api/errors';
import { trackActivity } from '@/lib/analytics/track-activity';
import { z } from 'zod';

const markCompleteSchema = z.object({
  graphId: z.string().min(1),
  episodeId: z.string().min(1),
});

/**
 * Handles GET requests to retrieve the authenticated user's learning progress.
 *
 * Returns all progress records for the user, including related graph and episode
 * details, ordered by most recently completed first.
 *
 * @param request - The incoming Next.js request object
 * @returns JSON response with an array of progress records including graph and episode data
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const progress = await prisma.userProgress.findMany({
      where: { userId: user.userId },
      include: {
        graph: { select: { id: true, title: true } },
        episode: { select: { id: true, title: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    return NextResponse.json({ data: progress });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
}

/**
 * Handles POST requests to mark an episode as complete.
 *
 * Attempts to create a progress record; on a uniqueness violation (P2002) the
 * episode is already complete and the existing record is returned with status
 * 200. A `complete_episode` UserActivity row is emitted only on first
 * completion so the activity stream cleanly distinguishes new completions
 * from idempotent re-marks.
 *
 * @param request - The incoming Next.js request object with graphId and episodeId in the body
 * @returns JSON response with the progress record (201 on first completion, 200 on re-mark)
 * @throws {ApiError} 400 if the progress data fails schema validation
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = markCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(badRequest('Invalid progress data', parsed.error.flatten()));
    }

    const { graphId, episodeId } = parsed.data;

    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, graphId: true },
    });
    if (!episode) {
      return createErrorResponse(badRequest('Episode not found'));
    }
    if (episode.graphId !== graphId) {
      return createErrorResponse(badRequest('Episode does not belong to the specified graph'));
    }

    try {
      const progress = await prisma.userProgress.create({
        data: {
          userId: user.userId,
          graphId,
          episodeId,
        },
      });

      await trackActivity({
        userId: user.userId,
        activityType: 'complete_episode',
        graphId,
        episodeId,
      });

      return NextResponse.json({ data: progress }, { status: 201 });
    } catch (createError) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === 'P2002'
      ) {
        /* Episode already complete — preserve idempotency without re-emitting. */
        const existing = await prisma.userProgress.findUnique({
          where: { userId_episodeId: { userId: user.userId, episodeId } },
        });
        return NextResponse.json({ data: existing }, { status: 200 });
      }
      throw createError;
    }
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
}
