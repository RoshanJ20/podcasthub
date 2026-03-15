/**
 * Unit tests for auth cookie helper functions.
 *
 * Tests that setAuthCookies and clearAuthCookies correctly configure
 * HttpOnly cookies on NextResponse objects.
 */
import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  clearAuthCookies,
} from '@/lib/auth/cookies';

describe('cookie constants', () => {
  it('ACCESS_TOKEN_COOKIE is "access_token"', () => {
    expect(ACCESS_TOKEN_COOKIE).toBe('access_token');
  });

  it('REFRESH_TOKEN_COOKIE is "refresh_token"', () => {
    expect(REFRESH_TOKEN_COOKIE).toBe('refresh_token');
  });
});

describe('setAuthCookies', () => {
  it('sets access_token cookie on the response', () => {
    const response = NextResponse.json({ ok: true });
    const result = setAuthCookies(response, 'access-abc', 'refresh-xyz');

    const accessCookie = result.cookies.get(ACCESS_TOKEN_COOKIE);
    expect(accessCookie).toBeDefined();
    expect(accessCookie!.value).toBe('access-abc');
  });

  it('sets refresh_token cookie on the response', () => {
    const response = NextResponse.json({ ok: true });
    const result = setAuthCookies(response, 'access-abc', 'refresh-xyz');

    const refreshCookie = result.cookies.get(REFRESH_TOKEN_COOKIE);
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie!.value).toBe('refresh-xyz');
  });

  it('sets httpOnly flag on both cookies', () => {
    const response = NextResponse.json({ ok: true });
    const result = setAuthCookies(response, 'a', 'r');

    const accessCookie = result.cookies.get(ACCESS_TOKEN_COOKIE);
    expect(accessCookie!.httpOnly).toBe(true);

    const refreshCookie = result.cookies.get(REFRESH_TOKEN_COOKIE);
    expect(refreshCookie!.httpOnly).toBe(true);
  });

  it('sets sameSite to lax on both cookies', () => {
    const response = NextResponse.json({ ok: true });
    const result = setAuthCookies(response, 'a', 'r');

    const accessCookie = result.cookies.get(ACCESS_TOKEN_COOKIE);
    expect(accessCookie!.sameSite).toBe('lax');

    const refreshCookie = result.cookies.get(REFRESH_TOKEN_COOKIE);
    expect(refreshCookie!.sameSite).toBe('lax');
  });

  it('sets path to / on both cookies', () => {
    const response = NextResponse.json({ ok: true });
    const result = setAuthCookies(response, 'a', 'r');

    const accessCookie = result.cookies.get(ACCESS_TOKEN_COOKIE);
    expect(accessCookie!.path).toBe('/');

    const refreshCookie = result.cookies.get(REFRESH_TOKEN_COOKIE);
    expect(refreshCookie!.path).toBe('/');
  });

  it('returns the same response object', () => {
    const response = NextResponse.json({ ok: true });
    const result = setAuthCookies(response, 'a', 'r');
    expect(result).toBe(response);
  });
});

describe('clearAuthCookies', () => {
  it('clears access_token cookie by setting maxAge to 0', () => {
    const response = NextResponse.json({ ok: true });
    const result = clearAuthCookies(response);

    const accessCookie = result.cookies.get(ACCESS_TOKEN_COOKIE);
    expect(accessCookie).toBeDefined();
    expect(accessCookie!.value).toBe('');
    expect(accessCookie!.maxAge).toBe(0);
  });

  it('clears refresh_token cookie by setting maxAge to 0', () => {
    const response = NextResponse.json({ ok: true });
    const result = clearAuthCookies(response);

    const refreshCookie = result.cookies.get(REFRESH_TOKEN_COOKIE);
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie!.value).toBe('');
    expect(refreshCookie!.maxAge).toBe(0);
  });

  it('returns the same response object', () => {
    const response = NextResponse.json({ ok: true });
    const result = clearAuthCookies(response);
    expect(result).toBe(response);
  });
});
