/**
 * Single learning graph API routes for retrieval, update, and deletion.
 *
 * @route GET    /api/learning-graphs/[id] — Get a single graph with episodes and edges
 * @route PUT    /api/learning-graphs/[id] — Update a graph (admin/superadmin)
 * @route DELETE /api/learning-graphs/[id] — Delete a graph (admin/superadmin)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, createErrorResponse, notFound, internalError } from '@/lib/api/errors';
import { updateLearningGraphSchema } from '@/lib/schemas/learning-graph';
import { requireAuth, requireRole, getAuthUser } from '@/lib/auth/api-helpers';

/** Route context providing the learning graph ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Retrieves a single learning graph by ID with episodes and edges.
 *
 * Public users can only see published graphs.
 * Admin/superadmin users can see unpublished graphs.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the graph ID
 * @returns JSON response with the graph data or 404 if not found
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const user = getAuthUser(request);
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const graph = await prisma.learningGraph.findUnique({
      where: { id },
      include: { episodes: true, edges: true },
    });

    if (!graph) {
      return createErrorResponse(notFound('Learning graph'));
    }

    if (!graph.isPublished && !isAdmin) {
      return createErrorResponse(notFound('Learning graph'));
    }

    return NextResponse.json({ data: graph });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Updates an existing learning graph by ID.
 *
 * Requires authentication with admin or superadmin role.
 * Validates the request body against updateLearningGraphSchema.
 * Also accepts isPublished boolean for publish/unpublish.
 *
 * @param request - The incoming Next.js request with update data
 * @param context - Route context containing the graph ID
 * @returns JSON response with the updated graph
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;
    const body = await request.json();

    // Extract isPublished separately since it's not in the creation schema
    const { isPublished, ...rest } = body;

    // Validate the schema fields if any are present
    if (Object.keys(rest).length > 0) {
      const result = updateLearningGraphSchema.safeParse(rest);
      if (!result.success) {
        return createErrorResponse(
          new ApiError(400, 'BAD_REQUEST' as never, 'Validation failed', result.error.flatten())
        );
      }
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (typeof isPublished === 'boolean') {
      updateData.isPublished = isPublished;
    }

    const graph = await prisma.learningGraph.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: graph });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Deletes a learning graph by ID (cascades to episodes and edges).
 *
 * Requires authentication with admin or superadmin role.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the graph ID
 * @returns JSON response confirming the deletion
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;

    try {
      await prisma.learningGraph.delete({ where: { id } });
      return NextResponse.json({ message: 'Learning graph deleted successfully' });
    } catch {
      return createErrorResponse(notFound('Learning graph'));
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
