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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,oklch(from_var(--brand-500)_95%_0.02_h_/_0.4),transparent_46%),var(--bg-canvas)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,oklch(from_var(--brand-500)_27%_0.06_h_/_0.35),transparent_46%),var(--bg-canvas)]">
      <LoginPageCard>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-border-default bg-subtle/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-secondary-text dark:border-border-subtle dark:bg-surface-muted/40">
            Enterprise Workspace
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-primary-text">
            The Audit Brief
          </h1>
          <p className="text-sm text-secondary-text">Sign in to your account</p>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-danger/50 bg-danger-soft p-3 text-sm text-danger">
            {errorMessage}
          </div>
        )}

        {isSsoConfigured && (
          <>
            <SsoButton redirectTo={redirectTo} />

            <div className="relative flex items-center justify-center">
              <span className="w-full border-t border-border-default dark:border-border-subtle" />
              <span className="absolute bg-elevated px-2 text-xs text-tertiary">or</span>
            </div>
          </>
        )}

        <LoginForm redirectTo={redirectTo} />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-link underline-offset-4 hover:text-link-hover hover:underline dark:text-brand-400 dark:hover:text-link-hover"
          >
            Create one
          </Link>
        </p>
      </LoginPageCard>
    </main>
  );
}
