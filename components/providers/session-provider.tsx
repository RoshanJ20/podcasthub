/**
 * NextAuth SessionProvider wrapper for The Audit Brief.
 *
 * Key responsibilities:
 * - Wraps children with NextAuth's SessionProvider for client-side session access
 * - Enables useSession() hook in client components
 *
 * Dependencies:
 * - next-auth/react (SessionProvider)
 */
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

/**
 * Props for the SessionProvider component.
 */
interface SessionProviderProps {
  /** Child components that need access to the session context. */
  children: React.ReactNode;
}

/**
 * Client-side wrapper that provides NextAuth session context to the component tree.
 *
 * @param props - Component props containing children to wrap.
 * @returns The children wrapped in NextAuth's SessionProvider.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
