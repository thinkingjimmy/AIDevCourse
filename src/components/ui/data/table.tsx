/**
 * [INPUT]: Native table element props, shared Tailwind tokens, and cn class composition.
 * [OUTPUT]: Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, and TableCaption.
 * [POS]: Shared shadcn-style data primitives, used by the MDX registry for all authored tables.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <div data-slot="table-container" className="not-prose relative w-full overflow-x-auto border border-border bg-background">
    <table tabIndex={0} {...props} data-slot="table" className={cn('w-full caption-bottom border-collapse text-[14px] leading-[1.7] text-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring', className)} />
  </div>;
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead {...props} data-slot="table-header" className={cn('bg-muted text-foreground', className)} />;
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody {...props} data-slot="table-body" className={cn('[&_tr:last-child]:border-b-0', className)} />;
}

export function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
  return <tfoot {...props} data-slot="table-footer" className={cn('border-t border-border bg-surface font-medium [&_tr:last-child]:border-b-0', className)} />;
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr {...props} data-slot="table-row" className={cn('border-b border-border', className)} />;
}

export function TableHead({ className, align, ...props }: ComponentProps<'th'>) {
  return <th scope="col" {...props} align={align} data-slot="table-head" className={cn('px-4 py-3 align-top font-semibold', align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-start', className)} />;
}

export function TableCell({ className, align, ...props }: ComponentProps<'td'>) {
  return <td {...props} align={align} data-slot="table-cell" className={cn('px-4 py-3 align-top', align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-start', className)} />;
}

export function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
  return <caption {...props} data-slot="table-caption" className={cn('px-4 py-3 text-start text-muted-foreground', className)} />;
}
