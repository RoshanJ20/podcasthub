/**
 * Content Security Policy nonce generation and policy assembly.
 *
 * Key responsibilities:
 * - Generate a cryptographically-random per-request nonce.
 * - Assemble the strict, nonce-stamped CSP string applied to every response
 *   that renders HTML.
 *
 * Background:
 * Production nginx enforces a strict CSP with no `'unsafe-inline'` or
 * `'unsafe-eval'`. Next.js App Router cannot run under that policy without
 * nonces because it emits inline `<script>` tags for RSC streaming and
 * hydration, and inline `<style>` blocks for `next/font` `@font-face` rules.
 * The nonce-based pattern preserves the strictness VAPT required while
 * letting the framework's own inline content execute.
 *
 * @example
 * import { generateNonce, buildContentSecurityPolicy } from '@/lib/security/csp';
 * const nonce = generateNonce();
 * response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce));
 */

/**
 * Generates a cryptographically-random base64 nonce suitable for CSP.
 *
 * Uses the Web Crypto `randomUUID` already available in the Edge runtime
 * (the same primitive `middleware.ts` uses for request IDs), then strips
 * dashes and base64-encodes to keep the value compact and CSP-safe.
 *
 * @returns A 22-character URL-safe nonce string.
 */
export function generateNonce(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  // btoa on hex chars produces URL-safe characters; trim any trailing '='.
  return btoa(uuid).replace(/=+$/, '');
}

/**
 * Builds the production Content-Security-Policy header value.
 *
 * The policy enforces:
 * - `script-src 'self' 'nonce-…' 'strict-dynamic'` — only same-origin scripts
 *   and inline scripts stamped with the per-request nonce. `'strict-dynamic'`
 *   lets nonced bootstrap scripts load further chunks without each chunk
 *   needing its own nonce, which is how Next.js's chunk loader operates.
 * - `style-src 'self' 'nonce-…'` — only same-origin stylesheets and `<style>`
 *   tags carrying the nonce (Next.js's `next/font`-injected style tag and
 *   any nonce-aware library).
 * - `style-src-attr 'unsafe-inline'` — permits inline `style="…"` *attributes*
 *   only. Required because nonces cannot apply to attributes; React's
 *   `style={{}}` prop, motion/dnd-kit/recharts runtime transforms, and
 *   resizable-panels all rely on this. The risk profile is materially lower
 *   than `script-src 'unsafe-inline'`: an attacker who can already inject
 *   HTML can affect appearance but cannot execute code.
 * - `img-src 'self' data: blob:` — same-origin images, `data:` for inline
 *   SVG/icons, `blob:` for `react-easy-crop` thumbnail previews.
 * - `media-src 'self' blob:` — `<audio>` sources are proxied through
 *   `/api/media`; `blob:` reserved for any future client-built media URLs.
 * - `font-src 'self' data:` — Geist fonts are self-hosted under
 *   `/public/fonts`, plus `data:` for any inline-encoded glyphs.
 * - `connect-src 'self'` — every fetch/XHR/WebSocket/EventSource is same
 *   origin (Azure Blob and Azure OpenAI are server-only and proxied).
 * - `worker-src 'self' blob:` — the PDF.js worker is now bundled and served
 *   from `/_next/static/`; `blob:` covers any worker the platform may
 *   construct for CSS/JSON modules.
 * - `frame-ancestors 'self'` — only this origin may embed the app.
 * - `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`,
 *   `upgrade-insecure-requests` — defense-in-depth defaults.
 *
 * @param nonce - The per-request nonce returned by {@link generateNonce}.
 * @returns A single-line CSP header value ready to assign to the response.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const directives: string[] = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `media-src 'self' blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `worker-src 'self' blob:`,
    `frame-ancestors 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ];
  return directives.join('; ');
}
