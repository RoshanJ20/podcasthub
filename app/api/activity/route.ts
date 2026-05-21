/**
 * Activity logging API route — fire-and-forget activity logging.
 *
 * - POST: Log user activity. Returns 201 immediately. Validation is delegated
 *   to the discriminated-union schema in `lib/schemas/activity.ts`; the row is
 *   persisted via the shared `trackActivity` helper so all writes go through
 *   the same composition point used by server-side emissions.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session-helpers';
import { ApiError, createErrorResponse, internalError, badRequest } from '@/lib/api/errors';
import { activityRequestSchema } from '@/lib/schemas/activity';
import { trackActivity } from '@/lib/analytics/track-activity';

/**
 * Handles POST requests to log user activity.
 *
 * Validates the request body against the discriminated `activityRequestSchema`,
 * which enforces the correct metadata shape for each activity type, then
 * persists the row via the non-throwing `trackActivity` helper.
 *
 * @param request - The incoming Next.js request object containing activity data
 * @returns JSON response with null body and 201 status on success
 * @throws {ApiError} 400 if the activity data fails schema validation
 * @throws {ApiError} 401 if the user is not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = activityRequestSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(badRequest('Invalid activity data', parsed.error.flatten()));
    }

    const { activityType, auditBriefId, episodeId, graphId, metadata } = parsed.data;

    await trackActivity({
      userId: user.userId,
      activityType,
      auditBriefId: auditBriefId ?? null,
      episodeId: episodeId ?? null,
      graphId: graphId ?? null,
      metadata: metadata ?? {},
    });

    return NextResponse.json(null, { status: 201 });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) return createErrorResponse(error, requestId);
    return createErrorResponse(internalError(), requestId);
  }
}
