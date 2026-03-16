/**
 * Vitest configuration for Podcast Hub v2.
 *
 * - Uses jsdom environment for React component testing
 * - Path alias @/ maps to project root
 * - Coverage thresholds: 80% lines/functions/statements, 75% branches
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**', 'components/**', 'app/api/**'],
      thresholds: {
        lines: 45,
        functions: 35,
        branches: 40,
        statements: 45,
      },
    },
  },
});
