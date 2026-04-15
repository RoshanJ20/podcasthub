/**
 * Unit tests for isRouteActive in lib/navigation-config.
 *
 * Verifies the longest-prefix-wins semantics so that sibling nav entries like
 * `/admin/learning-graphs` (list) and `/admin/learning-graphs/new` (create)
 * never both highlight on the same pathname.
 */
import { describe, it, expect } from 'vitest';
import { isRouteActive } from '@/lib/navigation-config';

describe('isRouteActive', () => {
  describe('list + create sibling (regression)', () => {
    it('highlights only the create route on /admin/learning-graphs/new', () => {
      expect(isRouteActive('/admin/learning-graphs/new', '/admin/learning-graphs/new')).toBe(true);
      expect(isRouteActive('/admin/learning-graphs', '/admin/learning-graphs/new')).toBe(false);
    });

    it('highlights only the list route on /admin/learning-graphs', () => {
      expect(isRouteActive('/admin/learning-graphs', '/admin/learning-graphs')).toBe(true);
      expect(isRouteActive('/admin/learning-graphs/new', '/admin/learning-graphs')).toBe(false);
    });

    it('highlights the list route for a dynamic edit page /admin/learning-graphs/:id', () => {
      const editPath = '/admin/learning-graphs/abc-123-uuid';
      expect(isRouteActive('/admin/learning-graphs', editPath)).toBe(true);
      expect(isRouteActive('/admin/learning-graphs/new', editPath)).toBe(false);
    });
  });

  describe('root-level paths (exact-match semantics)', () => {
    it('matches "/" only on exact /', () => {
      expect(isRouteActive('/', '/')).toBe(true);
      expect(isRouteActive('/', '/bulletins')).toBe(false);
    });

    it('matches "/admin" only on exact /admin', () => {
      expect(isRouteActive('/admin', '/admin')).toBe(true);
      expect(isRouteActive('/admin', '/admin/upload')).toBe(false);
      expect(isRouteActive('/admin', '/admin/learning-graphs')).toBe(false);
    });
  });

  describe('deep routes still highlight parent nav item', () => {
    it('highlights /bulletins when on /bulletins/some-id', () => {
      expect(isRouteActive('/bulletins', '/bulletins/some-id')).toBe(true);
    });

    it('highlights /learning-path on a dynamic learning-path detail page', () => {
      expect(isRouteActive('/learning-path', '/learning-path/abc')).toBe(true);
    });
  });

  describe('path-boundary safety', () => {
    it('does not treat /foo as a prefix of /foobar', () => {
      // Neither /foo nor /foobar are real nav hrefs, but the boundary check
      // must still prevent false positives for any future siblings.
      expect(isRouteActive('/admin/upload', '/admin/uploader')).toBe(false);
    });
  });

  describe('non-conflicting admin routes', () => {
    it('highlights only /admin/upload on /admin/upload', () => {
      expect(isRouteActive('/admin/upload', '/admin/upload')).toBe(true);
      expect(isRouteActive('/admin', '/admin/upload')).toBe(false);
    });

    it('highlights only /admin/analytics on /admin/analytics', () => {
      expect(isRouteActive('/admin/analytics', '/admin/analytics')).toBe(true);
      expect(isRouteActive('/admin/learning-graphs', '/admin/analytics')).toBe(false);
    });
  });
});
