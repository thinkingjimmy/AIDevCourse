/**
 * [INPUT]: Radix dialog composition and Tailwind surface classes.
 * [OUTPUT]: Dialog, DialogContent, DialogTitle, DialogDescription, and DialogClose.
 * [POS]: Shared shadcn dialog surface; search keeps its existing focus and keyboard behavior.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import type { ComponentProps } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-[70] bg-[#1f1e1a66]" />
    <DialogPrimitive.Content {...props} data-slot="dialog-content" className={cn(
      'fixed top-[14vh] left-1/2 z-[71] flex max-h-[calc(100dvh-64px)] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-[14px] border border-border bg-background shadow-[0_24px_64px_#09090b1f] max-sm:top-[8vh]',
      className,
    )}>{children}</DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}
