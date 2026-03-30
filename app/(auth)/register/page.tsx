/**
 * Registration page for The Audit Brief.
 *
 * Renders a centered card containing the RegisterForm component. Accepts an
 * optional `redirectTo` search parameter so that users who land here after
 * being redirected from a protected route are sent back to their intended
 * destination on successful registration. Falls back to "/" when the parameter
 * is absent. The page is a React Server Component — form interactivity is
 * handled inside the RegisterForm Client Component.
 *
 * @route /register
 */
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
import { LoginPageCard } from '@/components/auth/login-page-card';

interface RegisterPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

/**
 * Renders the registration page.
 *
 * Resolves the `redirectTo` search parameter from the async searchParams
 * promise and passes it to RegisterForm so the user is forwarded to their
 * original destination after a successful sign-up.
 *
 * @param props - Page props supplied by Next.js.
 * @param props.searchParams - Promise resolving to the parsed query string.
 *   The `redirectTo` field, when present, specifies the post-registration
 *   destination; defaults to "/" when absent.
 * @returns The full-screen centered registration card.
 */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,oklch(95%_0.02_264/.45),transparent_46%),var(--background)] px-4 py-10">
      <LoginPageCard>
        <div className="space-y-2 text-center">
          <p className="inline-flex rounded-full border border-border-default dark:border-border-subtle bg-secondary/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            New Member Setup
          </p>
          <h1 className="text-xl font-semibold tracking-tight">The Audit Brief</h1>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </div>
        <RegisterForm redirectTo={redirectTo} />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </LoginPageCard>
    </main>
  );
}
