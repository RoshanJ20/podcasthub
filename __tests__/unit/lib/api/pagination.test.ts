/**
 * Unit tests for the pagination utility module.
 *
 * Key responsibilities:
 * - Verifies default pagination params when none are provided
 * - Verifies correct parsing of valid page/limit query params
 * - Verifies clamping of out-of-range values
 * - Verifies graceful handling of non-numeric values
 * - Verifies correct total_pages calculation including edge cases
 */
import { describe, it, expect } from 'vitest';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import type { PaginatedResponse } from '@/lib/api/pagination';

describe('parsePaginationParams', () => {
  it('returns default page=1 and limit=20 when no params provided', () => {
    const url = new URL('https://example.com/api/podcasts');
    const params = parsePaginationParams(url);

    expect(params.page).toBe(1);
    expect(params.limit).toBe(20);
  });

  it('parses valid page and limit from URL params', () => {
    const url = new URL('https://example.com/api/podcasts?page=3&limit=50');
    const params = parsePaginationParams(url);

    expect(params.page).toBe(3);
    expect(params.limit).toBe(50);
  });

  it('clamps negative page to 1', () => {
    const url = new URL('https://example.com/api/podcasts?page=-5&limit=10');
    const params = parsePaginationParams(url);

    expect(params.page).toBe(1);
  });

  it('clamps page=0 to 1', () => {
    const url = new URL('https://example.com/api/podcasts?page=0');
    const params = parsePaginationParams(url);

    expect(params.page).toBe(1);
  });

  it('clamps limit below 1 to 1', () => {
    const url = new URL('https://example.com/api/podcasts?limit=0');
    const params = parsePaginationParams(url);

    expect(params.limit).toBe(1);
  });

  it('clamps limit above 100 to 100', () => {
    const url = new URL('https://example.com/api/podcasts?limit=500');
    const params = parsePaginationParams(url);

    expect(params.limit).toBe(100);
  });

  it('handles non-numeric page gracefully by defaulting to 1', () => {
    const url = new URL('https://example.com/api/podcasts?page=abc');
    const params = parsePaginationParams(url);

    expect(params.page).toBe(1);
  });

  it('handles non-numeric limit gracefully by defaulting to 20', () => {
    const url = new URL('https://example.com/api/podcasts?limit=xyz');
    const params = parsePaginationParams(url);

    expect(params.limit).toBe(20);
  });

  it('handles empty string params by using defaults', () => {
    const url = new URL('https://example.com/api/podcasts?page=&limit=');
    const params = parsePaginationParams(url);

    expect(params.page).toBe(1);
    expect(params.limit).toBe(20);
  });
});

describe('createPaginatedResponse', () => {
  it('builds a paginated response with correct structure', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const response = createPaginatedResponse(data, {
      page: 1,
      limit: 10,
      total: 25,
    });

    expect(response.data).toEqual(data);
    expect(response.pagination.page).toBe(1);
    expect(response.pagination.limit).toBe(10);
    expect(response.pagination.total).toBe(25);
    expect(response.pagination.total_pages).toBe(3);
  });

  it('calculates total_pages with rounding up', () => {
    const response = createPaginatedResponse([], {
      page: 1,
      limit: 10,
      total: 21,
    });

    expect(response.pagination.total_pages).toBe(3);
  });

  it('calculates total_pages for exact division', () => {
    const response = createPaginatedResponse([], {
      page: 1,
      limit: 10,
      total: 30,
    });

    expect(response.pagination.total_pages).toBe(3);
  });

  it('returns total_pages=0 when total is 0', () => {
    const response = createPaginatedResponse([], {
      page: 1,
      limit: 20,
      total: 0,
    });

    expect(response.pagination.total_pages).toBe(0);
    expect(response.data).toEqual([]);
  });

  it('returns total_pages=1 when total is less than limit', () => {
    const response = createPaginatedResponse([{ id: 1 }], {
      page: 1,
      limit: 20,
      total: 5,
    });

    expect(response.pagination.total_pages).toBe(1);
  });

  it('preserves generic type in data array', () => {
    interface Podcast {
      id: string;
      title: string;
    }

    const data: Podcast[] = [
      { id: '1', title: 'Episode 1' },
      { id: '2', title: 'Episode 2' },
    ];

    const response: PaginatedResponse<Podcast> = createPaginatedResponse(data, {
      page: 2,
      limit: 2,
      total: 10,
    });

    expect(response.data).toEqual(data);
    expect(response.pagination.page).toBe(2);
    expect(response.pagination.total_pages).toBe(5);
  });
});
