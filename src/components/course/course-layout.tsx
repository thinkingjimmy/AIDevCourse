/**
 * [INPUT]: Course/progress context, shared Sidebar controls, keyboard search, and language data.
 * [OUTPUT]: Lesson shell with keyboard-only search, collapsible desktop sidebar, and mobile sheet with focus return to its entry button. Sidebar and module state survive lesson changes; blocked storage keeps in-memory state.
 * [POS]: Client lesson navigation; article content stays server rendered. Course overviews do not mount this.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SiteLogo } from '@/components/layout/page-primitives';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { groupModules } from '@/lib/content/modules';
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/types';
import { site } from '@/lib/site-config';
import { LanguageSwitcher } from '../layout/language-switcher';
import { SearchShortcut } from '../search/search-shortcut';
import type { SearchLessonMeta } from '../search/lessons';
import { useProgress, useLessonStates } from '../progress/progress-provider';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

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

function ModuleTree() {
  const ui = useTranslations('Ui');
  const courseCopy = useTranslations('Course');
  const { course } = useProgress();
  const { stateOf } = useLessonStates();
  const pathname = usePathname();
  const groups = groupModules(course.lessons);
  const currentModule = groups.find((group) => group.lessons.some(({ lesson }) => lesson.url === pathname))?.module;
  const [open, setOpen] = useOpenModules(course.id);
  useEffect(() => {
    if (!currentModule) return;
    setOpen((value) => value[currentModule] === true ? value : { ...value, [currentModule]: true });
  }, [currentModule, setOpen]);
  return <SidebarGroup className="mt-1 mr-0 mb-0 ml-0 py-0 pr-2.5 pl-[18px]">
    <nav aria-label={ui('menu')} className="course-navigation flex flex-col gap-1.5 text-[14px]">
      {groups.map((group, index) => {
        const expanded = open[group.module] ?? group.module === currentModule;
        return <SidebarMenu className="gap-0" key={group.module}>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto justify-start gap-2 rounded-md px-2 py-[7px] text-[14px] leading-[1.4] font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground" aria-expanded={expanded} onClick={() => setOpen((value) => ({ ...value, [group.module]: !expanded }))}>
              <span className="flex-none font-mono text-[12px] font-normal text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0 font-medium">{group.title}</span>
            </SidebarMenuButton>
            {expanded && <SidebarMenuSub className="m-0 mb-1.5 translate-x-0 gap-0 border-0 p-0">
              {group.lessons.map(({ lesson }) => {
                const current = pathname === lesson.url;
                const done = stateOf(lesson) === 'done';
                return <SidebarMenuSubItem key={lesson.id}>
                  <SidebarMenuSubButton asChild isActive={current} className="my-px h-auto w-full rounded-md py-1.5 pr-2 pl-7 text-[13.5px] leading-[1.45] font-normal text-sidebar-foreground hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:font-bold data-[active=true]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
                    <Link href={lesson.url} aria-current={current ? 'page' : undefined}>
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{lesson.title}</span>
                      {done && <span className="ml-auto inline-flex flex-none items-center text-[#059669]"><CheckIcon size={14} weight="bold" aria-hidden /><span className="sr-only">{courseCopy('doneMark')}</span></span>}
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
  const courseCopy = useTranslations('Course');
  const { course } = useProgress();
  const { summary, ready } = useLessonStates();
  const { open, isMobile } = useSidebar();
  const toggleLabel = isMobile ? ui('close') : ui(open ? 'collapseSidebar' : 'expandSidebar');
  const done = ready ? summary.done : 0;
  return <Sidebar collapsible="icon">
    <SidebarHeader className="w-full gap-3.5 pt-[18px] pr-[18px] pb-2 pl-7 group-data-[collapsible=icon]:px-2">
      <div className="flex items-center justify-between gap-3">
        <SiteLogo href={`/${locale}`} className="text-[15px] group-data-[collapsible=icon]:hidden" aria-label={`${site.name} · ${ui('home')}`} />
        <SidebarTrigger aria-label={toggleLabel} title={toggleLabel} />
      </div>
      <Link href={course.url} className="text-[16px] leading-[1.4] font-semibold text-inherit no-underline hover:text-foreground group-data-[collapsible=icon]:hidden">{course.title}</Link>
      <div className="group-data-[collapsible=icon]:hidden">
        <p className="m-0 mb-2 font-mono text-[12px] text-muted-foreground">{courseCopy('progressLabel', { done, total: summary.total })}</p>
        <div className="h-0.5 bg-border" aria-hidden="true"><span className="block h-full bg-foreground" style={{ width: `${ready ? summary.percent : 0}%` }} /></div>
      </div>
    </SidebarHeader>
    <SidebarContent className="w-full group-data-[collapsible=icon]:hidden">
      <ModuleTree />
    </SidebarContent>
    <SidebarFooter className="mt-0 w-full flex-row items-center gap-3 border-t border-border pt-3 pr-[18px] pb-4 pl-7 group-data-[collapsible=icon]:hidden">
      <SearchShortcut locale={locale} version={version} lessons={lessons} />
      <LanguageSwitcher side="top" locale={locale} translations={translations} />
    </SidebarFooter>
  </Sidebar>;
}

function CourseMenuButton() {
  const ui = useTranslations('Ui');
  const { setOpenMobile } = useSidebar();
  return <Button variant="plain" size="reset" className="sticky top-0 z-30 hidden min-h-12 w-full items-center justify-start border-0 border-b border-border bg-surface px-4 text-left text-[14px] font-medium text-foreground max-[961px]:flex" onClick={(event) => { event.currentTarget.focus(); setOpenMobile(true); }}>{ui('menu')}</Button>;
}

function MobileBarSentinel() {
  const { isMobile, openMobile } = useSidebar();
  if (!isMobile || openMobile) return null;
  return <div className="mobile-course-bar hidden" hidden />;
}

export function LearnShell({ locale, version, lessons, translations, children }: {
  locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; translations: Catalog['translations']; children: ReactNode;
}) {
  const ui = useTranslations('Ui');
  const open = useSyncExternalStore(subscribeSidebar, readSidebarOpen, () => true);
  return <SidebarProvider className="bg-background text-foreground" open={open} onOpenChange={setSidebarOpen}>
    <CourseSidebar locale={locale} version={version} lessons={lessons} translations={translations} />
    <SidebarInset className="min-w-0 bg-background">
      <CourseMenuButton />
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_220px] items-start max-[1101px]:grid-cols-[minmax(0,1fr)]">{children}</div>
    </SidebarInset>
    <MobileBarSentinel />
    <noscript>
      <details className="mobile-course-bar sticky top-0 z-30 hidden border-b border-border bg-surface max-[961px]:flex [&_.course-navigation]:max-h-[70vh] [&_.course-navigation]:overflow-auto [&_.course-navigation]:px-3.5 [&_.course-navigation]:pt-2 [&_.course-navigation]:pb-4">
        <summary className="sticky top-0 z-30 flex min-h-12 w-full items-center border-b border-border bg-surface px-4 text-left text-[14px] font-medium text-foreground [&::-webkit-details-marker]:hidden" role="button">{ui('menu')}</summary>
        <ModuleTree />
      </details>
    </noscript>
  </SidebarProvider>;
}
