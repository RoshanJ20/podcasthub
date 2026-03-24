/**
 * NextAuth v4 API route handler for The Audit Brief.
 *
 * Key responsibilities:
 * - Exports GET and POST handlers for the NextAuth /api/auth/* endpoints
 * - Handles sign-in, sign-out, session, and OAuth callbacks
 *
 * Dependencies:
 * - next-auth (NextAuth)
 * - @/lib/auth/next-auth-options (authOptions)
 *
 * @route GET|POST /api/auth/[...nextauth]
 */
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/next-auth-options';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
