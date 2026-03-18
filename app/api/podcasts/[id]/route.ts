/**
 * Single podcast API routes for retrieval, update, and deletion.
 *
 * @route GET    /api/podcasts/[id] — Get a single podcast with transcripts
 * @route PUT    /api/podcasts/[id] — Update a podcast (admin/superadmin)
 * @route DELETE /api/podcasts/[id] — Soft delete a podcast (superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  ApiError,
  createErrorResponse,
  notFound,
  badRequest,
  internalError,
} from '@/lib/api/errors';
import { updatePodcastSchema } from '@/lib/schemas/podcast';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

/** Route context providing the podcast ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Retrieves a single non-archived podcast by ID, including its transcripts.
 *
 * @param _request - The incoming Next.js request (unused)
 * @param context - Route context containing the podcast ID
 * @returns JSON response with the podcast data or 404 if not found
 */
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const podcast = await prisma.podcast.findFirst({
      where: { id, isArchived: false },
      include: { transcripts: true },
    });

    if (!podcast) {
      return createErrorResponse(notFound('Podcast'));
    }

    return NextResponse.json({ data: podcast });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Updates an existing podcast by ID.
 *
 * Requires authentication with admin or superadmin role.
 * Validates the request body against updatePodcastSchema (partial, at least one field).
 *
 * @param request - The incoming Next.js request with update data in the body
 * @param context - Route context containing the podcast ID
 * @returns JSON response with the updated podcast
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;
    const body = await request.json();
    const result = updatePodcastSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const podcast = await prisma.podcast.update({
      where: { id },
      // WORKAROUND(team): Prisma type inference requires explicit cast for multi-table upsert payload — see TODO #tech-debt
      // TODO(team): Replace with proper Prisma input type once schema types are exported
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: result.data as any,
    });

    return NextResponse.json({ data: podcast });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Soft deletes a podcast by setting isArchived to true.
 *
 * Requires authentication with superadmin role.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the podcast ID
 * @returns JSON response confirming the deletion
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['superadmin']);

    const { id } = await context.params;

    await prisma.podcast.update({
      where: { id },
      data: { isArchived: true },
    });

    return NextResponse.json({ message: 'Podcast archived successfully' });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
