/**
 * Skeleton — shadcn/ui primitive wrapping @base-ui/react (and cmdk for Command).
 *
 * Generated via the shadcn CLI and customized with our Tailwind 4 design tokens
 * (see app/globals.css). See https://ui.shadcn.com/docs/components/skeleton for the
 * upstream API contract; component variants here may be more constrained.
 *
 * Exports: Skeleton
 * Styling: cva() variants reference Tailwind 4 tokens; cn() merges class names.
 */
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
