/**
 * [INPUT]: Radix dialog props, native focus callbacks, and shared surface tokens.
 * [OUTPUT]: Sheet, SheetTitle, and SheetContent for an accessible left-side panel.
 * [POS]: Mobile course sidebar surface; the caller supplies localized title and close control.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import type { ComponentProps } from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Sheet = SheetPrimitive.Root;
export const SheetTitle = SheetPrimitive.Title;

export function SheetContent({ className, children, ...props }: ComponentProps<typeof SheetPrimitive.Content>) {
  return <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-black/50" />
    <SheetPrimitive.Content data-slot="sheet-content" className={cn('fixed inset-y-0 left-0 z-50 flex h-full w-3/4 flex-col gap-4 border-r bg-background shadow-lg sm:max-w-sm', className)} {...props}>
      {children}
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>;
}
