/**
 * NextAuth v4 configuration for The Audit Brief.
 *
 * Key responsibilities:
 * - Configures Credentials provider for email/password login (bcrypt verification)
 * - Configures Azure AD provider for Microsoft Entra ID SSO (with email fallback)
 * - Injects user role into JWT and session via callbacks
 * - Handles SSO account linking in the signIn callback (with P2002 race handling)
 * - Uses custom Prisma adapter for name ↔ displayName mapping
 * - Delegates NextAuth internal errors to Pino structured logger
 * - Validates auth-critical environment variables at startup
 *
 * Dependencies:
 * - next-auth (NextAuthOptions)
 * - @/lib/auth/password (verifyPassword)
 * - @/lib/auth/prisma-adapter (createPrismaAdapter)
 * - @/lib/auth/azure-ad-utils (extractAzureAdEmail)
 * - @/lib/auth/nextauth-logger (buildNextAuthLogger)
 * - @/lib/auth/env-validation (validateAuthEnvironment)
 * - @/lib/db (prisma)
 * - @/lib/logger (createLogger)
 */
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { verifyPassword } from '@/lib/auth/password';
import { createPrismaAdapter } from '@/lib/auth/prisma-adapter';
import { extractAzureAdEmail } from '@/lib/auth/azure-ad-utils';
import { buildNextAuthLogger } from '@/lib/auth/nextauth-logger';
import { validateAuthEnvironment } from '@/lib/auth/env-validation';
import { linkAzureAdAccount } from '@/lib/auth/account-linking';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { revokeToken, isTokenRevoked } from '@/lib/auth/token-revocation';
import { trackActivity } from '@/lib/analytics/track-activity';

const log = createLogger('next-auth');

/* Validate auth environment variables at module load time.
 * Throws on missing/invalid required vars; logs warnings for production misconfigs. */
if (process.env.NODE_ENV !== 'test') {
  const warnings = validateAuthEnvironment();
  warnings.forEach((warning) => log.warn(warning));
}

/**
 * Builds the list of NextAuth providers based on available environment variables.
 *
 * @returns Array of configured NextAuth providers.
 */
function buildProviders(): NextAuthOptions['providers'] {
  const providers: NextAuthOptions['providers'] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  /* Credentials provider is only available outside production (defense in depth).
   * In production, only Azure AD SSO is permitted for authentication. */
  if (!isProduction) {
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

          /* Unknown email: do not persist signin_failed to avoid building an
           * enumeration corpus of attempted addresses. Pino warn only. */
          if (!user) {
            log.warn({ email: credentials.email }, 'Login attempt for unknown email');
            return null;
          }

          if (!user.passwordHash) {
            log.warn({ email: credentials.email }, 'SSO-only user attempted password login');
            await trackActivity({
              userId: user.id,
              activityType: 'signin_failed',
              metadata: { provider: 'credentials', reason: 'sso_only_user' },
            });
            return null;
          }

          const isValid = await verifyPassword(credentials.password, user.passwordHash);
          if (!isValid) {
            await trackActivity({
              userId: user.id,
              activityType: 'signin_failed',
              metadata: { provider: 'credentials', reason: 'invalid_password' },
            });
            return null;
          }

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
  }

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
        /**
         * Custom profile callback to handle Azure AD tenants that return
         * the email in `preferred_username` or `mail` instead of `email`.
         * Without this, SSO fails with a 500 error when the email field is empty.
         */
        profile(profile) {
          // AzureADProfile extends Record<string, any>, safe to access arbitrary fields
          const email = extractAzureAdEmail(profile);
          if (!email) {
            log.error(
              { profileFields: Object.keys(profile) },
              'Azure AD profile contains no usable email field'
            );
            throw new Error('Azure AD profile has no email, preferred_username, or mail field');
          }

          return {
            id: profile.sub,
            name: profile.name ?? null,
            email,
            image: null,
            role: 'public',
            displayName: profile.name ?? null,
          };
        },
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
  logger: buildNextAuthLogger(log),

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
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.userId },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
          }
        } catch (roleError) {
          log.error(
            { error: roleError, userId: token.userId },
            'Failed to look up user role during JWT callback — using default role'
          );
          // Keep whatever role was already assigned (from user object or default 'public')
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
            const linked = await linkAzureAdAccount(existingUser, account, user.name);
            if (!linked) return false;
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
     * Persists a `signin` UserActivity row capturing the provider and whether
     * this is a first-time signup. Used for sign-in volume, provider mix, and
     * cohort analytics.
     */
    async signIn({ user, account, isNewUser }) {
      if (!user?.id || !account?.provider) return;
      const provider = account.provider === 'azure-ad' ? 'azure-ad' : 'credentials';
      await trackActivity({
        userId: user.id,
        activityType: 'signin',
        metadata: { provider, isNewUser: Boolean(isNewUser) },
      });
    },

    /**
     * Revokes the JWT on sign-out so it cannot be reused if stolen, and
     * persists a `signout` UserActivity row for session-duration analytics.
     */
    async signOut({ token }) {
      if (token?.jti) {
        revokeToken(token.jti as string);
        log.info({ userId: token.userId }, 'Token revoked on sign-out');
      }
      if (token?.userId) {
        await trackActivity({
          userId: token.userId as string,
          activityType: 'signout',
        });
      }
    },
  },
};
