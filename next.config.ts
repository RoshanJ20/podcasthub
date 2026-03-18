/**
 * Next.js configuration for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
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
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://unpkg.com; font-src 'self' data:; worker-src 'self' blob: https://unpkg.com;",
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    middlewareClientMaxBodySize: '20mb',
  },
  images: {
    dangerouslyAllowSVG: true,
    localPatterns: [
      {
        pathname: '/api/media/**',
        search: '',
      },
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '10000',
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
  turbopack: {},
};

export default nextConfig;
