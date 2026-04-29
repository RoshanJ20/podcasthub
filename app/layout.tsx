/**
 * Root layout for The Audit Brief.
 *
 * Key responsibilities:
 * - Reads the per-request CSP nonce produced by `middleware.ts` and threads
 *   it into framework- and third-party-emitted inline content.
 * - Loads Geist font family
 * - Wraps app with ThemeProvider (dark/light mode via next-themes)
 * - Provides AudioProvider for persistent global audio element
 * - Provides Sonner toast notifications
 * - Sets global metadata
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { CSPProvider } from '@base-ui/react/csp-provider';
import { SessionProvider } from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { NonceProvider } from '@/components/providers/nonce-provider';
import { CommandPalette } from '@/components/layout/command-palette';
import { AudioProvider } from '@/components/audio-player/audio-context';
import { GlobalAudioPlayer } from '@/components/audio-player/global-audio-player';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = localFont({
  src: '../public/fonts/GeistVF.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: '../public/fonts/GeistMonoVF.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Audit Brief',
  description: 'Internal audio platform for audit professionals',
};

/**
 * Bootstrap script that runs as the first child of `<body>`, before any
 * other JS evaluates. It performs two CSP-related fix-ups:
 *
 * 1. **Auto-nonce runtime `<style>` elements.** Third-party libraries
 *    (sonner, motion, recharts, @dnd-kit) inject CSS by appending a fresh
 *    `<style>` element to `<head>` at module-load time. None of them
 *    accept a nonce prop, and `style-src 'self' 'nonce-…'` blocks any
 *    unnonced `<style>` element. Patching `Document.prototype.createElement`
 *    so every freshly-created `<style>` carries the per-request nonce
 *    BEFORE it is appended to the document fixes the entire family in one
 *    place.
 *
 * 2. **Block `Function` constructor cleanly so CSP reports don't fire for
 *    feature-detection probes.** Zod v4 (and similar libraries) probe
 *    `new Function("")` to detect whether dynamic code generation is
 *    allowed, then gracefully fall back to a non-eval code path when it
 *    throws. With strict `script-src 'self' 'nonce-…' 'strict-dynamic'`
 *    (no `'unsafe-eval'`), the probe IS blocked correctly and the library
 *    falls back as designed — but the browser still emits a CSP violation
 *    report that VAPT scans flag. Wrapping `Function` in a Proxy that
 *    throws synchronously means the engine never enters the real Function
 *    constructor, so no CSP check runs and no report is emitted; the
 *    library's try/catch sees a normal exception and proceeds to the
 *    fallback. This is a no-op for any code path that does not attempt
 *    dynamic function construction (i.e. all of our application code).
 *
 * The nonce is JSON-encoded so a malformed value (theoretically impossible
 * — it's server-generated base64) cannot break out of the string literal.
 */
function buildBootstrap(nonce: string): string {
  // Pure ES5 string literal — must run in every browser without transpilation
  // because it's emitted before the React bundle.
  return [
    // 1. Auto-nonce runtime <style> elements.
    `(function(n){if(!n)return;var c=Document.prototype.createElement;Document.prototype.createElement=function(t){var e=c.apply(this,arguments);if(typeof t==='string'&&t.toLowerCase()==='style'){e.setAttribute('nonce',n);}return e;};})(${JSON.stringify(nonce)});`,
    // 2. Block Function constructor without firing CSP reports.
    `(function(){var F=globalThis.Function;var msg='Function constructor blocked by CSP';globalThis.Function=new Proxy(F,{construct:function(){throw new TypeError(msg);},apply:function(){throw new TypeError(msg);}});})();`,
  ].join('');
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>{nonce && <meta name="csp-nonce" content={nonce} />}</head>
      <body className="antialiased">
        {nonce && (
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: buildBootstrap(nonce) }} />
        )}
        <NonceProvider nonce={nonce}>
          <CSPProvider nonce={nonce}>
            <SessionProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                nonce={nonce}
              >
                <AudioProvider>
                  <CommandPalette />
                  <GlobalAudioPlayer />
                  {children}
                  <Toaster richColors position="bottom-right" />
                </AudioProvider>
              </ThemeProvider>
            </SessionProvider>
          </CSPProvider>
        </NonceProvider>
      </body>
    </html>
  );
}
