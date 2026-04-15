import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * Globally stub `server-only`.
 *
 * Next.js' `server-only` package throws on import in any non-server runtime,
 * which includes Vitest's jsdom environment. Tests that transitively import
 * any module marked server-only (e.g. lib/admin/revalidate.ts) would fail
 * during module evaluation without this stub.
 */
vi.mock('server-only', () => ({}));

/**
 * Global matchMedia mock for all tests.
 *
 * Required because useReducedMotion (and other hooks) call
 * window.matchMedia which doesn't exist in jsdom.
 * Without this, tests that share workers with motion-using
 * components throw "window is not defined" asynchronously.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
