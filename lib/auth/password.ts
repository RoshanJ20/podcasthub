/**
 * Password hashing and verification utilities using bcrypt.
 *
 * Salt rounds are configurable via the BCRYPT_SALT_ROUNDS environment
 * variable (defaults to 12).
 */
import bcrypt from 'bcryptjs';

/**
 * Hashes a plaintext password using bcrypt.
 *
 * @param password - The plaintext password to hash.
 * @returns A bcrypt hash string.
 */
export async function hashPassword(password: string): Promise<string> {
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);
  return bcrypt.hash(password, rounds);
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 *
 * @param password - The plaintext password to check.
 * @param hash - The bcrypt hash to compare against.
 * @returns True if the password matches the hash, false otherwise.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
