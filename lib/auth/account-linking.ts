/**
 * Azure AD account linking logic for The Audit Brief.
 *
 * Key responsibilities:
 * - Links Azure AD OAuth accounts to existing database users
 * - Handles P2002 unique constraint race conditions from concurrent SSO tabs
 * - Updates the user's authProvider and entraId fields
 *
 * Dependencies:
 * - @prisma/client (Prisma)
 * - @/lib/db (prisma)
 * - @/lib/logger (createLogger)
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('account-linking');

/** Minimal user shape needed for account linking. */
export interface LinkableUser {
  id: string;
  email: string;
  passwordHash: string | null;
  displayName: string | null;
}

/** OAuth account data shape needed for linking. */
export interface OAuthAccountData {
  type: string;
  provider: string;
  providerAccountId: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
}

/**
 * Creates the Azure AD account link and updates the user's authProvider field.
 * Handles P2002 (unique constraint) race conditions from concurrent SSO tabs.
 *
 * @param existingUser - The existing database user to link the account to.
 * @param account - The OAuth account data from Azure AD.
 * @param userName - The display name from the Azure AD profile.
 * @returns True if linking succeeded or was already done; false if a non-recoverable error occurred.
 */
export async function linkAzureAdAccount(
  existingUser: LinkableUser,
  account: OAuthAccountData,
  userName: string | null | undefined
): Promise<boolean> {
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
        ...(existingUser.displayName ? {} : { displayName: userName }),
      },
    });

    log.info(
      { userId: existingUser.id, email: existingUser.email },
      'Linked existing account with Azure AD'
    );
    return true;
  } catch (linkError) {
    // P2002: unique constraint violation — concurrent tab already created
    // this account link. Recoverable race condition — continue sign-in.
    if (linkError instanceof Prisma.PrismaClientKnownRequestError && linkError.code === 'P2002') {
      log.warn(
        { email: existingUser.email, provider: account.provider },
        'Account link already exists (concurrent P2002) — continuing sign-in'
      );
      return true;
    }

    log.error(
      { error: linkError, email: existingUser.email, provider: account.provider },
      'Failed to link Azure AD account'
    );
    return false;
  }
}
