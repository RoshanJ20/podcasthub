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
import { redirect } from 'next/navigation';
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
  // Registration is disabled when SSO is configured — redirect to login
  if (process.env.AZURE_AD_CLIENT_ID) {
    redirect('/login');
  }

  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <LoginPageCard>
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight">The Audit Brief</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create your account</p>
        </div>
        <RegisterForm redirectTo={redirectTo} />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </LoginPageCard>
    </main>
  );
}
