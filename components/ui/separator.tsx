/**
 * Separator — shadcn/ui primitive wrapping @base-ui/react (and cmdk for Command).
 *
 * Generated via the shadcn CLI and customized with our Tailwind 4 design tokens
 * (see app/globals.css). See https://ui.shadcn.com/docs/components/separator for the
 * upstream API contract; component variants here may be more constrained.
 *
 * Exports: Separator
 * Styling: cva() variants reference Tailwind 4 tokens; cn() merges class names.
 */
'use client';

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '@/lib/utils';

function Separator({ className, orientation = 'horizontal', ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch',
        className
      )}
      {...props}
    />
  );
}

export { Separator };
