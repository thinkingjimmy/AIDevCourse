/**
 * [INPUT]: Course and progress from progress/progress-provider, plus search and language data for the sidebar footer.
 * [OUTPUT]: Full-bleed wiki shell. Desktop left nav is a shadcn Sidebar; mobile ≤960px opens the same nav in the sidebar sheet. Module rows are a number and a title, and groups the reader opened stay open across lesson changes. Completed lessons show a green check from the existing progress record. No search field in the tree.
 * [POS]: Client lesson navigation; article content stays server rendered. Course overviews do not mount this.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { groupModules } from '@/lib/content/modules';
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/types';
import { site } from '@/lib/site-config';
import { LanguageSwitcher } from '../layout/language-switcher';
import { SearchTrigger } from '../search/search-trigger';
import type { SearchLessonMeta } from '../search/lessons';
import { useProgress, useLessonStates } from '../progress/progress-provider';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, useSidebar } from '@/components/ui/sidebar';

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
  return <SidebarGroup className="wiki-tree p-0">
    <nav aria-label={ui('menu')} className="course-navigation">
      {groups.map((group, index) => {
        const expanded = open[group.module] ?? group.module === currentModule;
        return <SidebarMenu key={group.module}>
          <SidebarMenuItem>
            <SidebarMenuButton className="wiki-module-button" aria-expanded={expanded} onClick={() => setOpen((value) => ({ ...value, [group.module]: !expanded }))}>
              <span className="wiki-mod-num">{String(index + 1).padStart(2, '0')}</span>
              <span className="wiki-mod-title">{group.title}</span>
            </SidebarMenuButton>
            {expanded && <SidebarMenuSub>
              {group.lessons.map(({ lesson }) => {
                const current = pathname === lesson.url;
                const done = stateOf(lesson) === 'done';
                return <SidebarMenuSubItem key={lesson.id}>
                  <SidebarMenuSubButton asChild isActive={current} className={current ? 'is-current' : undefined}>
                    <Link href={lesson.url} aria-current={current ? 'page' : undefined}>
                      <span className="wiki-lesson-title">{lesson.title}</span>
                      {done && <span className="wiki-lesson-check"><Check size={14} strokeWidth={2.25} aria-hidden /><span className="sr-only">{courseCopy('doneMark')}</span></span>}
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
  const done = ready ? summary.done : 0;
  return <Sidebar collapsible="offcanvas">
    <SidebarHeader className="wiki-side-head">
      <Link href={`/${locale}`} className="home-logo wiki-logo" aria-label={`${site.name} · ${ui('home')}`}><span className="home-mark" aria-hidden="true" /><span>aidevcourse</span></Link>
      <Link href={course.url} className="wiki-course">{course.title}</Link>
      <div className="wiki-progress">
        <p>{courseCopy('progressLabel', { done, total: summary.total })}</p>
        <div className="wiki-meter" aria-hidden="true"><span style={{ width: `${ready ? summary.percent : 0}%` }} /></div>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <ModuleTree />
    </SidebarContent>
    <SidebarFooter className="wiki-tools">
      <SearchTrigger locale={locale} version={version} lessons={lessons} compact />
      <LanguageSwitcher locale={locale} translations={translations} compact />
    </SidebarFooter>
  </Sidebar>;
}

function CourseMenuButton() {
  const ui = useTranslations('Ui');
  const { setOpenMobile } = useSidebar();
  return <button type="button" className="wiki-side-toggle" onClick={() => setOpenMobile(true)}>{ui('menu')}</button>;
}

function MobileBarSentinel() {
  const { isMobile, openMobile } = useSidebar();
  if (!isMobile || openMobile) return null;
  return <div className="mobile-course-bar" hidden style={{ display: 'none' }} />;
}

export function LearnShell({ locale, version, lessons, translations, children }: {
  locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; translations: Catalog['translations']; children: ReactNode;
}) {
  const ui = useTranslations('Ui');
  return <SidebarProvider className="wiki" open onOpenChange={() => {}}>
    <CourseSidebar locale={locale} version={version} lessons={lessons} translations={translations} />
    <SidebarInset className="wiki-stage">
      <CourseMenuButton />
      <div className="wiki-stage-grid">{children}</div>
    </SidebarInset>
    <MobileBarSentinel />
    <noscript>
      <details className="mobile-course-bar wiki-noscript-nav">
        <summary className="wiki-side-toggle" role="button">{ui('menu')}</summary>
        <ModuleTree />
      </details>
    </noscript>
  </SidebarProvider>;
}
