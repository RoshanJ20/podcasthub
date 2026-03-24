/**
 * NextAuth v4 configuration for The Audit Brief.
 *
 * Key responsibilities:
 * - Configures Credentials provider for email/password login (bcrypt verification)
 * - Configures Azure AD provider for Microsoft Entra ID SSO
 * - Injects user role into JWT and session via callbacks
 * - Handles SSO account linking in the signIn callback
 * - Uses custom Prisma adapter for name ↔ displayName mapping
 *
 * Dependencies:
 * - next-auth (NextAuthOptions)
 * - @/lib/auth/password (verifyPassword)
 * - @/lib/auth/prisma-adapter (createPrismaAdapter)
 * - @/lib/db (prisma)
 * - @/lib/logger (createLogger)
 */
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { verifyPassword } from '@/lib/auth/password';
import { createPrismaAdapter } from '@/lib/auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { revokeToken, isTokenRevoked } from '@/lib/auth/token-revocation';

const log = createLogger('next-auth');

/**
 * Builds the list of NextAuth providers based on available environment variables.
 *
 * @returns Array of configured NextAuth providers.
 */
function buildProviders(): NextAuthOptions['providers'] {
  const providers: NextAuthOptions['providers'] = [];

  providers.push(
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        if (!user.passwordHash) {
          log.warn({ email: credentials.email }, 'SSO-only user attempted password login');
          return null;
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          image: user.image,
          role: user.role,
          displayName: user.displayName,
        };
      },
    })
  );

  if (
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  ) {
    providers.push(
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        tenantId: process.env.AZURE_AD_TENANT_ID,
      })
    );
  }

  return providers;
}

/**
 * Central NextAuth configuration exported for use in the API route and getServerSession calls.
 */
export const authOptions: NextAuthOptions = {
  adapter: createPrismaAdapter(prisma),
  providers: buildProviders(),

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    /**
     * Injects role, userId, and jti into the JWT on sign-in and subsequent token refreshes.
     * For credentials sign-in, the user object comes from authorize().
     * For OAuth sign-in, we look up the role from the database.
     * Checks the token revocation store to invalidate logged-out sessions.
     */
    async jwt({ token, user, account }) {
      // Check if the token has been revoked (e.g., via logout)
      if (token.jti && isTokenRevoked(token.jti as string)) {
        return { ...token, userId: '', role: '' };
      }

      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: string }).role ?? 'public';
        // Assign a unique JTI for revocation tracking
        if (!token.jti) {
          token.jti = crypto.randomUUID();
        }
      }

      if (account?.provider === 'azure-ad' && token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },

    /**
     * Exposes userId and role on the client-side session object.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
      }
      return session;
    },

    /**
     * Handles SSO account linking for Azure AD.
     * When an existing user (by email) signs in via SSO for the first time,
     * links the account and updates authProvider.
     */
    async signIn({ user, account }) {
      if (account?.provider === 'azure-ad' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            try {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state as string | null,
                },
              });

              const newAuthProvider = existingUser.passwordHash ? 'both' : 'entra_id';
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  entraId: account.providerAccountId,
                  authProvider: newAuthProvider,
                  ...(existingUser.displayName ? {} : { displayName: user.name }),
                },
              });

              log.info(
                { userId: existingUser.id, email: user.email },
                'Linked existing account with Azure AD'
              );
            } catch (linkError) {
              log.error(
                { error: linkError, email: user.email, provider: account.provider },
                'Failed to link Azure AD account'
              );
              return false;
            }
          }

          // Set user.id to existing user so JWT callback gets the right ID
          user.id = existingUser.id;
        }
      }

      return true;
    },
  },

  events: {
    /**
     * Revokes the JWT on sign-out so it cannot be reused if stolen.
     */
    async signOut({ token }) {
      if (token?.jti) {
        revokeToken(token.jti as string);
        log.info({ userId: token.userId }, 'Token revoked on sign-out');
      }
    },
  },
};
