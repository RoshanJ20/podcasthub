/**
 * Unit tests for middleware route classification helper functions.
 *
 * Verifies that routes are correctly classified as public, auth, admin, or API
 * routes for use by the Next.js middleware.
 */
import { describe, it, expect } from 'vitest';
import {
  isPublicRoute,
  isAuthRoute,
  isAdminRoute,
  isApiRoute,
} from '@/lib/auth/middleware-helpers';

describe('isPublicRoute', () => {
  it('returns true for the home page', () => {
    expect(isPublicRoute('/')).toBe(true);
  });

  it('returns true for /login', () => {
    expect(isPublicRoute('/login')).toBe(true);
  });

  it('returns true for /unauthorized', () => {
    expect(isPublicRoute('/unauthorized')).toBe(true);
  });

  it('returns true for /bulletins', () => {
    expect(isPublicRoute('/bulletins')).toBe(true);
  });

  it('returns true for /podcast/* routes', () => {
    expect(isPublicRoute('/podcast/some-id')).toBe(true);
    expect(isPublicRoute('/podcast/123/details')).toBe(true);
  });

  it('returns true for /learning-path', () => {
    expect(isPublicRoute('/learning-path')).toBe(true);
  });

  it('returns true for /learning-path/* routes', () => {
    expect(isPublicRoute('/learning-path/abc-123')).toBe(true);
  });

  it('returns true for /search', () => {
    expect(isPublicRoute('/search')).toBe(true);
  });

  it('returns false for /admin', () => {
    expect(isPublicRoute('/admin')).toBe(false);
  });

  it('returns false for /profile', () => {
    expect(isPublicRoute('/profile')).toBe(false);
  });

  it('returns false for /dashboard', () => {
    expect(isPublicRoute('/dashboard')).toBe(false);
  });
});

describe('isAuthRoute', () => {
  it('returns true for /api/auth/login', () => {
    expect(isAuthRoute('/api/auth/login')).toBe(true);
  });

  it('returns true for /api/auth/register', () => {
    expect(isAuthRoute('/api/auth/register')).toBe(true);
  });

  it('returns true for /api/auth/refresh', () => {
    expect(isAuthRoute('/api/auth/refresh')).toBe(true);
  });

  it('returns true for /api/auth/logout', () => {
    expect(isAuthRoute('/api/auth/logout')).toBe(true);
  });

  it('returns false for /api/podcasts', () => {
    expect(isAuthRoute('/api/podcasts')).toBe(false);
  });

  it('returns false for /api/health', () => {
    expect(isAuthRoute('/api/health')).toBe(false);
  });

  it('returns false for /login (non-API)', () => {
    expect(isAuthRoute('/login')).toBe(false);
  });
});

describe('isAdminRoute', () => {
  it('returns true for /admin', () => {
    expect(isAdminRoute('/admin')).toBe(true);
  });

  it('returns true for /admin/users', () => {
    expect(isAdminRoute('/admin/users')).toBe(true);
  });

  it('returns true for /admin/upload', () => {
    expect(isAdminRoute('/admin/upload')).toBe(true);
  });

  it('returns false for /api/admin', () => {
    expect(isAdminRoute('/api/admin')).toBe(false);
  });

  it('returns false for /', () => {
    expect(isAdminRoute('/')).toBe(false);
  });

  it('returns false for /profile', () => {
    expect(isAdminRoute('/profile')).toBe(false);
  });
});

describe('isApiRoute', () => {
  it('returns true for /api/podcasts', () => {
    expect(isApiRoute('/api/podcasts')).toBe(true);
  });

  it('returns true for /api/bookmarks', () => {
    expect(isApiRoute('/api/bookmarks')).toBe(true);
  });

  it('returns true for /api/learning-graphs', () => {
    expect(isApiRoute('/api/learning-graphs')).toBe(true);
  });

  it('returns false for /admin', () => {
    expect(isApiRoute('/admin')).toBe(false);
  });

  it('returns false for /', () => {
    expect(isApiRoute('/')).toBe(false);
  });

  it('returns false for /login', () => {
    expect(isApiRoute('/login')).toBe(false);
  });
});
