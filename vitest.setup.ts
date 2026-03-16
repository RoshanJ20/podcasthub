import '@testing-library/jest-dom/vitest';

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
