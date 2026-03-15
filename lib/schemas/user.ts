/**
 * Zod schemas for user authentication and profile validation.
 *
 * Provides schemas for login, registration, and profile updates.
 */
import { z } from 'zod';

/**
 * Schema for user login.
 *
 * Requires a valid email and a password of at least 8 characters.
 */
export const loginSchema = z.object({
  /** User email address. */
  email: z.email(),
  /** User password (minimum 8 characters). */
  password: z.string().min(8),
});

/** Inferred type for login input. */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for user registration.
 *
 * Requires a valid email and password. Display name is optional (1-100 characters).
 */
export const registerSchema = z.object({
  /** User email address. */
  email: z.email(),
  /** User password (minimum 8 characters). */
  password: z.string().min(8),
  /** Optional display name (1-100 characters when provided). */
  displayName: z.string().min(1).max(100).optional(),
});

/** Inferred type for registration input. */
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema for updating user profile.
 *
 * All fields are optional. Display name must be 1-100 characters when provided.
 */
export const updateProfileSchema = z.object({
  /** Optional display name (1-100 characters when provided). */
  displayName: z.string().min(1).max(100).optional(),
});

/** Inferred type for profile update input. */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
