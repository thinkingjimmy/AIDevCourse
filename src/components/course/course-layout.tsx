/**
 * [INPUT]: Course and progress from progress/progress-provider, plus search and language data for the sidebar footer.
 * [OUTPUT]: Full-bleed wiki shell. Desktop left nav is a shadcn Sidebar; mobile ≤960px opens the same nav in the sidebar sheet. No search field in the tree.
 * [POS]: Client lesson navigation; article content stays server rendered. Course overviews do not mount this.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { groupModules } from '@/lib/content/modules';
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/types';
import { site } from '@/lib/site-config';
import { LanguageSwitcher } from '../layout/language-switcher';
import { SearchTrigger } from '../search/search-trigger';
import type { SearchLessonMeta } from '../search/lessons';
import { useProgress, useLessonStates } from '../progress/progress-provider';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, useSidebar } from '@/components/ui/sidebar';

function ModuleTree() {
  const ui = useTranslations('Ui');
  const { course } = useProgress();
  const pathname = usePathname();
  const groups = groupModules(course.lessons);
  const currentModule = groups.find((group) => group.lessons.some(({ lesson }) => lesson.url === pathname))?.module;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return <SidebarGroup className="wiki-tree p-0">
    <nav aria-label={ui('menu')} className="course-navigation">
      {groups.map((group, index) => {
        const expanded = open[group.module] ?? group.module === currentModule;
        return <SidebarMenu key={group.module}>
          <SidebarMenuItem>
            <SidebarMenuButton className="wiki-module-button" aria-expanded={expanded} onClick={() => setOpen((value) => ({ ...value, [group.module]: !expanded }))}>
              <span className="wiki-chevron" data-open={expanded ? '' : undefined} aria-hidden="true" />
              <span className="wiki-mod-num">{String(index + 1).padStart(2, '0')}</span>
              <span className="wiki-mod-title">{group.title}</span>
            </SidebarMenuButton>
            {expanded && <SidebarMenuSub>
              {group.lessons.map(({ lesson }) => {
                const current = pathname === lesson.url;
                return <SidebarMenuSubItem key={lesson.id}>
                  <SidebarMenuSubButton asChild isActive={current} className={current ? 'is-current' : undefined}>
                    <Link href={lesson.url} aria-current={current ? 'page' : undefined}>{lesson.title}</Link>
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
