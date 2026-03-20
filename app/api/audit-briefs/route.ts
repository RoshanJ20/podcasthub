/**
 * Audit brief list and creation API routes.
 *
 * @route GET  /api/audit-briefs — Paginated audit brief listing with filtering and sorting
 * @route POST /api/audit-briefs — Create a new audit brief (admin/superadmin only)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import { ApiError, createErrorResponse, badRequest, internalError } from '@/lib/api/errors';
import { createAuditBriefSchema } from '@/lib/schemas/audit-brief';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

/**
 * Retrieves a paginated list of non-archived auditBriefs.
 *
 * Supports query parameters:
 * - page, limit: pagination controls
 * - domain: filter by knowledge domain
 * - year: filter by publication year
 * - tags: comma-separated list; matches audit briefs containing any of the given tags
 * - sort: "newest" (default), "oldest", or "title"
 *
 * @param request - The incoming Next.js request
 * @returns Paginated JSON response with audit brief data and metadata
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePaginationParams(url);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { isArchived: false };

    const domain = url.searchParams.get('domain');
    if (domain) {
      where.domain = domain;
    }

    const yearParam = url.searchParams.get('year');
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        where.year = year;
      }
    }

    const tagsParam = url.searchParams.get('tags');
    if (tagsParam) {
      const tags = tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        where.tags = { hasSome: tags };
      }
    }

    // Build orderBy clause
    const sort = url.searchParams.get('sort') || 'newest';
    let orderBy: Record<string, string>;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'title':
        orderBy = { title: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [data, total] = await Promise.all([
      prisma.auditBrief.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.auditBrief.count({ where }),
    ]);

    return NextResponse.json(createPaginatedResponse(data, { page, limit, total }));
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}

/**
 * Creates a new auditBrief.
 *
 * Requires authentication with admin or superadmin role.
 * Validates the request body against createAuditBriefSchema.
 *
 * @param request - The incoming Next.js request with audit brief data in the body
 * @returns 201 JSON response with the created audit brief
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuth(request);
    requireRole(user, ['admin', 'superadmin']);

    const body = await request.json();
    const result = createAuditBriefSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(badRequest('Validation failed', result.error.flatten()));
    }

    const auditBrief = await prisma.auditBrief.create({
      // WORKAROUND(team): Prisma type inference requires explicit cast for multi-table upsert payload — see TODO #tech-debt
      // TODO(team): Replace with proper Prisma input type once schema types are exported
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: result.data as any,
    });

    return NextResponse.json({ data: auditBrief }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(internalError());
  }
}
