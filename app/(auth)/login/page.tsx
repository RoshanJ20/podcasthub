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

/** Map of error codes to user-friendly messages (NextAuth + legacy SSO). */
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password.',
  OAuthSignin: 'Failed to start Microsoft sign-in. Please try again.',
  OAuthCallback: 'Failed to complete sign-in with Microsoft. Please try again.',
  OAuthAccountNotLinked: 'This email is already registered with a different sign-in method.',
  Default: 'An unexpected error occurred during sign-in. Please try again.',
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
  const errorMessage = params.error
    ? (ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.Default)
    : undefined;
  const isSsoConfigured = Boolean(process.env.AZURE_AD_CLIENT_ID);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <LoginPageCard>
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight">The Audit Brief</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {isSsoConfigured && <SsoButton redirectTo={redirectTo} />}

        {!isSsoConfigured && (
          <>
            <LoginForm redirectTo={redirectTo} />

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
          </>
        )}
      </LoginPageCard>
    </main>
  );
}
