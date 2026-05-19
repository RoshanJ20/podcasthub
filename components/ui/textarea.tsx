/**
 * Textarea — shadcn/ui primitive wrapping @base-ui/react (and cmdk for Command).
 *
 * Generated via the shadcn CLI and customized with our Tailwind 4 design tokens
 * (see app/globals.css). See https://ui.shadcn.com/docs/components/textarea for the
 * upstream API contract; component variants here may be more constrained.
 *
 * Exports: Textarea
 * Styling: cva() variants reference Tailwind 4 tokens; cn() merges class names.
 */
import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
