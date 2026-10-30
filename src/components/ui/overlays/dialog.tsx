'use client';
import type { ComponentProps } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, overlayClassName, children, ...props }: ComponentProps<typeof DialogPrimitive.Content> & { overlayClassName?: string }) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn('fixed inset-0 z-[70] bg-[#1f1e1a66]', overlayClassName)} />
    <DialogPrimitive.Content {...props} data-slot="dialog-content" className={cn(
      'fixed top-[14vh] left-1/2 z-[71] flex max-h-[calc(100dvh-64px)] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-[14px] border border-border bg-background shadow-[0_24px_64px_#09090b1f] max-sm:top-[8vh]',
      className,
    )}>{children}</DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}
