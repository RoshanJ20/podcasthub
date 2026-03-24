/**
 * Unit tests for auth environment variable validation.
 *
 * Covers:
 * - validateAuthEnvironment: startup validation for NEXTAUTH_URL and NEXTAUTH_SECRET
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** Typed reference to process.env for test overrides, bypassing readonly NODE_ENV. */
const env = process.env as Record<string, string | undefined>;

/** Store original env values so we can restore them after each test. */
const originalEnv = { ...process.env };

beforeEach(() => {
  // Set baseline valid values
  env.NEXTAUTH_URL = 'http://localhost:3000';
  env.NEXTAUTH_SECRET = 'a-valid-secret-that-is-at-least-32-chars!!';
  env.NODE_ENV = 'test';
});

afterEach(() => {
  Object.keys(env).forEach((key) => delete env[key]);
  Object.assign(env, originalEnv);
  vi.resetModules();
});

/**
 * Dynamic import to re-evaluate module with fresh env on each test.
 */
async function importValidation() {
  const mod = await import('@/lib/auth/env-validation');
  return mod.validateAuthEnvironment;
}

describe('validateAuthEnvironment', () => {
  it('throws when NEXTAUTH_URL is not set', async () => {
    delete process.env.NEXTAUTH_URL;
    const validate = await importValidation();
    expect(() => validate()).toThrow('NEXTAUTH_URL is not set');
  });

  it('throws when NEXTAUTH_URL is not a valid URL', async () => {
    process.env.NEXTAUTH_URL = 'not-a-url';
    const validate = await importValidation();
    expect(() => validate()).toThrow('not a valid URL');
  });

  it('throws when NEXTAUTH_SECRET is not set', async () => {
    delete process.env.NEXTAUTH_SECRET;
    const validate = await importValidation();
    expect(() => validate()).toThrow('NEXTAUTH_SECRET must be at least 32 characters');
  });

  it('throws when NEXTAUTH_SECRET is too short', async () => {
    process.env.NEXTAUTH_SECRET = 'short';
    const validate = await importValidation();
    expect(() => validate()).toThrow('NEXTAUTH_SECRET must be at least 32 characters');
  });

  it('does not throw with valid environment variables', async () => {
    const validate = await importValidation();
    expect(() => validate()).not.toThrow();
  });

  it('warns about localhost in production (via returned warnings)', async () => {
    env.NODE_ENV = 'production';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    const validate = await importValidation();
    const warnings = validate();
    expect(warnings).toContainEqual(expect.stringContaining('localhost'));
  });

  it('warns about HTTP in production (via returned warnings)', async () => {
    env.NODE_ENV = 'production';
    process.env.NEXTAUTH_URL = 'http://auditbrief.example.com';
    const validate = await importValidation();
    const warnings = validate();
    expect(warnings).toContainEqual(expect.stringContaining('HTTP'));
  });

  it('returns no warnings with valid production config', async () => {
    env.NODE_ENV = 'production';
    process.env.NEXTAUTH_URL = 'https://auditbrief.example.com';
    const validate = await importValidation();
    const warnings = validate();
    expect(warnings).toHaveLength(0);
  });
});
