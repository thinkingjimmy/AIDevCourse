'use client';
import { canonicalPath } from '@/lib/i18n/routing';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarSimpleIcon } from '@phosphor-icons/react/dist/ssr/SidebarSimple';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Slot } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/overlays/sheet';
import { cn } from '@/lib/utils';

const desktopQuery = '(min-width: 961px)';

type SidebarState = {
  open: boolean;
  isMobile: boolean;
  openMobile: boolean;
  mobileDialogId: string;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
};
const SidebarContext = createContext<SidebarState | null>(null);
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('Sidebar controls require SidebarProvider');
  return context;
}

export function SidebarProvider({ open, onOpenChange, className, style, children, ...props }: ComponentProps<'div'> & {
  open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const mobileDialogId = useId();
  const subscribeViewport = useCallback((listener: () => void) => {
    const media = window.matchMedia(desktopQuery);
    const change = () => { setMobilePath(null); listener(); };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const isMobile = useSyncExternalStore(subscribeViewport, () => !window.matchMedia(desktopQuery).matches, () => false);
  const pathname = canonicalPath(usePathname());
  // A sheet belongs to the route that opened it; navigation closes it without an extra render effect.
  const openMobile = isMobile && mobilePath === pathname;
  const setOpenMobile = useCallback((value: boolean) => setMobilePath(value ? pathname : null), [pathname]);
  const toggleSidebar = useCallback(() => {
    if (isMobile) setOpenMobile(!openMobile);
    else onOpenChange(!open);
  }, [isMobile, onOpenChange, open, openMobile, setOpenMobile]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.key.toLowerCase() !== 'b' || !(event.metaKey || event.ctrlKey)) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select'))) return;
      event.preventDefault();
      const sidebar = document.activeElement?.closest('[data-slot="sidebar-inner"]');
      if (!isMobile && open && sidebar) sidebar.querySelector<HTMLButtonElement>('[data-sidebar="trigger"]')?.focus();
      toggleSidebar();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isMobile, open, toggleSidebar]);

  const value = useMemo(() => ({ open, isMobile, openMobile, mobileDialogId, setOpenMobile, toggleSidebar }), [open, isMobile, openMobile, mobileDialogId, setOpenMobile, toggleSidebar]);
  return <SidebarContext.Provider value={value}>
    <div {...props} data-slot="sidebar-wrapper" style={style} className={cn('group/sidebar-wrapper flex min-h-svh w-full [--sidebar-width:20rem] [--sidebar-width-icon:3rem]', className)}>{children}</div>
  </SidebarContext.Provider>;
}

export function Sidebar({ label, className, children, ...props }: ComponentProps<'div'> & { label: string }) {
  const { isMobile, open, openMobile, mobileDialogId, setOpenMobile } = useSidebar();
  const mobileTrigger = useRef<HTMLElement | null>(null);
  if (isMobile) return <Sheet open={openMobile} onOpenChange={setOpenMobile}>
    <SheetContent side="bottom" id={mobileDialogId} data-sidebar="sidebar" data-slot="sidebar" data-mobile="true" aria-describedby={undefined}
      overlayClassName="bg-black/25 backdrop-blur-[3px]"
      className={cn('h-[min(82dvh,52rem)] bg-sidebar p-0 text-foreground', className)}
      onOpenAutoFocus={() => {
        const active = document.activeElement;
        mobileTrigger.current = active instanceof HTMLElement && active !== document.body ? active : document.querySelector<HTMLElement>('[data-slot="mobile-sidebar-trigger"]');
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        const previous = mobileTrigger.current;
        const trigger = previous?.isConnected && previous.getClientRects().length ? previous : document.querySelector<HTMLButtonElement>('[data-slot="sidebar-container"] [data-sidebar="trigger"]');
        trigger?.focus({ preventScroll: true });
      }}
      onEscapeKeyDown={(event) => { if (event.target instanceof Element && event.target.closest('details[open]')) event.preventDefault(); }}>
      <SheetTitle className="sr-only">{label}</SheetTitle>
      <div aria-hidden className="flex h-5 shrink-0 items-center justify-center"><span className="h-1 w-9 rounded-full bg-foreground/15" /></div>
      <div {...props} className="mobile-course-bar flex h-full min-h-0 w-full flex-col items-center" onClick={(event) => {
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (link && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && link.getAttribute('target') !== '_blank') setOpenMobile(false);
      }}>{children}</div>
    </SheetContent>
  </Sheet>;
  return <div className="group peer hidden text-sidebar-foreground min-[961px]:block" data-state={open ? 'expanded' : 'collapsed'} data-collapsible={open ? '' : 'icon'} data-slot="sidebar">
    <div data-slot="sidebar-gap" className="relative w-(--sidebar-width) bg-transparent group-data-[collapsible=icon]:w-(--sidebar-width-icon)" />
    <div {...props} data-slot="sidebar-container" className={cn('fixed inset-y-0 left-0 z-10 hidden h-svh w-(--sidebar-width) border-r border-sidebar-border bg-sidebar min-[961px]:flex group-data-[collapsible=icon]:w-(--sidebar-width-icon)', className)}>
      <div data-sidebar="sidebar" data-slot="sidebar-inner" className="flex h-full w-full flex-col bg-sidebar text-foreground">{children}</div>
    </div>
  </div>;
}

export function SidebarTrigger({ className, onClick, ...props }: ComponentProps<typeof Button>) {
  const { toggleSidebar, isMobile, openMobile, open } = useSidebar();
  const Icon = isMobile ? XIcon : SidebarSimpleIcon;
  return <Button {...props} data-sidebar="trigger" data-slot="sidebar-trigger" variant="ghost" size="icon-touch" aria-expanded={isMobile ? openMobile : open}
    className={cn('size-9 shrink-0 text-muted-foreground before:-inset-1 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:before:-inset-1.5', className)} onClick={(event) => {
      onClick?.(event);
      if (!event.defaultPrevented) { event.currentTarget.focus(); toggleSidebar(); }
    }}><Icon size={20} className="size-5 group-data-[collapsible=icon]:size-4" aria-hidden /></Button>;
}

export function SidebarInset({ className, ...props }: ComponentProps<'main'>) {
  return <main {...props} data-slot="sidebar-inset" className={cn('relative flex w-full flex-1 flex-col bg-background', className)} />;
}
export function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-header" data-sidebar="header" className={cn('flex shrink-0 flex-col gap-2 p-2', className)} />;
}
export function SidebarFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-footer" data-sidebar="footer" className={cn('flex shrink-0 flex-col gap-2 p-2', className)} />;
}
export function SidebarContent({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-content" data-sidebar="content" className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain group-data-[collapsible=icon]:overflow-hidden', className)} />;
}
export function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="sidebar-group" data-sidebar="group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} />;
}
export function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
  return <ul {...props} data-slot="sidebar-menu" data-sidebar="menu" className={cn('flex w-full min-w-0 flex-col gap-1', className)} />;
}
export function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
  return <li {...props} data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn('group/menu-item relative', className)} />;
}
export function SidebarMenuButton({ className, type = 'button', ...props }: ComponentProps<'button'>) {
  return <button {...props} type={type} data-slot="sidebar-menu-button" data-sidebar="menu-button" className={cn(
    'flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50 [&>span:last-child]:truncate', className,
  )} />;
}
export function SidebarMenuSub({ className, ...props }: ComponentProps<'ul'>) {
  return <ul {...props} data-slot="sidebar-menu-sub" data-sidebar="menu-sub" className={cn('mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden', className)} />;
}
export function SidebarMenuSubItem({ className, ...props }: ComponentProps<'li'>) {
  return <li {...props} data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className={cn('group/menu-sub-item relative', className)} />;
}
export function SidebarMenuSubButton({ asChild = false, isActive = false, className, ...props }: ComponentProps<'a'> & { asChild?: boolean; isActive?: boolean }) {
  const Component = asChild ? Slot.Root : 'a';
  return <Component {...props} data-slot="sidebar-menu-sub-button" data-sidebar="menu-sub-button" data-active={isActive} className={cn(
    'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-sidebar-foreground outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden [&>span:last-child]:truncate', className,
  )} />;
}
