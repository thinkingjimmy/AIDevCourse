'use client';

import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Adapted from the shadcn/ui New York Input Group registry.
export function InputGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="input-group" role="group" className={cn(
    'group/input-group relative flex h-9 w-full min-w-0 items-center rounded-md border border-input shadow-xs outline-none dark:bg-input/30',
    'has-[>textarea]:h-auto has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2',
    'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
    'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',
    'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50',
    'has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
    className,
  )} {...props} />;
}

const addonVariants = cva('flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none', {
  variants: {
    align: {
      'inline-start': 'order-first pl-3 has-[>button]:-ml-1.5',
      'inline-end': 'order-last pr-3 has-[>button]:-mr-1.5',
      'block-start': 'order-first w-full justify-start px-3 pt-3',
      'block-end': 'order-last w-full justify-start px-3 pb-3',
    },
  },
  defaultVariants: { align: 'inline-start' },
});

export function InputGroupAddon({ className, align = 'inline-start', ...props }: ComponentProps<'div'> & VariantProps<typeof addonVariants>) {
  return <div role="group" data-slot="input-group-addon" data-align={align} className={cn(addonVariants({ align }), className)} onClick={(event) => {
    const target = event.target as Element;
    if (event.currentTarget.contains(target) && !target.closest('button')) {
      event.currentTarget.parentElement?.querySelector<HTMLElement>('[data-slot="input-group-control"]')?.focus();
    }
  }} {...props} />;
}

export function InputGroupButton({ className, type = 'button', variant = 'ghost', size = 'xs', ...props }: ComponentProps<typeof Button>) {
  return <Button type={type} variant={variant} size={size} className={cn('shadow-none', className)} {...props} />;
}

export function InputGroupTextarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <Textarea data-slot="input-group-control" className={cn(
    'flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent',
    className,
  )} {...props} />;
}
