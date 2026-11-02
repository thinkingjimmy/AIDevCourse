'use client';
import type { ComponentProps } from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Sheet = SheetPrimitive.Root;
export const SheetTitle = SheetPrimitive.Title;

export function SheetContent({ side = 'left', className, overlayClassName, children, ...props }: ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'left' | 'bottom'; overlayClassName?: string;
}) {
  return <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay data-slot="sheet-overlay" className={cn('fixed inset-0 z-50 bg-black/50', overlayClassName)} />
    <SheetPrimitive.Content data-slot="sheet-content" data-side={side} className={cn('fixed z-50 flex flex-col bg-background shadow-lg',
      side === 'bottom' ? 'inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-12px)] w-full max-w-160 rounded-t-[28px]' : 'inset-y-0 left-0 h-full w-3/4 gap-4 border-r sm:max-w-sm', className)} {...props}>
      {children}
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>;
}
