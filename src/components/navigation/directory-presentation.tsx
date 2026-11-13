'use client';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';
import { Tooltip } from 'radix-ui';
import { SidebarHeader, SidebarMenuSubButton, SidebarTrigger } from './sidebar';

export const directoryStyles = {
  title: 'block min-w-0 rounded-md p-2 min-[961px]:pl-5 text-base leading-snug font-semibold text-foreground max-[961px]:flex max-[961px]:min-h-11 max-[961px]:items-center',
  group: 'm-0 p-2 max-[961px]:px-4 max-[961px]:pb-4',
  tree: 'course-navigation flex flex-col gap-1.5 text-sm',
  category: 'group/module h-auto w-full items-baseline justify-start gap-2 max-[961px]:min-h-12 rounded-md p-2 min-[961px]:pl-5 font-sans text-sm leading-snug font-medium text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand focus-visible:ring-0',
  categoryNumber: 'shrink-0 font-mono text-caption font-normal text-sidebar-foreground tabular-nums',
  caret: 'ml-1 inline-block size-3.5 align-[-0.125em] text-muted-foreground opacity-0 group-hover/module:opacity-100 group-focus-visible/module:opacity-100 [@media(hover:none)]:opacity-100',
  submenu: 'm-0 translate-x-0 gap-0.5 border-0 p-0',
  link: 'h-auto w-full translate-x-0 max-[961px]:min-h-12 rounded-md p-2 min-[961px]:pl-5 text-sm leading-normal font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-brand data-[active=true]:bg-sidebar-active data-[active=true]:font-bold data-[active=true]:text-brand data-[active=true]:hover:bg-sidebar-active focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand focus-visible:ring-0',
  number: 'w-7 shrink-0 font-mono text-caption font-normal text-sidebar-foreground tabular-nums',
  label: 'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap max-[961px]:overflow-visible max-[961px]:whitespace-normal',
};

export function DirectoryHeader({ title, toggleLabel, children }: { title: ReactNode; toggleLabel: string; children?: ReactNode }) {
  return <SidebarHeader className="w-full p-2 max-[961px]:px-5 max-[961px]:pt-1">
    <div className="flex min-h-11 items-center justify-between gap-3">
      {title}
      <SidebarTrigger aria-label={toggleLabel} title={toggleLabel} className="max-[961px]:size-11 max-[961px]:rounded-full max-[961px]:bg-muted max-[961px]:before:inset-0" />
    </div>
    {children}
  </SidebarHeader>;
}

export function DirectoryNavigation({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip.Provider delayDuration={350}>
    <nav aria-label={label} className={directoryStyles.tree}>{children}</nav>
  </Tooltip.Provider>;
}

export function DirectoryLink({ label, number, announceNumber = true, isActive = false, children, ...props }:
  Omit<ComponentProps<typeof Link>, 'aria-current'> & { label: string; number: string; announceNumber?: boolean; isActive?: boolean }) {
  const text = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  return <Tooltip.Root open={open} onOpenChange={next => {
    const title = text.current;
    setOpen(next && !!title && title.scrollWidth > title.clientWidth && getComputedStyle(title).overflowX === 'hidden');
  }}>
    <Tooltip.Trigger asChild>
      <SidebarMenuSubButton asChild isActive={isActive} className={directoryStyles.link}>
        <Link {...props} aria-current={isActive ? 'page' : undefined}>
          <span className={directoryStyles.number} aria-hidden={announceNumber ? undefined : true}>{number}{' '}</span>
          <span ref={text} className={directoryStyles.label}>{label}</span>
          {children}
        </Link>
      </SidebarMenuSubButton>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content role="presentation" data-slot="directory-title-tooltip" side="right" sideOffset={8} collisionPadding={16} hideWhenDetached
        className="quote-frame z-40 w-max max-w-[min(20rem,var(--radix-tooltip-content-available-width))] px-3 py-2 text-sm leading-copy font-normal text-brand wrap-anywhere">
        {/* Screen readers already get the full title from the link. */}
        <span aria-hidden>{label}</span>
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>;
}
