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
import { AuditBriefLogo } from '@/components/branding/audit-brief-logo';
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <AuditBriefLogo className="h-10 w-auto text-foreground md:h-12" />
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md text-center">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
