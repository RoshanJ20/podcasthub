/**
 * Custom 404 page for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Displays user-friendly 404 message
 * - Provides navigation back to home
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
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
