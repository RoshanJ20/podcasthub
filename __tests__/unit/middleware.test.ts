/**
 * Unit tests for the Next.js middleware matcher exclusion rules.
 *
 * The matcher must exclude `/api/upload/file` so Next.js does not buffer
 * large multipart bodies (up to 500 MB) through edge middleware, which
 * has a hard 10 MB body cap. Because the app runs under `basePath: '/auditbrief'`,
 * the matcher must also exclude the basePath-prefixed form.
 */
import { describe, it, expect } from 'vitest';
import { config } from '@/middleware';

/**
 * Converts a Next.js matcher pattern string into a RegExp that can be
 * evaluated against incoming request pathnames.
 *
 * Next.js compiles these patterns via path-to-regexp internally. For the
 * shapes used in this codebase — a single capturing group containing a
 * negative lookahead followed by `.*` — the pattern is already a valid
 * JavaScript regex when anchored.
 *
 * @param pattern - The matcher pattern string from `middleware.ts` config.
 * @returns A RegExp anchored to the full pathname.
 */
function compileMatcher(pattern: string): RegExp {
  return new RegExp(`^${pattern}$`);
}

describe('middleware config.matcher', () => {
  const [matcherPattern] = config.matcher;
  const matcher = compileMatcher(matcherPattern);

  describe('excludes the upload route so edge middleware does not buffer >10 MB bodies', () => {
    it('does NOT match /auditbrief/api/upload/file (basePath-prefixed production path)', () => {
      expect(matcher.test('/auditbrief/api/upload/file')).toBe(false);
    });

    it('does NOT match /api/upload/file (no-basePath form)', () => {
      expect(matcher.test('/api/upload/file')).toBe(false);
    });
  });

  describe('still matches other routes so auth + correlation ID injection continues to work', () => {
    it('matches /auditbrief/api/learning-graphs', () => {
      expect(matcher.test('/auditbrief/api/learning-graphs')).toBe(true);
    });

    it('matches /auditbrief/admin/learning-graphs/new', () => {
      expect(matcher.test('/auditbrief/admin/learning-graphs/new')).toBe(true);
    });

    it('matches /auditbrief/api/audit-briefs', () => {
      expect(matcher.test('/auditbrief/api/audit-briefs')).toBe(true);
    });

    it('matches the nested upload preflight route /auditbrief/api/upload', () => {
      expect(matcher.test('/auditbrief/api/upload')).toBe(true);
    });
  });

  describe('continues to exclude Next.js internal and static asset paths', () => {
    it('does NOT match /_next/static/chunks/main.js', () => {
      expect(matcher.test('/_next/static/chunks/main.js')).toBe(false);
    });

    it('does NOT match /_next/image', () => {
      expect(matcher.test('/_next/image')).toBe(false);
    });

    it('does NOT match /favicon.ico', () => {
      expect(matcher.test('/favicon.ico')).toBe(false);
    });

    it('does NOT match image asset paths like /public/hero.png', () => {
      expect(matcher.test('/public/hero.png')).toBe(false);
    });
  });
});
