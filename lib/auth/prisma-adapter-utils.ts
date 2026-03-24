/**
 * Shared utilities for the custom Prisma adapter.
 *
 * Key responsibilities:
 * - Maps Prisma User records to NextAuth AdapterUser shape
 * - Centralizes the displayName → name mapping used across all adapter methods
 *
 * Dependencies:
 * - next-auth/adapters (AdapterUser type)
 */
import type { AdapterUser } from 'next-auth/adapters';

/**
 * Shape of a Prisma User record as returned by queries.
 * Only includes fields needed for the AdapterUser mapping.
 */
export interface PrismaUserRecord {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: string;
}

/**
 * Maps a Prisma User record to the NextAuth AdapterUser shape,
 * converting the `displayName` column to the `name` property
 * expected by NextAuth.
 *
 * @param user - The Prisma User record.
 * @returns An AdapterUser-compatible object.
 */
export function mapUserToAdapterUser(user: PrismaUserRecord): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    name: user.displayName,
    emailVerified: user.emailVerified,
    image: user.image,
    role: user.role,
    displayName: user.displayName,
  } as AdapterUser;
}
