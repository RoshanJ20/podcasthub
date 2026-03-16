/**
 * Unauthorized (403) page for Podcast Hub v2.
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
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground">403</h1>
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You do not have permission to access this page. If you believe this is an error, please
          contact your administrator.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
}
