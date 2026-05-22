/**
 * Custom 404 page for The Audit Brief.
 *
 * Key responsibilities:
 * - Displays user-friendly 404 message
 * - Provides navigation back to home
 */
import Link from 'next/link';
import { AuditBriefLogo } from '@/components/branding/audit-brief-logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <AuditBriefLogo className="h-8 w-auto text-foreground" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Go home
      </Link>
    </div>
  );
}
