import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="card" className={cn('flex min-w-0 flex-col overflow-hidden border border-border bg-background text-foreground', className)} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="card-content" className={cn('p-6', className)} />;
}
