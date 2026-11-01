'use client';
import { canonicalPath, localePath } from '@/lib/i18n/routing';
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { SidebarSimpleIcon } from '@phosphor-icons/react/dist/ssr/SidebarSimple';
import { Button } from '@/components/ui/button';
import { SiteLogo } from '@/components/layout/page-primitives';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { groupModules, type Catalog } from '@/lib/content/model';
import type { Locale } from '@/lib/i18n/config';
import { author, site } from '@/lib/site-config';
import { CourseFooter } from './course-footer';
import { SearchShortcut } from '../search/search-shortcut';
import type { SearchLessonMeta } from '../search/lessons';
import { useLearning } from '../progress/progress-provider';
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/course/sidebar';

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

const closedModules: Record<string, boolean> = {};
const openByCourse = new Map<string, Record<string, boolean>>();
const openListeners = new Set<() => void>();
function moduleStorageKey(courseId: string) { return `aidevcourse:modules:${courseId}`; }
function loadOpenModules(courseId: string) {
  const cached = openByCourse.get(courseId);
  if (cached) return cached;
  let value: Record<string, boolean> = {};
  try {
    const raw = sessionStorage.getItem(moduleStorageKey(courseId));
    const parsed = raw ? JSON.parse(raw) as unknown : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      value = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
    }
  } catch { /* A blocked session store still keeps the in-memory map for this visit. */ }
  openByCourse.set(courseId, value);
  return value;
}
function publishOpenModules(courseId: string, value: Record<string, boolean>) {
  openByCourse.set(courseId, value);
  try { sessionStorage.setItem(moduleStorageKey(courseId), JSON.stringify(value)); } catch { /* In-memory state still covers this visit. */ }
  openListeners.forEach((listener) => listener());
}
function useOpenModules(courseId: string) {
  const open = useSyncExternalStore(
    (listener) => { openListeners.add(listener); return () => { openListeners.delete(listener); }; },
    () => loadOpenModules(courseId),
    () => closedModules,
  );
  const setOpen = useCallback((update: (value: Record<string, boolean>) => Record<string, boolean>) => {
    const current = loadOpenModules(courseId);
    const next = update(current);
    if (next !== current) publishOpenModules(courseId, next);
  }, [courseId]);
  return [open, setOpen] as const;
}

