/**
 * Progress API routes — get and mark episode completion.
 *
 * - GET: User's progress across all learning paths with graph and episode details.
 * - POST: Mark episode complete. Idempotent (upsert on unique [userId, episodeId]).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/api-helpers';
import { ApiError, createErrorResponse, internalError, badRequest } from '@/lib/api/errors';
import { z } from 'zod';

const markCompleteSchema = z.object({
  graphId: z.string().min(1),
  episodeId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

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
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();

    const parsed = markCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(badRequest('Invalid progress data', parsed.error.flatten()));
    }

    const { graphId, episodeId } = parsed.data;

    const progress = await prisma.userProgress.upsert({
      where: {
        userId_episodeId: {
          userId: user.userId,
          episodeId,
        },
      },
      create: {
        userId: user.userId,
        graphId,
        episodeId,
      },
      update: {},
    });

    return NextResponse.json({ data: progress }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return createErrorResponse(error);
    return createErrorResponse(internalError());
  }
}
