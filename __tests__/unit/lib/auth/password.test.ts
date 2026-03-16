/**
 * Unit tests for password hashing and verification utilities.
 *
 * Covers bcrypt-based hashing with salt rounds and password comparison.
 */
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('hashPassword', () => {
  it('returns a string starting with "$2"', async () => {
    const hash = await hashPassword('my-secret-password');
    expect(hash).toBeTypeOf('string');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('produces different hashes for the same input (salt)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const password = 'correct-password';
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('original-password');
    const result = await verifyPassword('wrong-password', hash);
    expect(result).toBe(false);
  });
});
