/**
 * [INPUT]: Native aside props and shared Tailwind notification tokens.
 * [OUTPUT]: Alert, AlertTitle, and AlertDescription with callout, plain notice, and author-note variants.
 * [POS]: shadcn-style notification composition shared by MDX and course surfaces.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('bg-background [&_p]:m-0', {
  variants: {
    variant: {
      default: 'my-[1.5em] flex gap-3.5 border border-foreground px-5 py-[18px] shadow-[4px_4px_0_var(--line)]',
      notice: 'block border border-border px-5 py-4 text-ui',
      author: 'my-[1.5em] flex flex-col gap-2 bg-author-note p-4 text-author-note-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Alert({ className, variant, ...props }: ComponentProps<'aside'> & VariantProps<typeof alertVariants>) {
  return <aside {...props} data-slot="alert" className={cn(alertVariants({ variant }), className)} />;
}

export function AlertTitle({ className, ...props }: ComponentProps<'strong'>) {
  return <strong {...props} data-slot="alert-title" className={cn('text-foreground', className)} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="alert-description" className={cn('flex min-w-0 flex-col gap-1 text-ui leading-reading', className)} />;
}