function ModuleTree({ staticMode = false }: { staticMode?: boolean }) {
  const ui = useTranslations('Ui');
  const { course } = useLearning();
  const pathname = canonicalPath(usePathname());
  const groups = groupModules(course.lessons);
  const currentModule = groups.find((group) => group.lessons.some(({ lesson }) => lesson.url === pathname))?.module;
  const [open, setOpen] = useOpenModules(course.id);
  useEffect(() => {
    if (currentModule === undefined) return;
    setOpen((value) => value[currentModule] === true ? value : { ...value, [currentModule]: true });
  }, [currentModule, setOpen]);
  return <SidebarGroup className="m-0 p-2">
    <Link href={course.url} className="mb-1 block rounded-md p-2 text-base leading-snug font-semibold text-foreground no-underline hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">{course.title}</Link>
    <nav aria-label={ui('menu')} className="course-navigation flex flex-col gap-1.5 text-sm">
      {groups.map((group, index) => {
        const expanded = staticMode || (open[group.module] ?? group.module === currentModule);
        const title = <>
          <span className="shrink-0 font-mono text-caption font-normal text-sidebar-foreground tabular-nums">{String(index + 1).padStart(2, '0')}{' '}</span>
          <span className="min-w-0">{group.title}</span>
        </>;
        return <SidebarMenu className="gap-0" key={group.module}>
          <SidebarMenuItem>
            {staticMode ? <p className="m-0 flex items-baseline gap-2 p-2 pl-7.5 text-sm leading-snug font-medium text-foreground">{title}</p> : <SidebarMenuButton className="h-auto justify-start gap-2 rounded-md p-2 font-sans text-sm leading-snug font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground" aria-expanded={expanded} onClick={() => setOpen((value) => ({ ...value, [group.module]: !expanded }))}>
              <CaretDownIcon size={14} aria-hidden className={`size-3.5 shrink-0 text-muted-foreground ${expanded ? '' : '-rotate-90'}`} />
              {title}
            </SidebarMenuButton>}
            {expanded && <SidebarMenuSub className="m-0 translate-x-0 gap-0.5 border-0 p-0">
              {group.lessons.map(({ lesson, part }) => {
                const current = pathname === lesson.url;
                return <SidebarMenuSubItem key={lesson.id}>
                  <SidebarMenuSubButton asChild isActive={current} className="h-auto w-full translate-x-0 rounded-md p-2 pl-7.5 text-sm leading-normal font-normal text-sidebar-foreground hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:font-bold data-[active=true]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
                    <Link href={lesson.url} aria-current={current ? 'page' : undefined}>
                      <span className="w-7 shrink-0 font-mono text-caption font-normal text-sidebar-foreground tabular-nums">{part}{' '}</span>
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{lesson.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>;
              })}
            </SidebarMenuSub>}
          </SidebarMenuItem>
        </SidebarMenu>;
      })}
    </nav>
  </SidebarGroup>;
}

function CourseSidebar({ locale, version, lessons, translations }: {
  locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; translations: Catalog['translations'];
}) {
  const ui = useTranslations('Ui');
  const { open, isMobile } = useSidebar();
  const toggleLabel = isMobile ? ui('close') : ui(open ? 'collapseSidebar' : 'expandSidebar');
  return <Sidebar label={ui('menu')}>
    <SidebarHeader className="w-full p-2">
      <div className="flex items-center justify-between gap-3">
        <SiteLogo href={localePath(locale)} className="p-2 text-ui group-data-[collapsible=icon]:hidden" aria-label={`${site.name} · ${ui('home')}`} />
        <SidebarTrigger aria-label={toggleLabel} title={toggleLabel} />
      </div>
    </SidebarHeader>
    <SidebarContent className="w-full group-data-[collapsible=icon]:hidden">
      <ModuleTree />
    </SidebarContent>
    <SearchShortcut locale={locale} version={version} lessons={lessons} />
    <CourseFooter locale={locale} translations={translations} />
  </Sidebar>;
}

function CourseMobileHeader({ locale, translations }: { locale: Locale; translations: Catalog['translations'] }) {
  const ui = useTranslations('Ui');
  const authorText = useTranslations('Author');
  const { openMobile, mobileDialogId, setOpenMobile } = useSidebar();
  const controlClassName = 'ml-auto h-11 shrink-0 gap-2 rounded-(--radius) px-2 text-sm leading-copy font-medium max-[400px]:w-11 max-[400px]:px-0';
  return <header data-slot="mobile-course-header" className="mobile-course-bar sticky top-0 z-30 hidden border-b border-border bg-surface max-[961px]:block">
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-1.5">
      <SiteLogo href={localePath(locale)} className="[&_img]:w-[128px]" aria-label={`${site.name} · ${ui('home')}`} />
      <Button data-slot="mobile-sidebar-trigger" variant="ghost" size="sm" className={`${controlClassName} [@media(scripting:none)]:hidden`} aria-expanded={openMobile} aria-controls={mobileDialogId} aria-haspopup="dialog"
        onClick={(event) => { event.currentTarget.focus(); setOpenMobile(true); }}><SidebarSimpleIcon size={20} aria-hidden /><span className="max-[400px]:sr-only">{ui('menu')}</span></Button>
      <noscript><details data-slot="mobile-native-menu" className="relative ml-auto">
        <Button asChild variant="ghost" size="sm" className={`${controlClassName} list-none [&::-webkit-details-marker]:hidden`}>
          <summary role="button"><SidebarSimpleIcon size={20} aria-hidden /><span className="max-[400px]:sr-only">{ui('menu')}</span></summary>
        </Button>
        <div className="absolute top-[calc(100%+6px)] right-0 z-40 max-h-[calc(100dvh-5rem)] w-[min(20rem,calc(100vw-2.5rem))] overflow-y-auto overscroll-contain border border-border bg-sidebar shadow-[4px_4px_0_var(--line)]">
          <ModuleTree staticMode />
          <div className="flex items-center justify-between gap-3 border-t border-border p-2">
            <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 text-lg"><a href={author.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={authorText('website')}><span aria-hidden>👋</span></a></Button>
            <LanguageSwitcher locale={locale} translations={translations} side="top" />
          </div>
        </div>
      </details></noscript>
    </div>
  </header>;
}

export function LearnShell({ locale, version, lessons, translations, children }: {
  locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; translations: Catalog['translations']; children: ReactNode;
}) {
  const open = useSyncExternalStore(subscribeSidebar, readSidebarOpen, () => true);
  return <SidebarProvider className="bg-background text-foreground" open={open} onOpenChange={setSidebarOpen}>
    <CourseSidebar locale={locale} version={version} lessons={lessons} translations={translations} />
    <SidebarInset className="min-w-0 bg-background [--lesson-sidebar-width:var(--sidebar-width)] peer-data-[collapsible=icon]:[--lesson-sidebar-width:var(--sidebar-width-icon)]">
      <CourseMobileHeader locale={locale} translations={translations} />
      <div data-slot="lesson-region" className="@container/lesson min-w-0 flex-1 px-8 max-[961px]:px-5 min-[961px]:has-[[data-slot=lesson-toc]]:pl-20">{children}</div>
    </SidebarInset>
  </SidebarProvider>;
}
