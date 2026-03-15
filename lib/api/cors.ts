/**
 * CORS helper utilities for API route handlers.
 *
 * Key responsibilities:
 * - Adds CORS headers to API responses (origin, methods, headers, credentials)
 * - Handles OPTIONS preflight requests with a 204 No Content response
 *
 * The allowed origin defaults to NEXT_PUBLIC_APP_URL or http://localhost:3000.
 *
 * Dependencies:
 * - next/server (NextResponse)
 *
 * @example
 * import { withCors, handleCorsPreflight } from '@/lib/api/cors';
 *
 * export async function GET() {
 *   return withCors(NextResponse.json({ ok: true }));
 * }
 *
 * export async function OPTIONS() {
 *   return handleCorsPreflight();
 * }
 */
import { NextResponse } from 'next/server';

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Adds CORS headers to an existing NextResponse.
 *
 * @param response - The response to add CORS headers to
 * @returns The same response with CORS headers set
 */
export function withCors(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

/**
 * Creates a 204 No Content response with CORS headers for OPTIONS preflight requests.
 *
 * @returns A NextResponse with status 204 and all required CORS headers
 */
export function handleCorsPreflight(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response);
}
