/**
 * Unauthorized (403) page for The Audit Brief.
 *
 * Key responsibilities:
 * - Displays a clear 403 forbidden message
 * - Provides navigation back to the home page
 *
 * @route /unauthorized
 */
import Link from 'next/link';

/**
 * Renders the 403 Unauthorized page.
 *
 * Shown when an authenticated user attempts to access a resource
 * they do not have permission for (e.g., a non-admin accessing /admin).
 *
 * @returns The unauthorized page JSX.
 */
export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,oklch(95%_0.02_264/.4),transparent_50%),var(--background)] px-4">
      <div className="space-y-4 rounded-2xl border border-border-default dark:border-border-subtle bg-elevated/95 p-8 text-center shadow-card">
        <h1 className="text-6xl font-bold text-muted-foreground">403</h1>
        <h2 className="text-2xl font-semibold tracking-tight">Access Denied</h2>
        <p className="max-w-md text-muted-foreground">
          You do not have permission to access this page. If you believe this is an error, please
          contact your administrator.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
}
