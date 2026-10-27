/**
 * [INPUT]: Radix DropdownMenu primitives, native composition props, Phosphor chevrons, and shared surface tokens.
 * [OUTPUT]: Dropdown root, trigger, content, items, and composable submenu parts, and optional portal containers for nested sheets.
 * [POS]: Shared shadcn-style action menu with Radix keyboard and focus management.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';

import type { ComponentProps } from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
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
