/**
 * Registration page for Podcast Hub v2.
 *
 * @route /register
 */
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
import { LoginPageCard } from '@/components/auth/login-page-card';

interface RegisterPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <LoginPageCard>
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight">Podcast Hub</h1>
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
