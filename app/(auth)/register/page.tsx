/**
 * Registration page for Podcast Hub v2.
 *
 * @route /register
 */
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';

interface RegisterPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? '/';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Podcast Hub</h1>
          <p className="mt-2 text-muted-foreground">Create your account</p>
        </div>
        <RegisterForm redirectTo={redirectTo} />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
