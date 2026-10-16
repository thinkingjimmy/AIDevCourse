/**
 * [INPUT]: Native span props and class-variance-authority variants.
 * [OUTPUT]: Badge for compact outlined labels and secondary metadata pills.
 * [POS]: Shared shadcn label primitive used across the design previews.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center font-medium whitespace-nowrap', {
  variants: {
    variant: {
      outline: 'h-[18px] rounded-[4px] border border-border px-[5px] font-mono text-[10.5px] leading-none text-muted-foreground',
      secondary: 'h-7 gap-1.5 rounded-md bg-secondary px-2.5 text-[13px] text-foreground',
    },
  },
  defaultVariants: { variant: 'outline' },
});

export function Badge({ variant, className, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span {...props} data-slot="badge" className={cn(badgeVariants({ variant }), className)} />;
}
