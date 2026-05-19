/**
 * Label — shadcn/ui primitive wrapping @base-ui/react (and cmdk for Command).
 *
 * Generated via the shadcn CLI and customized with our Tailwind 4 design tokens
 * (see app/globals.css). See https://ui.shadcn.com/docs/components/label for the
 * upstream API contract; component variants here may be more constrained.
 *
 * Exports: Label
 * Styling: cva() variants reference Tailwind 4 tokens; cn() merges class names.
 */
'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Label };
