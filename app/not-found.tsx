/**
 * Custom 404 page for The Audit Brief.
 *
 * Key responsibilities:
 * - Displays user-friendly 404 message
 * - Provides navigation back to home
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,oklch(95%_0.02_264/.4),transparent_52%),var(--background)] p-8">
      <p className="rounded-full border border-border-default dark:border-border-subtle bg-secondary/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Not Found
      </p>
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Go home
      </Link>
    </div>
  );
}
