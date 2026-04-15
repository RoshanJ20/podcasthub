/**
 * Transcript API routes for a specific auditBrief.
 *
 * Key responsibilities:
 * - GET returns all transcripts for a brief.
 * - PUT upserts the transcript for a given transcriptType, then regenerates
 *   the pgvector embedding against the new fullText so semantic search
 *   stays in sync. Embedding failures are logged but do not fail the mutation.
 *
 * Embedding regeneration uses Prisma's raw SQL interface because the
 * `embedding` column is `Unsupported("vector(1536)")` in the Prisma schema.
 *
 * @route GET /api/audit-briefs/[id]/transcript — List transcripts for an audit brief
 * @route PUT /api/audit-briefs/[id]/transcript — Upsert a transcript (admin/superadmin)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  ApiError,
  createErrorResponse,
  badRequest,
  notFound,
  internalError,
} from '@/lib/api/errors';
import { requireAuth, requireRole } from '@/lib/auth/session-helpers';
import { generateEmbedding } from '@/lib/embeddings';
import { writeAuditLog } from '@/lib/admin/audit-log';
import { revalidateAuditBrief } from '@/lib/admin/revalidate';
import { createRequestLogger } from '@/lib/logger';

/** Route context providing the audit brief ID path parameter. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Zod schema for transcript upsert request body.
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
 * Retrieves all transcripts for a given auditBrief.
 *
 * @param request - The incoming Next.js request
 * @param context - Route context containing the audit brief ID
 * @returns JSON response with an array of transcripts
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const transcripts = await prisma.transcript.findMany({
      where: { auditBriefId: id },
    });

    return NextResponse.json({ data: transcripts });
  } catch (error) {
    const requestId = request.headers.get('x-request-id') ?? undefined;
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    return createErrorResponse(internalError(), requestId);
  }
}

/**
 * Upserts a transcript for a given auditBrief and regenerates its embedding.
 *
 * Uses the unique constraint on [auditBriefId, transcriptType] for the upsert.
 * After the upsert commits, the pgvector embedding is regenerated against
 * the new fullText. Embedding failures are logged at warn level but do not
 * fail the mutation — admins can still fix typos during an Azure OpenAI outage.
 *
 * Requires authentication with admin or superadmin role.
 *
 * @param request - The incoming Next.js request with transcript data in the body
 * @param context - Route context containing the audit brief ID
 * @returns JSON response with the upserted transcript
 */
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const log = createRequestLogger('audit-briefs-transcript-api', request);
  const requestId = request.headers.get('x-request-id') ?? undefined;

  try {
    const user = await requireAuth();
    requireRole(user, ['admin', 'superadmin']);

    const { id } = await context.params;
    const body = await request.json();
    const result = upsertTranscriptSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const { fullText, segments, transcriptType } = result.data;

    const auditBrief = await prisma.auditBrief.findUnique({
      where: { id, isArchived: false },
      select: { id: true },
    });
    if (!auditBrief) {
      return createErrorResponse(notFound('AuditBrief'));
    }

    const existing = await prisma.transcript.findUnique({
      where: { auditBriefId_transcriptType: { auditBriefId: id, transcriptType } },
    });

    const transcript = await prisma.transcript.upsert({
      where: {
        auditBriefId_transcriptType: {
          auditBriefId: id,
          transcriptType,
        },
      },
      update: { fullText, segments },
      create: {
        auditBriefId: id,
        fullText,
        segments,
        transcriptType,
      },
    });

    // Regenerate the pgvector embedding so /api/search stays in sync with the
    // new transcript text. Failure here is non-fatal — the row is already saved.
    try {
      const embedding = await generateEmbedding(fullText);
      const vectorLiteral = `[${embedding.join(',')}]`;
      await prisma.$executeRaw`UPDATE transcripts SET embedding = ${vectorLiteral}::vector WHERE id = ${transcript.id}::uuid`;
    } catch (embeddingError) {
      log.warn(
        {
          err: embeddingError,
          transcript_id: transcript.id,
          audit_brief_id: id,
          transcript_type: transcriptType,
        },
        'Embedding regeneration failed; transcript text saved but semantic search may be stale'
      );
    }

    await writeAuditLog({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'transcript_update',
      entityType: 'transcript',
      entityId: transcript.id,
      before: existing,
      after: transcript,
      requestId,
      log,
    });

    revalidateAuditBrief(id);

    return NextResponse.json({ data: transcript });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error, requestId);
    }
    log.error({ err: error }, 'Unhandled error upserting transcript');
    return createErrorResponse(internalError(), requestId);
  }
}
