/**
 * Learning Graph Favorites API routes — list and toggle favorites for learning series.
 *
 * - GET: Returns the authenticated user's favorited learning graph IDs as a flat array.
 * - POST: Toggles a favorite — adds it if it does not exist, removes it if it does.
 *   Emits a `favorite` or `unfavorite` UserActivity row on every toggle branch
 *   (including P2025/P2002 race recovery) so the activity stream preserves
 *   intent regardless of race outcome.
 *
 * @dependencies prisma, requireAuth, trackActivity, ApiError utilities
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth/session-helpers';
import { ApiError, createErrorResponse, internalError, badRequest } from '@/lib/api/errors';
import { trackActivity } from '@/lib/analytics/track-activity';

/**
 * Handles GET requests to retrieve the authenticated user's favorited learning graph IDs.
 *
 * Returns a flat array of learning graph IDs (not paginated) because a user's favorites
 * list is expected to remain small and is typically loaded once on the client for
 * immediate UI state hydration (e.g. pre-filling heart icons).
 *
 * @param request - The incoming Next.js request object
 * @returns JSON response `{ data: string[] }` — array of favorited learning graph IDs
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const favorites = await prisma.learningGraphFavorite.findMany({
      where: { userId: user.userId },
      select: { learningGraphId: true },
    });

    const ids = favorites.map((f) => f.learningGraphId);

    return NextResponse.json({ data: ids });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
}

/**
 * Handles POST requests to toggle a favorite on a learning graph.
 *
 * Implements an idempotent toggle: if the favorite already exists it is deleted
 * and `{ favorited: false }` is returned; if it does not exist it is created and
 * `{ favorited: true }` is returned with HTTP 201.
 *
 * @param request - The incoming Next.js request object with `{ learningGraphId: string }` body
 * @returns JSON response `{ data: { favorited: boolean } }`, 201 on creation, 200 on removal
 * @throws {ApiError} 400 if learningGraphId is missing or not a non-empty string
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { learningGraphId } = body as { learningGraphId?: unknown };

    if (typeof learningGraphId !== 'string' || learningGraphId.trim() === '') {
      return createErrorResponse(badRequest('learningGraphId must be a non-empty string'));
    }

    const emit = async (activityType: 'favorite' | 'unfavorite') => {
      await trackActivity({
        userId: user.userId,
        activityType,
        graphId: learningGraphId,
      });
    };

    try {
      const existing = await prisma.learningGraphFavorite.findUnique({
        where: { userId_learningGraphId: { userId: user.userId, learningGraphId } },
      });

      if (existing) {
        await prisma.learningGraphFavorite.delete({
          where: { userId_learningGraphId: { userId: user.userId, learningGraphId } },
        });
        await emit('unfavorite');
        return NextResponse.json({ data: { favorited: false } });
      }

      await prisma.learningGraphFavorite.create({
        data: { userId: user.userId, learningGraphId },
      });
      await emit('favorite');
      return NextResponse.json({ data: { favorited: true } }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          await emit('unfavorite');
          return NextResponse.json({ data: { favorited: false } });
        }
        if (error.code === 'P2002') {
          await emit('favorite');
          return NextResponse.json({ data: { favorited: true } });
        }
      }
      throw error;
    }
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
}
