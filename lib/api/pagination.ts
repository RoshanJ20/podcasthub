/**
 * Pagination utilities for API route handlers in The Audit Brief.
 *
 * Key responsibilities:
 * - Parses page/limit query parameters from URL with safe defaults and clamping
 * - Builds standardized paginated response objects with metadata
 *
 * @example
 * import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
 *
 * export async function GET(request: Request) {
 *   const url = new URL(request.url);
 *   const { page, limit } = parsePaginationParams(url);
 *   const skip = (page - 1) * limit;
 *
 *   const [data, total] = await Promise.all([
 *     prisma.auditBrief.findMany({ skip, take: limit }),
 *     prisma.auditBrief.count(),
 *   ]);
 *
 *   return NextResponse.json(createPaginatedResponse(data, { page, limit, total }));
 * }
 */

/** Default number of items per page when no limit is specified */
const DEFAULT_PAGE = 1;

/** Default number of items per page */
const DEFAULT_LIMIT = 20;

/** Minimum allowed value for the limit parameter */
const MIN_LIMIT = 1;

/** Maximum allowed value for the limit parameter */
const MAX_LIMIT = 100;

/**
 * Parsed pagination parameters extracted from URL query strings.
 */
export interface PaginationParams {
  /** Current page number (1-indexed, always >= 1) */
  page: number;
  /** Number of items per page (clamped between 1 and 100) */
  limit: number;
}

/**
 * Standardized paginated response wrapper for list endpoints.
 *
 * @typeParam T - The type of items in the data array
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page number */
    page: number;
    /** Number of items per page */
    limit: number;
    /** Total number of items across all pages */
    total: number;
    /** Total number of pages (Math.ceil(total / limit), or 0 if total is 0) */
    total_pages: number;
  };
}

/**
 * Parses pagination parameters from a URL's query string.
 *
 * Extracts `page` and `limit` search params, applies defaults for missing
 * or non-numeric values, and clamps values to safe ranges:
 * - page: minimum 1 (defaults to 1)
 * - limit: clamped to [1, 100] (defaults to 20)
 *
 * @param url - The URL object to extract query parameters from
 * @returns Parsed and validated pagination parameters
 */
export function parsePaginationParams(url: URL): PaginationParams {
  const rawPage = url.searchParams.get('page');
  const rawLimit = url.searchParams.get('limit');

  // Parse page, falling back to default for NaN, missing, or empty values
  let page = rawPage !== null && rawPage !== '' ? Number(rawPage) : DEFAULT_PAGE;
  if (Number.isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  // Parse limit, falling back to default for NaN, missing, or empty values
  let limit = rawLimit !== null && rawLimit !== '' ? Number(rawLimit) : DEFAULT_LIMIT;
  if (Number.isNaN(limit)) {
    limit = DEFAULT_LIMIT;
  }

  // Clamp limit to allowed range
  limit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, limit));

  return { page: Math.floor(page), limit: Math.floor(limit) };
}

/**
 * Builds a standardized paginated response object.
 *
 * Calculates `total_pages` using Math.ceil(total / limit), returning 0
 * when total is 0 to avoid division artifacts.
 *
 * @typeParam T - The type of items in the data array
 * @param data - Array of items for the current page
 * @param opts - Pagination options containing page, limit, and total count
 * @param opts.page - Current page number
 * @param opts.limit - Items per page
 * @param opts.total - Total item count across all pages
 * @returns A PaginatedResponse with data and pagination metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  opts: { page: number; limit: number; total: number }
): PaginatedResponse<T> {
  const { page, limit, total } = opts;

  // Avoid division by zero; when total is 0, total_pages should also be 0
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
}
