import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="card" className={cn('flex min-w-0 flex-col overflow-hidden border border-border bg-background text-foreground', className)} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="card-content" className={cn('p-6', className)} />;
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="card-header" className={cn('grid auto-rows-min items-start gap-2 px-6', className)} />;
}

export function CardTitle({ as: Heading = 'h2', className, ...props }: ComponentProps<'h2'> & { as?: 'h2' | 'h3' }) {
  return <Heading {...props} data-slot="card-title" className={cn('font-semibold leading-none', className)} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p {...props} data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} />;
}
