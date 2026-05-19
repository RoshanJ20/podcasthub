# CSP Nonce + Nginx Reverse Proxy — Integration Guide

> Reference implementation: **The Audit Brief** (`/auditbrief`) on
> `uat.uno.wcgt.in`. Commit `f1ad4dd` — _"fix(security): nonce-based CSP to
> satisfy strict VAPT nginx policy"_. This guide is the playbook for
> reproducing that fix in any other Next.js App Router app sharing the same
> nginx host (uno, xray, controller, future apps).

---

## Table of contents

1. [TL;DR](#1-tldr)
2. [Symptoms — recognising the bug](#2-symptoms--recognising-the-bug)
3. [The architecture](#3-the-architecture)
4. [Why the nonce MUST live in the app, not nginx](#4-why-the-nonce-must-live-in-the-app-not-nginx)
5. [The nginx all-or-nothing inheritance rule](#5-the-nginx-all-or-nothing-inheritance-rule)
6. [The fix — app side (Next.js App Router)](#6-the-fix--app-side-nextjs-app-router)
7. [The fix — nginx side](#7-the-fix--nginx-side)
8. [Verification checklist](#8-verification-checklist)
9. [Common pitfalls (FAQ)](#9-common-pitfalls-faq)
10. [Appendix A — Audit-brief reference files](#10-appendix-a--audit-brief-reference-files)
11. [Appendix B — Full nginx location-block excerpt](#11-appendix-b--full-nginx-location-block-excerpt)
12. [Appendix C — Out of scope](#12-appendix-c--out-of-scope)

---

## 1. TL;DR

- **Symptom.** Your Next.js app shows `Refused to execute inline script`
  errors in the browser console behind the shared nginx, even though you
  generate a per-request nonce.
- **Cause.** Nginx is sending its own server-wide `Content-Security-Policy`
  header in addition to yours. The browser intersects the two policies and
  the nonce gets dropped.
- **Fix.** Inside your two `/your-app` location blocks in nginx, paste 7
  `add_header` lines covering every server-wide security header **except**
  `Content-Security-Policy`. That triggers nginx to stop inheriting the
  server-block CSP for your location, and lets your app's nonce CSP pass
  through untouched.

The full app-side prerequisites and the exact nginx snippet are below.

---

## 2. Symptoms — recognising the bug

You probably have this bug if **all** of these are true:

- Your app generates a nonce in middleware and emits its own
  `Content-Security-Policy` header.
- Your app is served behind the shared nginx on `uat.uno.wcgt.in` (or any
  reverse proxy that itself injects a CSP at the `server` level).
- The browser console shows one or more of:
  - `Refused to execute inline script because it violates the following
Content Security Policy directive: "script-src 'self'"`
  - `Refused to apply inline style because it violates the following
Content Security Policy directive: "style-src 'self'"`
  - `Refused to load the stylesheet ... violates ... "style-src 'self'"`
- `curl -sI https://uat.uno.wcgt.in/your-app/some-page | grep -i
content-security-policy` returns **two lines** instead of one.
- Hydration silently fails — buttons don't react, dark/light toggle
  doesn't work, sonner toasts never appear, the page renders but feels
  "frozen".

If only some of these are true, see [§9 Common pitfalls](#9-common-pitfalls-faq)
before applying the fix.

---

## 3. The architecture

```
┌──────────┐        ┌──────────────────┐       ┌──────────────────────┐
│ Browser  │ HTTPS  │  nginx :443      │  HTTP │ Your Next.js app     │
│          ├───────▶│  (reverse proxy) ├──────▶│ on 127.0.0.1:<PORT>  │
│          │        │  +adds headers   │       │ middleware emits CSP │
└──────────┘        └──────────────────┘       └──────────────────────┘
       ▲                     │                            │
       │  ◀──────────────────┴──── response ──────────────┘
       │  Both layers can attach response headers.
       │  Browser receives the merged set.
```

Two places can set headers on the response:

| Layer              | Mechanism                        | Default behaviour                                                     |
| ------------------ | -------------------------------- | --------------------------------------------------------------------- |
| nginx server block | `add_header X "v" always;`       | Adds X to every response from this server, including ones it proxies. |
| Next.js middleware | `response.headers.set('X', 'v')` | Adds X to the response that nginx then forwards to the browser.       |

Per the [CSP Level 3 spec](https://www.w3.org/TR/CSP3/#multiple-policies),
when a response carries **multiple** `Content-Security-Policy` headers the
browser enforces the **intersection** of all of them — i.e. the strictest
combined rule wins. This is by design (defence in depth) and not configurable.

So if nginx sends `script-src 'self'` and your app sends
`script-src 'self' 'nonce-abc' 'strict-dynamic'`, the effective policy
collapses to `script-src 'self'` and **your nonce is gone**. Every inline
`<script nonce="abc">` the framework emits is then refused.

---

## 4. Why the nonce MUST live in the app, not nginx

A reasonable reaction is: "fine, just put the whole CSP in nginx." That
does not work, and here is why.

### 4.1 The nonce must be unique per response

The [CSP Level 3 spec](https://www.w3.org/TR/CSP3/#security-nonces) requires:

> The generated value SHOULD be at least 128 bits long (before encoding),
> and SHOULD be generated via a cryptographically secure random number
> generator... it MUST be unique on each response.

A static nonce in nginx config would be publicly known (anyone can
`curl -I` and read it). That defeats the entire mechanism — an attacker
could craft `<script nonce="known-value">` and the browser would run it.

### 4.2 Stock nginx has no secure random-string variable

Nginx exposes `$request_id` (16 bytes hex), but it is documented as a
correlation identifier, not a security primitive, and is below the spec's
128-bit recommendation. There is no built-in directive that produces a
fresh cryptographic random string per request.

To do it inside nginx you would need to install a third-party module:

| Option                               | Cost                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `ngx_http_headers_more_module` + Lua | Recompile nginx or switch to OpenResty. New runtime dep for the deploy team. |
| `ngx_njs` (JavaScript-in-nginx)      | Extra module install. Now there is JS in two places — confusing.             |

Neither is acceptable for a one-line problem.

### 4.3 Even with the nonce in nginx, the renderer would still need it

The same nonce has to appear inside the HTML body:

```html
<script nonce="abc123xyz" src="/_next/static/chunks/main.js"></script>
<script nonce="abc123xyz">
  self.__next_f.push([1, '...']);
</script>
<style nonce="abc123xyz">
  @font-face { font-family: "Geist"; ... }
</style>
```

The browser only runs/applies these tags if the `nonce` attribute matches
the `nonce-…` token in the CSP header. So nginx would have to (a) generate
the nonce, (b) forward it to the upstream as a header, (c) trust that the
upstream renderer reads that header and stamps every framework-emitted
script and style with the same value. That is exactly what we already
do — with the app generating the nonce instead of nginx. Moving step (a)
to nginx adds a runtime dependency without removing any complexity from
the app.

### 4.4 The header is one string — it cannot be split between layers

You may notice that 13 of the 14 CSP directives are static and only
`script-src` and `style-src` carry the dynamic nonce. It is tempting to
think nginx could send "the static parts" and the app could send "just
the script-src/style-src". It cannot. CSP headers are not concatenated
by the browser; multiple headers are intersected. Sending half from
nginx and half from the app produces the exact bug we are fixing.

**Conclusion:** the entire CSP is built and emitted inside the app. Nginx's
job is to _not get in the way_. That is what the 7-line fix accomplishes.

---

## 5. The nginx all-or-nothing inheritance rule

This is the quirk that makes the fix non-obvious. From the
[`ngx_http_headers_module` docs](http://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header):

> There could be several `add_header` directives. These directives are
> inherited from the previous configuration level **if and only if there
> are no `add_header` directives defined on the current level**.

In plain English:

> The moment a `location` block adds **even one** header of its own,
> nginx silently throws away **every** `add_header` it would have
> inherited from the surrounding `server` block.

Worked example:

```nginx
server {
    add_header Strict-Transport-Security "max-age=31536000" always; # (1)
    add_header X-Frame-Options "SAMEORIGIN" always;                  # (2)
    add_header Content-Security-Policy "default-src 'self'" always;  # (3)

    location /a {
        # zero add_header here ⇒ inherits (1) (2) (3)
        proxy_pass http://upstream-a;
    }

    location /b {
        add_header X-Frame-Options "DENY" always;  # (4)
        # ⇒ inherits NONE of (1) (2) (3). Only (4) applies.
        proxy_pass http://upstream-b;
    }
}
```

After this config, `/a` returns headers (1) (2) (3); `/b` returns only
(4). The HSTS and CSP from the server block are silently gone for `/b`.

There is no nginx directive equivalent to "inherit everything except CSP".
The two ways to drop a single header from the inheritance set are:

1. Install `ngx_headers_more` and use `more_clear_headers` — adds a
   runtime dependency.
2. Trigger the inheritance quirk by adding any `add_header` in the
   location, then **re-list every header you still want**, omitting the
   ones you want to drop. This is the approach we use.

---

## 6. The fix — app side (Next.js App Router)

You need three pieces of code in your app. All are taken verbatim from
the audit-brief implementation; adjust import paths and basePath as
needed for your repo.

### 6.1 `lib/security/csp.ts` — nonce + policy assembly

Create this file. It owns nonce generation and CSP-string assembly.

```ts
/**
 * Content Security Policy nonce generation and policy assembly.
 *
 * The policy is built per-request because every response must carry a
 * fresh, unguessable nonce that matches the nonce stamped on every
 * framework-emitted <script> and <style> tag in the same response.
 */

/**
 * Generates a cryptographically-random base64 nonce suitable for CSP.
 * Returns a 22-character URL-safe string.
 */
export function generateNonce(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return btoa(uuid).replace(/=+$/, '');
}

/**
 * Builds the production Content-Security-Policy header value.
 *
 * Adapt the directives below to your app's needs. Most apps will keep
 * everything as-is; tighten or relax `connect-src` / `img-src` /
 * `media-src` / `font-src` to match your real third-party endpoints.
 *
 * Why the non-obvious bits:
 *  - `'strict-dynamic'` lets nonced bootstrap scripts load further chunks
 *    without each chunk needing its own nonce. Required for Next.js's
 *    chunk loader.
 *  - `style-src-attr 'unsafe-inline'` permits inline `style="..."`
 *    attributes only (NOT inline <style> tags). Nonces cannot apply to
 *    HTML attributes by spec; React's `style={{...}}` prop and most
 *    motion/transform libraries depend on this. The risk profile is
 *    materially lower than `script-src 'unsafe-inline'`: an attacker
 *    who can inject HTML can affect appearance but cannot execute code.
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
```

### 6.2 `middleware.ts` — generate per request, set both ends

Your existing `middleware.ts` (or a new one) must do four things on
every HTML-rendering request:

1. `const nonce = generateNonce();`
2. `const csp = buildContentSecurityPolicy(nonce);`
3. Forward the nonce to the renderer via the **request** header `x-nonce`.
   Next.js's App Router automatically stamps that nonce onto every
   framework-emitted `<script>` and `<style>` tag.
4. Set the matching `Content-Security-Policy` on the **response** header.

Skeleton (lift this into your existing middleware, or use as-is):

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { buildContentSecurityPolicy, generateNonce } from '@/lib/security/csp';

export default async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce);

  // 1. Hand the nonce to the renderer.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // 2. Pass the enriched request through, then attach the CSP to the
  //    outgoing response.
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Run on every path EXCEPT framework static assets and large-body
  // upload endpoints (edge middleware buffers bodies up to 10 MB and
  // would corrupt larger uploads).
  // The `(?:your-basepath/)?` prefix is required so the matcher works
  // both in local dev (no basePath) and in production (with basePath).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|(?:your-basepath/)?api/upload/file|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

If you already have auth logic in `middleware.ts`, integrate the nonce
work alongside it — generate the nonce **once at the top** and attach
the CSP on **every** response branch (the auth-redirect branch, the
unauthorized branch, and the happy path). See
[middleware.ts](../middleware.ts) lines 84–156 for a complete example
that combines auth + CSP.

### 6.3 `app/layout.tsx` — read the nonce, thread it through

Your root layout must read the nonce from `headers()` and:

1. Emit a `<meta name="csp-nonce">` tag so libraries like `motion`
   (and `@base-ui/react`'s `CSPProvider`) pick it up automatically.
2. Pass it to `<ThemeProvider>` so `next-themes` applies it to its
   FOUC-prevention inline script.
3. Optionally inject the **bootstrap nonce-patcher** described below
   if you depend on libraries that inject `<style>` tags at runtime.

```tsx
import { headers } from 'next/headers';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { NonceProvider } from '@/components/providers/nonce-provider';

function buildBootstrap(nonce: string): string {
  // Pure ES5 — runs before the React bundle, in every browser.
  return [
    // (a) Auto-stamp nonce on every <style> created via createElement.
    //     Catches sonner, motion, recharts, @dnd-kit and most others.
    `(function(n){if(!n)return;var c=Document.prototype.createElement;` +
      `Document.prototype.createElement=function(t){var e=c.apply(this,arguments);` +
      `if(typeof t==='string'&&t.toLowerCase()==='style'){e.setAttribute('nonce',n);}` +
      `return e;};})(${JSON.stringify(nonce)});`,
    // (b) Block Function constructor cleanly so Zod's eval probe and
    //     similar feature-detects don't generate noisy CSP reports.
    `(function(){var F=globalThis.Function;var msg='Function constructor blocked by CSP';` +
      `globalThis.Function=new Proxy(F,{construct:function(){throw new TypeError(msg);},` +
      `apply:function(){throw new TypeError(msg);}});})();`,
  ].join('');
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>{nonce && <meta name="csp-nonce" content={nonce} />}</head>
      <body>
        {nonce && (
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: buildBootstrap(nonce) }} />
        )}
        <NonceProvider nonce={nonce}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
            {children}
          </ThemeProvider>
        </NonceProvider>
      </body>
    </html>
  );
}
```

`NonceProvider` is a simple React context (~30 lines) so client
components can read the nonce via a `useNonce()` hook. The full file
is included as Appendix A.

### 6.4 Make sure no other layer is also setting CSP

Check your app for stray CSP definitions and remove them — the only
source must be middleware. Common offenders:

- `next.config.ts` `headers()` array — remove any `Content-Security-Policy`
  entry. (HSTS, X-Frame-Options, Referrer-Policy, etc. can stay.)
- Per-route response headers in route handlers or
  `revalidate` / `dynamic` exports.
- A reverse proxy in front of nginx (rare, but check).

In audit-brief, the `next.config.ts` security-headers array
intentionally omits CSP; see `next.config.ts:14-24`.

### 6.5 Libraries that need extra care

The bootstrap nonce-patcher in §6.3 handles most third-party styles
because almost every CSS-in-JS library uses `document.createElement('style')`
to inject its sheet. You will still need to verify these libraries
behave under your strict CSP — exercise their UI in a production build
(`npm run build && node .next/standalone/server.js`) with DevTools open
and watch for `Refused to apply inline style` / `Refused to execute
inline script` messages:

| Library                    | Behaviour                               | Action                                                                                    |
| -------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `sonner` (toasts)          | Injects `<style>` at module load        | Bootstrap patcher handles it.                                                             |
| `motion` / `framer-motion` | Reads `<meta name="csp-nonce">`         | Already handled by §6.3 meta tag.                                                         |
| `recharts`                 | Inline transforms via `style={{}}`      | Permitted by `style-src-attr 'unsafe-inline'`.                                            |
| `@dnd-kit`                 | Drag previews via inline `style` attr   | Permitted by `style-src-attr 'unsafe-inline'`.                                            |
| `next-themes`              | FOUC prevention inline script           | Pass `nonce` prop to `<ThemeProvider>`.                                                   |
| `@base-ui/react`           | Server-rendered prehydration `<script>` | Wrap in `<CSPProvider nonce={nonce}>`.                                                    |
| `react-pdf` / `pdfjs-dist` | Worker via CDN by default               | Self-host the worker (`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`). |
| `zod` v4                   | Probes `new Function('')` for eval      | Bootstrap proxy in §6.3 silences the CSP report.                                          |

If a library uses something the bootstrap patcher doesn't catch (e.g.
`CSSStyleSheet.replaceSync`, `insertAdjacentHTML`), prefer:

1. Importing the library's static CSS file
   (`import 'pkg/dist/styles.css'`) so Next.js bundles it as a same-origin
   stylesheet, OR
2. Replacing the library with a nonce-aware alternative.

---

## 7. The fix — nginx side

Find the location blocks in the shared nginx config that proxy to your
app. There are usually two — an exact match for the basePath root and
a prefix match for everything underneath:

```nginx
location = /your-app  { proxy_pass http://your_upstream; ... }
location ^~ /your-app/ { proxy_pass http://your_upstream; ... }
```

Inside **both** of those blocks, just after the `proxy_set_header` lines,
paste this:

```nginx
# Re-add server-wide security headers EXCEPT Content-Security-Policy.
# The /your-app app sets its own per-request CSP with a nonce.
# Do NOT add Content-Security-Policy here, and do NOT use
# `proxy_hide_header Content-Security-Policy;` — both break the nonce.
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options            "SAMEORIGIN" always;
add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
add_header X-Content-Type-Options     "nosniff" always;
add_header Cache-Control              "no-store, no-cache, must-revalidate, proxy-revalidate" always;
add_header Pragma                     "no-cache" always;
add_header Expires                    "0" always;
```

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7.1 What these 7 lines actually do

They are not adding security — those headers were already inherited
before. They are doing two things in one shot:

1. **Triggering the inheritance quirk from §5.** As soon as a location
   has any `add_header`, nginx stops inheriting all server-block
   `add_header`s for that location.
2. **Restoring the 7 inherited headers we still want**, by listing
   them explicitly. `Content-Security-Policy` is deliberately not in
   the list — that is the actual fix. The upstream's CSP (with the
   nonce) now passes through unmodified because nginx is no longer
   adding its own.

### 7.2 Adapting for your app

| Field                                               | What to change                                                                                                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `location = /your-app` and `location ^~ /your-app/` | Replace `/your-app` with your app's basePath (`/uno`, `/xray`, etc.).                                                                                                                                                                  |
| `proxy_pass http://your_upstream`                   | Replace with the upstream defined for your app (e.g. `http://uno_upstream`).                                                                                                                                                           |
| The 7 `add_header` lines                            | If the shared nginx server block has additional or different headers (e.g. a `Permissions-Policy`), copy those across too. The rule is: list every server-block `add_header` you want preserved, **except** `Content-Security-Policy`. |

### 7.3 Things NOT to do

- ❌ **Do not use `proxy_hide_header Content-Security-Policy;`.** That
  strips the **upstream**'s good CSP from the proxied response while
  letting nginx's own bad CSP through. It is the exact opposite of
  what you want.
- ❌ **Do not set `add_header Content-Security-Policy "..." always;`
  inside your location block.** That would just replace the bad
  server CSP with another nginx-side CSP — the nonce still does not
  reach the browser.
- ❌ **Do not skip any of the 7 lines.** Removing one (e.g. dropping
  `Cache-Control`) means that header silently disappears from your
  app's responses and your VAPT scan will fail on it.
- ❌ **Do not edit the server-block CSP.** Other apps on the same VM
  rely on it. The whole point of this approach is a per-location
  override, not a global change.

---

## 8. Verification checklist

After the app is deployed and `sudo systemctl reload nginx` has run:

### 8.1 curl checks (run from any workstation)

```bash
# (1) Exactly ONE Content-Security-Policy header, containing nonce-... and
#     strict-dynamic. The output should be a single line.
curl -sI https://uat.uno.wcgt.in/your-app/ | grep -i 'content-security-policy'

# (2) Two consecutive requests must return DIFFERENT nonce values.
curl -sI https://uat.uno.wcgt.in/your-app/ | grep -oE "nonce-[A-Za-z0-9+/=]+" | head -1
curl -sI https://uat.uno.wcgt.in/your-app/ | grep -oE "nonce-[A-Za-z0-9+/=]+" | head -1

# (3) Other apps still get the original strict no-nonce CSP — confirms
#     you only changed YOUR location, not the whole server.
curl -sI https://uat.uno.wcgt.in/        | grep -i 'content-security-policy'
curl -sI https://uat.uno.wcgt.in/auditbrief/ | grep -i 'content-security-policy'

# (4) The 7 other security headers are still present on your app.
curl -sI https://uat.uno.wcgt.in/your-app/ | grep -iE 'strict-transport|x-frame|referrer-policy|x-content-type|cache-control|pragma|expires'
```

### 8.2 Browser smoke test

1. Open `https://uat.uno.wcgt.in/your-app/` in Chrome with DevTools open.
2. **Network tab** → click the document request → Response Headers.
   There must be exactly **one** `content-security-policy` line, and it
   must contain `nonce-…`.
3. **Console tab** → must have **zero** `Refused to execute inline script`
   or `Refused to apply inline style` messages.
4. Hard refresh (Ctrl-Shift-R / Cmd-Shift-R). Repeat steps 2–3.
5. Click around the app — interact with toasts, animations, drag-and-drop,
   charts, anything that exercises third-party libraries. Watch the
   Console for late CSP errors triggered by lazy-loaded code.

### 8.3 What "pass" looks like

| Check                      | Pass                                                    |
| -------------------------- | ------------------------------------------------------- |
| (1) curl CSP line          | One line, contains `nonce-…` and `'strict-dynamic'`.    |
| (2) two nonces             | Two different base64-ish strings.                       |
| (3) other apps             | Their old strict CSP unchanged.                         |
| (4) other security headers | All 7 present.                                          |
| Browser network            | One CSP header on document.                             |
| Browser console            | Zero CSP refusal messages, including after interaction. |

If any of these fails, see [§9 Common pitfalls](#9-common-pitfalls-faq).

---

## 9. Common pitfalls (FAQ)

### "I added `proxy_hide_header Content-Security-Policy;` and the site is still broken."

That directive strips the **upstream** (your app's) CSP from the
response. Nginx's `add_header` still fires, so the only CSP that
reaches the browser is nginx's strict no-nonce one. Remove the line
and follow §7 instead.

### "I added one header in the location and now HSTS / X-Frame disappeared from the response."

That is the inheritance quirk from §5. The fix is to re-list **all**
the security headers you want, not just the one you originally added.
The 7 lines in §7 are the complete set — paste all of them.

### "My nonce is the same value across two consecutive requests."

Either:

- Your middleware is not running on that route. Check the `matcher`
  in `middleware.ts` — make sure your route is not excluded, and that
  the `(?:basepath/)?` prefix is present so it matches in production.
- Something between the browser and your app is caching the response.
  Check `Cache-Control` on the affected route, and any CDN or service
  worker.
- Your middleware is reusing a module-level nonce. The nonce
  generation must happen **inside** the request handler, not at
  module load.

### "I see two `Content-Security-Policy` headers on the response."

Either:

- The `/your-app` location still has zero `add_header` directives,
  so it is still inheriting nginx's CSP. Re-check that you saved the
  config and ran `sudo systemctl reload nginx`.
- The matcher in `middleware.ts` is matching a path that nginx is also
  adding CSP for, and the location selection is hitting the wrong
  block. Check `nginx -T` for the active config and the order of
  location blocks.

### "I see only the strict no-nonce CSP, no nonce one at all."

Your middleware is not setting the header, OR your matcher is not
running for the request. Add a temporary `console.log` (or a
log-line via your structured logger) at the top of the middleware
and re-deploy briefly to confirm it executes for the failing route.

### "Inline `style="..."` attributes are blocked."

Add `style-src-attr 'unsafe-inline'` to your CSP (it is in the
audit-brief reference policy in §6.1 already). This permits inline
style **attributes** only, not inline `<style>` tags. The risk is
much lower than `script-src 'unsafe-inline'`: an attacker who can
inject HTML can change appearance but cannot run code. Almost every
React app needs this because `style={{}}` props compile to inline
`style="..."` attributes.

### "A third-party library is injecting `<style>` tags that don't have the nonce."

Confirm the library is using `document.createElement('style')` (most
do — open Sources tab, set a breakpoint on `Document.createElement`).
If yes, the bootstrap nonce-patcher in §6.3 handles it; verify the
patcher is actually present in the rendered HTML
(`view-source:https://your-app/...`).

If the library uses a different mechanism (`CSSStyleSheet.replaceSync`,
`insertAdjacentHTML`), see §6.5 for alternatives.

### "VAPT report says `Cache-Control: no-store` is missing on /your-app pages."

The `Cache-Control` line must be in your re-listed 7 headers in nginx.
Paste the full block from §7, do not skip any line.

### "Local dev (npm run dev) shows CSP errors, prod doesn't (or vice versa)."

Local dev uses webpack HMR which injects its own scripts that may not
get the nonce. Either:

- Loosen the policy in dev only (gate by `process.env.NODE_ENV`), or
- Test against the standalone production build:
  `npm run build && node .next/standalone/server.js`.

### "Sentry / GTM / a chat widget stopped working."

External scripts need their host added to `script-src` and `connect-src`,
e.g. `https://*.ingest.sentry.io`, `https://www.googletagmanager.com`.
Add them to `buildContentSecurityPolicy()` in `lib/security/csp.ts`.
Beware: some external SDKs use inline scripts that need to be either
moved to same-origin or allowed via a separate nonce/hash.

---

## 10. Appendix A — Audit-brief reference files

The full working implementation in this repo:

| File                                                                                  | Purpose                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [lib/security/csp.ts](../lib/security/csp.ts)                                         | `generateNonce()` + `buildContentSecurityPolicy()`.                                                                                                                  |
| [middleware.ts](../middleware.ts)                                                     | Generates nonce, sets `x-nonce` request header, sets `Content-Security-Policy` response header on every branch (auth redirect, unauthorized, happy path).            |
| [app/layout.tsx](../app/layout.tsx)                                                   | Reads nonce via `headers()`, emits `<meta name="csp-nonce">`, injects bootstrap nonce-patcher script, threads nonce through `<ThemeProvider>` and `<NonceProvider>`. |
| [components/providers/nonce-provider.tsx](../components/providers/nonce-provider.tsx) | React context + `useNonce()` hook for client components that need the nonce (e.g. `@base-ui/react` Slider).                                                          |
| [next.config.ts](../next.config.ts)                                                   | Confirms no static CSP is defined at the framework level — CSP is per-request only.                                                                                  |

Reference commit: **`f1ad4dd`** — _fix(security): nonce-based CSP to satisfy
strict VAPT nginx policy_. Run `git show f1ad4dd` for the full diff.

The minimal `NonceProvider` for copy-paste:

```tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';

const NonceContext = createContext<string | undefined>(undefined);

interface NonceProviderProps {
  nonce: string | undefined;
  children: ReactNode;
}

export function NonceProvider({ nonce, children }: NonceProviderProps) {
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}

/** Returns the per-request CSP nonce, or undefined if not yet provided. */
export function useNonce(): string | undefined {
  return useContext(NonceContext);
}
```

---

## 11. Appendix B — Full nginx location-block excerpt

This is what your two location blocks should look like end-to-end after
the change. Replace `/your-app` and `your_upstream` with your values.

```nginx
# ----------------------
# YOUR-APP at /your-app
# ----------------------
location = /your-app {
    proxy_pass http://your_upstream;
    proxy_http_version 1.1;

    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Re-add server-wide security headers EXCEPT Content-Security-Policy.
    # The /your-app app sets its own per-request CSP with a nonce.
    # Do NOT add Content-Security-Policy here, and do NOT use
    # `proxy_hide_header Content-Security-Policy;` — both break the nonce.
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options            "SAMEORIGIN" always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
    add_header X-Content-Type-Options     "nosniff" always;
    add_header Cache-Control              "no-store, no-cache, must-revalidate, proxy-revalidate" always;
    add_header Pragma                     "no-cache" always;
    add_header Expires                    "0" always;
}

location ^~ /your-app/ {
    proxy_pass http://your_upstream;
    proxy_http_version 1.1;

    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Re-add server-wide security headers EXCEPT Content-Security-Policy.
    # The /your-app app sets its own per-request CSP with a nonce.
    # Do NOT add Content-Security-Policy here, and do NOT use
    # `proxy_hide_header Content-Security-Policy;` — both break the nonce.
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options            "SAMEORIGIN" always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
    add_header X-Content-Type-Options     "nosniff" always;
    add_header Cache-Control              "no-store, no-cache, must-revalidate, proxy-revalidate" always;
    add_header Pragma                     "no-cache" always;
    add_header Expires                    "0" always;
}
```

Apply with:

```bash
sudo nginx -t            # must print "syntax is ok" and "test is successful"
sudo systemctl reload nginx
```

Then run the verification checklist in §8.

---

## 12. Appendix C — Out of scope

This guide covers the nginx ↔ Next.js CSP-nonce handoff only. Things it
deliberately does not address:

- **CSP reporting (`report-to`, `report-uri`).** Audit-brief does not
  emit reports today. If you want to wire one up, do it in
  `buildContentSecurityPolicy()` and provision a reporting endpoint
  separately.
- **Other security headers** (`Permissions-Policy`, `COEP`, `COOP`,
  `Cross-Origin-Resource-Policy`). Tune these independently — they
  do not interact with the nonce mechanism.
- **Sentry, GTM, chat-widget integration.** Each external script
  source needs an explicit allowlist in `script-src` and
  `connect-src`. There is no generic recipe; consult the vendor's
  CSP guide.
- **Cache-Control tuning for `_next/static/*`.** Long-cache for
  fingerprinted assets is desirable but separate from CSP. Audit-brief
  may add this in a follow-up; do not bundle it with this change.
- **Non-Next.js apps.** The contract is the same — generate nonce per
  response, put it in the CSP header, stamp every inline `<script>`
  and `<style>` tag with the same value — but the implementation is
  framework-specific. Consult your framework's CSP-nonce documentation
  (Express + helmet, NestJS + `@nestjs/helmet`, Spring Security CSP,
  etc.). The nginx side (§7) is identical regardless of the upstream
  stack.
