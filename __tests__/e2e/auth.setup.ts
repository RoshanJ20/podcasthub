/**
 * Playwright setup: mint a valid NextAuth JWT cookie for the seeded
 * superadmin and persist it as the storage state used by the rest of
 * the suite.
 *
 * Why mint instead of form-login: production builds disable the
 * Credentials provider (only Azure AD SSO is permitted), so the
 * /login form has no email/password inputs to fill. Generating a
 * JWT here using `next-auth/jwt#encode` with the same NEXTAUTH_SECRET
 * the running server uses produces a session indistinguishable from
 * one created by a real SSO login.
 */
import { test as setup, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const ADMIN_STATE_PATH = '__tests__/e2e/.auth/admin.json';
const ADMIN_USER_ID = '6b8765ae-c50d-4d88-95d8-468fa6b287b3';
const ADMIN_EMAIL = 'admin@auditbrief.local';

setup('mint admin JWT cookie', async ({ context, baseURL }) => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET must be set in the env to mint a session JWT');
  }
  if (!baseURL) {
    throw new Error('baseURL must be set in playwright config');
  }

  // Match the shape produced by lib/auth/next-auth-options.ts `jwt` callback.
  const token = await encode({
    secret,
    token: {
      userId: ADMIN_USER_ID,
      role: 'superadmin',
      email: ADMIN_EMAIL,
      name: 'Admin',
      jti: randomUUID(),
      sub: ADMIN_USER_ID,
    },
    maxAge: 7 * 24 * 60 * 60,
  });

  // NextAuth v4 cookie name: `next-auth.session-token` over HTTP,
  // `__Secure-next-auth.session-token` once cookies use the Secure attribute.
  // Localhost test uses HTTP, so the unprefixed name applies.
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: token,
      url: baseURL,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
  ]);

  // Sanity check: the cookie should let us reach an admin-only page.
  const page = await context.newPage();
  const resp = await page.goto('admin', { waitUntil: 'domcontentloaded' });
  const status = resp?.status();
  if (status !== 200) {
    console.error('admin page status:', status, 'final url:', page.url());
  }
  expect(status, 'admin page returns 200 with minted cookie').toBe(200);
  await page.close();

  if (!existsSync(dirname(ADMIN_STATE_PATH))) {
    mkdirSync(dirname(ADMIN_STATE_PATH), { recursive: true });
  }
  await context.storageState({ path: ADMIN_STATE_PATH });
});
