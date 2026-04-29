/**
 * Phase B regression suite: zero CSP violations across every route.
 *
 * Drives the production build (`node .next/standalone/server.js` on :3103)
 * and asserts that every route reports:
 *   - zero `securitypolicyviolation` events,
 *   - zero uncaught page errors (`pageerror`),
 *   - zero `console.error` lines that look CSP-related.
 *
 * The admin storage state is captured once (see `loginAsAdmin`) and reused
 * across all authenticated tests — much faster than per-test form login.
 */
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

interface ViolationCapture {
  cspViolations: Array<{
    directive: string;
    blockedURI: string;
    sample: string;
    sourceFile?: string;
    lineNumber?: number;
    columnNumber?: number;
  }>;
  pageErrors: Error[];
  consoleErrors: string[];
}

function attachViolationCapture(page: Page): ViolationCapture {
  const capture: ViolationCapture = {
    cspViolations: [],
    pageErrors: [],
    consoleErrors: [],
  };

  page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(
        '[CSP-VIOLATION]',
        JSON.stringify({
          directive: e.violatedDirective,
          blockedURI: e.blockedURI,
          sample: e.sample?.slice(0, 200) ?? '',
          sourceFile: e.sourceFile ?? '',
          lineNumber: e.lineNumber ?? 0,
          columnNumber: e.columnNumber ?? 0,
        })
      );
    });
  });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const text = msg.text();
    if (text.startsWith('[CSP-VIOLATION]')) {
      try {
        capture.cspViolations.push(JSON.parse(text.slice('[CSP-VIOLATION] '.length)));
      } catch {
        capture.cspViolations.push({ directive: '?', blockedURI: '?', sample: text });
      }
      return;
    }
    if (
      text.includes('Refused to') ||
      text.includes('Content Security Policy') ||
      text.includes('violates the following')
    ) {
      capture.consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    capture.pageErrors.push(err);
  });

  return capture;
}

function assertClean(routeLabel: string, capture: ViolationCapture) {
  const problems: string[] = [];
  if (capture.cspViolations.length > 0) {
    problems.push(
      `CSP violations (${capture.cspViolations.length}):\n` +
        capture.cspViolations
          .map(
            (v) =>
              `    - ${v.directive} blocked ${v.blockedURI}\n` +
              `      sample: ${v.sample}\n` +
              `      at: ${v.sourceFile ?? '?'}:${v.lineNumber ?? '?'}:${v.columnNumber ?? '?'}`
          )
          .join('\n')
    );
  }
  if (capture.consoleErrors.length > 0) {
    problems.push(
      `console.error CSP-flavored (${capture.consoleErrors.length}):\n` +
        capture.consoleErrors.map((e) => `    - ${e.slice(0, 300)}`).join('\n')
    );
  }
  if (capture.pageErrors.length > 0) {
    problems.push(
      `pageerror (${capture.pageErrors.length}):\n` +
        capture.pageErrors.map((e) => `    - ${e.message}`).join('\n')
    );
  }
  expect(problems.join('\n\n'), `Route ${routeLabel} is not CSP-clean`).toBe('');
}

const FIXTURE = {
  auditBriefId: '74441863-d52e-4185-860f-50e43e136ec7',
  learningGraphId: 'cd833747-c33f-45bf-b5f4-614d52d3662c',
};
const ADMIN_STATE_PATH = '__tests__/e2e/.auth/admin.json';

test.describe('Phase B — zero CSP violations across every route', () => {
  test.describe('B1 — anonymous routes', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const path of ['login', 'register', 'unauthorized']) {
      test(`anon: /${path}`, async ({ page }) => {
        const capture = attachViolationCapture(page);
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        assertClean(`/${path}`, capture);
      });
    }
  });

  test.describe('B2 + B3 — authenticated public + admin routes', () => {
    test.use({ storageState: ADMIN_STATE_PATH });

    const routes = [
      '',
      'bulletins',
      'search',
      'learning-path',
      'progress',
      `audit-brief/${FIXTURE.auditBriefId}`,
      `learning-path/${FIXTURE.learningGraphId}`,
      'admin',
      'admin/analytics',
      'admin/upload',
      `admin/edit/${FIXTURE.auditBriefId}`,
      `admin/edit/${FIXTURE.auditBriefId}/transcript`,
      'admin/learning-graphs',
      `admin/learning-graphs/${FIXTURE.learningGraphId}`,
      'admin/users',
      'admin/audit-log',
    ];

    for (const path of routes) {
      const label = `/${path}`;
      test(`auth: ${label}`, async ({ page }) => {
        const capture = attachViolationCapture(page);
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        assertClean(label, capture);
      });
    }
  });

  test.describe('B4 — cross-cutting interactions', () => {
    test.use({ storageState: ADMIN_STATE_PATH });

    test('theme toggle + command palette', async ({ page }) => {
      const capture = attachViolationCapture(page);
      await page.goto('', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.keyboard.press('Control+K');
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      assertClean('B4 theme + command palette', capture);
    });
  });
});
