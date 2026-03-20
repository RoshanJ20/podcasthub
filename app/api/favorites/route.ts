/**
 * Favorites API routes — list and toggle favorites for audit briefs.
 *
 * - GET: Returns the authenticated user's favorited audit brief IDs as a flat array.
 * - POST: Toggles a favorite — adds it if it does not exist, removes it if it does.
 *
 * @dependencies prisma, requireAuth, ApiError utilities
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { ApiError, createErrorResponse, internalError, badRequest } from '@/lib/api/errors';

/**
 * Handles GET requests to retrieve the authenticated user's favorited audit brief IDs.
 *
 * Returns a flat array of audit brief IDs (not paginated) because a user's favorites
 * list is expected to remain small and is typically loaded once on the client for
 * immediate UI state hydration (e.g. pre-filling heart icons).
 *
 * @param request - The incoming Next.js request object
 * @returns JSON response `{ data: string[] }` — array of favorited audit brief IDs
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.userId },
      select: { auditBriefId: true },
    });

    const ids = favorites.map((f) => f.auditBriefId);

    return NextResponse.json({ data: ids });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}

/**
 * Handles POST requests to toggle a favorite on an audit brief.
 *
 * Implements an idempotent toggle: if the favorite already exists it is deleted
 * and `{ favorited: false }` is returned; if it does not exist it is created and
 * `{ favorited: true }` is returned with HTTP 201.
 *
 * @param request - The incoming Next.js request object with `{ auditBriefId: string }` body
 * @returns JSON response `{ data: { favorited: boolean } }`, 201 on creation, 200 on removal
 * @throws {ApiError} 400 if auditBriefId is missing or not a non-empty string
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();

    const { auditBriefId } = body as { auditBriefId?: unknown };

    // Validate that auditBriefId is present and is a non-empty string
    if (typeof auditBriefId !== 'string' || auditBriefId.trim() === '') {
      return createErrorResponse(badRequest('auditBriefId must be a non-empty string'));
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_auditBriefId: { userId: user.userId, auditBriefId } },
    });

    if (existing) {
      // Favorite exists — remove it
      await prisma.favorite.delete({
        where: { userId_auditBriefId: { userId: user.userId, auditBriefId } },
      });

      return NextResponse.json({ data: { favorited: false } });
    }

    // Favorite does not exist — create it
    await prisma.favorite.create({
      data: { userId: user.userId, auditBriefId },
    });

    return NextResponse.json({ data: { favorited: true } }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}
