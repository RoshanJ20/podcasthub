/**
 * Root error boundary for The Audit Brief.
 *
 * Key responsibilities:
 * - Catches unhandled errors at the app root level
 * - Displays user-friendly error message
 * - Provides retry action
 * - Logs unhandled errors via structured Pino logger
 */
'use client';

import { useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('global-error');

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error({ error: error.message, digest: error.digest }, 'Unhandled error');
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,oklch(95%_0.02_264/.4),transparent_52%),var(--background)] p-8">
      <p className="rounded-full border border-border/80 bg-secondary/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        System Alert
      </p>
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md text-center">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
