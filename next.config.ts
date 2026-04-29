/**
 * Next.js configuration for The Audit Brief.
 *
 * Key responsibilities:
 * - Security headers (HSTS, X-Frame-Options, etc.) applied globally.
 *   The Content-Security-Policy is intentionally NOT defined here — it is
 *   built per-request in `middleware.ts` because it must carry a fresh
 *   nonce on every response (see `lib/security/csp.ts`).
 * - Image optimization remote patterns for Azurite/Azure Blob Storage
 * - Webpack config for react-pdf compatibility
 */
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '/auditbrief',
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  // Pino's pretty transport spawns a worker_threads worker that requires
  // `pino/lib/worker.js` at runtime via thread-stream. If webpack bundles
  // these into `.next/server/vendor-chunks/`, the `require()` path breaks.
  // Marking them external keeps them in node_modules where the worker resolver
  // can find them.
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    localPatterns: [
      {
        // Includes the basePath prefix because Next.js matches the full URL
        // (with basePath) against this pattern. `search` is intentionally
        // omitted so any `?key=<dynamic>` query string is allowed.
        pathname: '/auditbrief/api/media',
      },
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '10000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
        pathname: '/**',
      },
    ],
    // Allow localhost images in development (private IP)
    ...(process.env.NODE_ENV === 'development' ? { unoptimized: true } : {}),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
