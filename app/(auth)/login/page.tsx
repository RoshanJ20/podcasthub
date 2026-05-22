/**
 * Login page for The Audit Brief.
 *
 * Key responsibilities:
 * - Server Component that renders the wordmark, SSO button, and login form
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
import { AuditBriefLogo } from '@/components/branding/audit-brief-logo';
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
 * Renders the login page with wordmark, SSO button, and email/password form.
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
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <main className="bg-brand-glow flex min-h-screen items-center justify-center px-4 py-10">
      <LoginPageCard>
        <div className="flex flex-col items-center gap-3 text-center">
          <AuditBriefLogo className="h-12 w-auto text-foreground" />
          <p className="text-sm text-muted-foreground">Continue to your account</p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {errorMessage}
          </div>
        )}

        {isSsoConfigured && <SsoButton redirectTo={redirectTo} />}

        {isSsoConfigured && isDevelopment && (
          <div className="relative flex items-center justify-center">
            <span className="w-full border-t border-border-subtle" />
            <span className="label-eyebrow absolute bg-elevated px-3">or</span>
          </div>
        )}

        {isDevelopment && <LoginForm redirectTo={redirectTo} />}

        {isDevelopment && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-link underline-offset-4 hover:text-link-hover hover:underline"
            >
              Create one
            </Link>
          </p>
        )}
      </LoginPageCard>
    </main>
  );
}
