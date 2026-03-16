/**
 * Login page for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Server Component that renders the login form client component
 * - Passes the redirectTo query parameter to the login form
 *
 * Dependencies:
 * - @/components/auth/login-form (LoginForm)
 *
 * @route /login
 */
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { LoginPageCard } from '@/components/auth/login-page-card';

/**
 * Props for the login page, including search params from the URL.
 */
interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

/**
 * Renders the login page with the login form.
 *
 * Reads the optional redirectTo query parameter and passes it to the
 * LoginForm client component for post-login redirection.
 *
 * @param props - Page props including search parameters.
 * @returns The login page JSX.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <LoginPageCard>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Podcast Hub</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your account</p>
        </div>
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
