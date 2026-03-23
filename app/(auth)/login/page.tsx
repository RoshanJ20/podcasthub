/**
 * Login page for The Audit Brief.
 *
 * Key responsibilities:
 * - Server Component that renders the SSO button and login form
 * - Passes the redirectTo query parameter to auth components
 * - Displays SSO error messages when redirected from a failed SSO attempt
 *
 * Dependencies:
 * - @/components/auth/login-form (LoginForm)
 * - @/components/auth/login-page-card (LoginPageCard)
 * - @/components/auth/sso-button (SsoButton)
 *
 * @route /login
 */
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { LoginPageCard } from '@/components/auth/login-page-card';
import { SsoButton } from '@/components/auth/sso-button';

/**
 * Props for the login page, including search params from the URL.
 */
interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}

/** Map of SSO error codes to user-friendly messages. */
const SSO_ERROR_MESSAGES: Record<string, string> = {
  sso_cancelled: 'Sign-in was cancelled. Please try again.',
  sso_state_expired: 'Your sign-in session expired. Please try again.',
  sso_state_mismatch: 'Sign-in verification failed. Please try again.',
  sso_state_invalid: 'Sign-in session was corrupted. Please try again.',
  sso_invalid_request: 'Invalid sign-in request. Please try again.',
  sso_token_exchange_failed: 'Failed to complete sign-in with Microsoft. Please try again.',
  sso_token_invalid: 'Sign-in token validation failed. Please try again.',
  sso_claims_invalid: 'Could not retrieve your account information from Microsoft.',
  sso_not_configured: 'Microsoft sign-in is not configured. Please contact your administrator.',
  sso_error: 'An unexpected error occurred during sign-in. Please try again.',
};

/**
 * Renders the login page with SSO button and email/password form.
 *
 * Reads the optional redirectTo and error query parameters. Displays
 * the SSO button as the primary login method with email/password as fallback.
 *
 * @param props - Page props including search parameters.
 * @returns The login page JSX.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';
  const ssoError = params.error ? SSO_ERROR_MESSAGES[params.error] : undefined;
  const isSsoConfigured = Boolean(process.env.ENTRA_CLIENT_ID);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <LoginPageCard>
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight">The Audit Brief</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {ssoError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {ssoError}
          </div>
        )}

        {isSsoConfigured && (
          <>
            <SsoButton redirectTo={redirectTo} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
          </>
        )}

        <LoginForm redirectTo={redirectTo} />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </LoginPageCard>
    </main>
  );
}
