'use client';
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { CourseFooter } from './course-footer';
import { CourseOverviewLink, ModuleTree } from './navigation/module-tree';
import { CourseMobileNavigation } from './navigation/mobile-navigation';
import { DirectoryHeader } from '@/components/navigation/directory-presentation';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, useSidebar } from '@/components/navigation/sidebar';

let sidebarOpen: boolean | undefined;
const sidebarListeners = new Set<() => void>();
function subscribeSidebar(listener: () => void) {
  sidebarListeners.add(listener);
  return () => { sidebarListeners.delete(listener); };
}
function readSidebarOpen() {
  if (sidebarOpen === undefined) {
    try { sidebarOpen = sessionStorage.getItem('aidevcourse:sidebar') !== 'closed'; }
    catch { sidebarOpen = true; }
  }
  return sidebarOpen;
}
function setSidebarOpen(open: boolean) {
  sidebarOpen = open;
  try { sessionStorage.setItem('aidevcourse:sidebar', open ? 'open' : 'closed'); } catch { /* Keep this visit usable without storage. */ }
  sidebarListeners.forEach((listener) => listener());
}

function CourseSidebar() {
  const ui = useTranslations('Ui');
  const { open, isMobile } = useSidebar();
  const toggleLabel = isMobile ? ui('close') : ui(open ? 'collapseSidebar' : 'expandSidebar');
  return <Sidebar label={ui('menu')}>
    <DirectoryHeader toggleLabel={toggleLabel}
      title={isMobile ? <p className="m-0 text-xl font-semibold">{ui('menu')}</p> : <CourseOverviewLink className="flex-1 group-data-[collapsible=icon]:hidden" />} />
    <SidebarContent className="w-full group-data-[collapsible=icon]:hidden">
      <ModuleTree showOverview={isMobile} />
    </SidebarContent>
    <CourseFooter />
  </Sidebar>;
}

export function LearnShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const open = useSyncExternalStore(subscribeSidebar, readSidebarOpen, () => true);
  return <SidebarProvider className="bg-background text-foreground" open={open} onOpenChange={setSidebarOpen}>
    <CourseSidebar />
    <CourseMobileNavigation locale={locale} />
    <SidebarInset className="@container/reader min-w-0">
      {children}
    </SidebarInset>
  </SidebarProvider>;
}

export function LessonRegion({ title, hasToc, children }: { title: string; hasToc: boolean; children: ReactNode }) {
  const pane = useRef<HTMLElement>(null);
  useEffect(() => {
    // History traversal can restore the URL without scrolling a nested pane to its fragment.
    const revealFragment = () => pane.current?.querySelector(':target')?.scrollIntoView({ block: 'start' });
    window.addEventListener('hashchange', revealFragment);
    return () => window.removeEventListener('hashchange', revealFragment);
  }, []);
  return <section ref={pane} data-slot="lesson-region" aria-label={title} tabIndex={0} className={cn(
    '@container/lesson min-h-0 flex-1 overflow-y-auto overscroll-contain px-8 focus-visible:-outline-offset-2 max-[961px]:px-5 max-[961px]:pb-[calc(6.5rem+env(safe-area-inset-bottom))]',
    hasToc && 'min-[961px]:pl-20',
  )}>{children}</section>;
}
