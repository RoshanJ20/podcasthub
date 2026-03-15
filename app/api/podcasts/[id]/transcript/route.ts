/**
 * Transcript API routes for a specific podcast.
 *
 * @route GET /api/podcasts/[id]/transcript — List transcripts for a podcast
 * @route PUT /api/podcasts/[id]/transcript — Upsert a transcript (admin/superadmin)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ApiError, createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

/** Route context providing the podcast ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Zod schema for transcript upsert request body.
 *
 * Validates:
 * - fullText: non-empty string
 * - segments: array of { start: number, end: number, text: string }
 * - transcriptType: "short" or "long"
 */
const upsertTranscriptSchema = z.object({
  /** Full transcript text. */
  fullText: z.string().min(1),
  /** Timed transcript segments. */
  segments: z.array(
    z.object({
      /** Start time in seconds. */
      start: z.number(),
      /** End time in seconds. */
      end: z.number(),
      /** Segment text content. */
      text: z.string(),
    })
  ),
  /** Transcript type: short or long. */
  transcriptType: z.enum(['short', 'long']),
});

/**
 * Retrieves all transcripts for a given podcast.
 *
 * @param _request - The incoming Next.js request (unused)
 * @param context - Route context containing the podcast ID
 * @returns JSON response with an array of transcripts
 */
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const transcripts = await prisma.transcript.findMany({
      where: { podcastId: id },
    });

    return NextResponse.json({ data: transcripts });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Upserts a transcript for a given podcast.
 *
 * Uses the unique constraint on [podcastId, transcriptType] for the upsert.
 * Requires authentication with admin or superadmin role.
 *
 * @param request - The incoming Next.js request with transcript data in the body
 * @param context - Route context containing the podcast ID
 * @returns JSON response with the upserted transcript
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;
    const body = await request.json();
    const result = upsertTranscriptSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const { fullText, segments, transcriptType } = result.data;

    const transcript = await prisma.transcript.upsert({
      where: {
        podcastId_transcriptType: {
          podcastId: id,
          transcriptType,
        },
      },
      update: { fullText, segments },
      create: {
        podcastId: id,
        fullText,
        segments,
        transcriptType,
      },
    });

    return NextResponse.json({ data: transcript });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
