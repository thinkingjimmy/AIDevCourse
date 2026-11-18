'use client';

import type { ComponentProps } from 'react';
import * as DropdownMenuPrimitive from 'radix-ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const contentClass = 'z-[80] min-w-40 max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-24px)] overflow-y-auto rounded-md border border-border bg-background p-1 text-foreground shadow-md outline-none';
const itemClass = 'relative flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground';

export function DropdownMenuContent({ container, className, sideOffset = 6, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Content> & { container?: HTMLElement | null }) {
  return <DropdownMenuPrimitive.Portal container={container}>
    <DropdownMenuPrimitive.Content
      {...props}
      sideOffset={sideOffset}
      data-slot="dropdown-menu-content"
      className={cn(contentClass, className)}
    />
  </DropdownMenuPrimitive.Portal>;
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return <DropdownMenuPrimitive.Item
    {...props}
    data-slot="dropdown-menu-item"
    className={cn(itemClass, className)}
  />;
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label data-slot="dropdown-menu-label" className={cn('px-3 py-1.5 text-sm font-medium text-reading', className)} {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return <DropdownMenuPrimitive.RadioItem data-slot="dropdown-menu-radio-item" className={cn(itemClass, 'justify-between', className)} {...props}>
    {children}
    <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden>
      <DropdownMenuPrimitive.ItemIndicator><CheckIcon size={14} weight="bold" className="text-brand" /></DropdownMenuPrimitive.ItemIndicator>
    </span>
  </DropdownMenuPrimitive.RadioItem>;
}

export function DropdownMenuSubTrigger({ className, children, onPointerLeave, ...props }: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) {
  return <DropdownMenuPrimitive.SubTrigger {...props} data-slot="dropdown-menu-sub-trigger"
    onPointerLeave={(event) => {
      onPointerLeave?.(event);
      if (event.defaultPrevented) return;
      const content = document.getElementById(event.currentTarget.getAttribute('aria-controls') ?? '');
      // Entering a flipped submenu directly must not return focus to its parent.
      if (event.relatedTarget instanceof Node && content?.contains(event.relatedTarget)) event.preventDefault();
    }}
    className={cn(itemClass, 'data-[state=open]:bg-accent', className)}>
    {children}<CaretRightIcon size={14} className="ml-auto" aria-hidden />
  </DropdownMenuPrimitive.SubTrigger>;
}

export function DropdownMenuSubContent({ container, className, sideOffset = 6, ...props }: ComponentProps<typeof DropdownMenuPrimitive.SubContent> & { container?: HTMLElement | null }) {
  return <DropdownMenuPrimitive.Portal container={container}>
    <DropdownMenuPrimitive.SubContent {...props} sideOffset={sideOffset} collisionPadding={12} sticky="always"
      data-slot="dropdown-menu-sub-content" className={cn(contentClass, className)} />
  </DropdownMenuPrimitive.Portal>;
}
