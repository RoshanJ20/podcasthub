/**
 * Zod schemas for user authentication and profile validation.
 *
 * Provides schemas for login, registration, and profile updates.
 */
import { z } from 'zod';

/** Minimum password length per OWASP recommendations. */
const MIN_PASSWORD_LENGTH = 12;

/**
 * Password schema enforcing OWASP-compliant complexity requirements.
 *
 * Requires at least 12 characters with uppercase, lowercase, digit, and special character.
 */
const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Schema for user login.
 *
 * Requires a valid email and a non-empty password. Login intentionally uses a
 * relaxed password check (min 1 char) so that users with legacy shorter passwords
 * can still authenticate. Complexity is enforced only at registration.
 */
export const loginSchema = z.object({
  /** User email address. */
  email: z.email(),
  /** User password. */
  password: z.string().min(1, 'Password is required'),
});

/** Inferred type for login input. */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for user registration.
 *
 * Requires a valid email and a strong password (min 12 chars, mixed case, digit, special).
 * Display name is optional (1-100 characters).
 */
export const registerSchema = z.object({
  /** User email address. */
  email: z.email(),
  /** User password (OWASP-compliant: min 12 chars, uppercase, lowercase, digit, special). */
  password: passwordSchema,
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

/**
 * Schema for the SSO state stored in the sso_state cookie.
 *
 * Contains the CSRF token, nonce for ID token replay protection,
 * and an optional post-login redirect path.
 */
export const ssoStateSchema = z.object({
  /** CSRF token (minimum 32 characters). */
  csrf: z.string().min(32),
  /** Nonce for ID token validation (minimum 32 characters). */
  nonce: z.string().min(32),
  /** Optional redirect path after SSO completion. */
  redirectTo: z.string().optional(),
});

/** Inferred type for SSO state. */
export type SsoState = z.infer<typeof ssoStateSchema>;
