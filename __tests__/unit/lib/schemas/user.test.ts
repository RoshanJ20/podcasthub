/**
 * Unit tests for user Zod schemas.
 *
 * Validates loginSchema, registerSchema, and updateProfileSchema
 * against valid inputs, missing required fields, out-of-range values, and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, updateProfileSchema } from '@/lib/schemas/user';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ password: 'securepass' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('accepts password at boundary of 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'securepass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid registration with displayName', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'securepass',
      displayName: 'John Doe',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid registration without displayName', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'securepass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'invalid',
      password: 'securepass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty displayName', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'securepass',
      displayName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects displayName exceeding 100 characters', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'securepass',
      displayName: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts displayName at boundary of 100 characters', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'securepass',
      displayName: 'a'.repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it('accepts displayName at boundary of 1 character', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'securepass',
      displayName: 'a',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateProfileSchema', () => {
  it('accepts valid displayName', () => {
    const result = updateProfileSchema.safeParse({ displayName: 'Jane Doe' });
    expect(result.success).toBe(true);
  });

  it('rejects empty displayName', () => {
    const result = updateProfileSchema.safeParse({ displayName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects displayName exceeding 100 characters', () => {
    const result = updateProfileSchema.safeParse({
      displayName: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts displayName at boundary of 100 characters', () => {
    const result = updateProfileSchema.safeParse({
      displayName: 'a'.repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it('accepts omitted displayName', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
