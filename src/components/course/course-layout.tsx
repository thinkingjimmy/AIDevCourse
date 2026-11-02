'use client';
import { localePath } from '@/lib/i18n/routing';
import { useSyncExternalStore, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SiteLogo } from '@/components/layout/page-primitives';
import type { Catalog } from '@/lib/content/model';
import type { Locale } from '@/lib/i18n/config';
import { site } from '@/lib/site-config';
import { CourseFooter } from './course-footer';
import { ModuleTree } from './navigation/module-tree';
import { CourseMobileNavigation } from './navigation/mobile-navigation';
import { SearchShortcut } from '../search/search-shortcut';
import type { SearchLessonMeta } from '../search/lessons';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/course/sidebar';

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

function CourseSidebar({ locale, version, lessons, translations }: {
  locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; translations: Catalog['translations'];
}) {
  const ui = useTranslations('Ui');
  const { open, isMobile } = useSidebar();
  const toggleLabel = isMobile ? ui('close') : ui(open ? 'collapseSidebar' : 'expandSidebar');
  return <Sidebar label={ui('menu')}>
    <SidebarHeader className="w-full p-2 max-[961px]:px-5 max-[961px]:pt-1">
      <div className="flex items-center justify-between gap-3">
        <SiteLogo href={localePath(locale)} className="p-2 text-ui max-[961px]:hidden group-data-[collapsible=icon]:hidden" aria-label={`${site.name} · ${ui('home')}`} />
        {isMobile && <p className="m-0 text-xl font-semibold">{ui('menu')}</p>}
        <SidebarTrigger aria-label={toggleLabel} title={toggleLabel} className="max-[961px]:size-11 max-[961px]:rounded-full max-[961px]:bg-muted max-[961px]:before:inset-0" />
      </div>
    </SidebarHeader>
    <SidebarContent className="w-full group-data-[collapsible=icon]:hidden">
      <ModuleTree />
    </SidebarContent>
    <SearchShortcut locale={locale} version={version} lessons={lessons} />
    <CourseFooter locale={locale} translations={translations} />
  </Sidebar>;
}

export function LearnShell({ locale, version, lessons, translations, children }: {
  locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; translations: Catalog['translations']; children: ReactNode;
}) {
  const open = useSyncExternalStore(subscribeSidebar, readSidebarOpen, () => true);
  return <SidebarProvider className="bg-background text-foreground" open={open} onOpenChange={setSidebarOpen}>
    <CourseSidebar locale={locale} version={version} lessons={lessons} translations={translations} />
    <SidebarInset className="min-w-0 bg-background max-[961px]:pb-[calc(6.5rem+env(safe-area-inset-bottom))] [--lesson-sidebar-width:var(--sidebar-width)] peer-data-[collapsible=icon]:[--lesson-sidebar-width:var(--sidebar-width-icon)]">
      <CourseMobileNavigation locale={locale} translations={translations} />
      <div data-slot="lesson-region" className="@container/lesson min-w-0 flex-1 px-8 max-[961px]:px-5 min-[961px]:has-[[data-slot=lesson-toc]]:pl-20">{children}</div>
    </SidebarInset>
  </SidebarProvider>;
}
