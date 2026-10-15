/**
 * [INPUT]: Course and progress from progress/progress-provider, plus search and language data for the sidebar footer.
 * [OUTPUT]: Full-bleed wiki shell: collapsible module tree, progress, and article slot. No search field in the tree.
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
function ModuleTree() {
  const ui = useTranslations('Ui');
  const { course } = useProgress();
  const pathname = usePathname();
  const groups = groupModules(course.lessons);
  const currentModule = groups.find((group) => group.lessons.some(({ lesson }) => lesson.url === pathname))?.module;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return <nav aria-label={ui('menu')} className="course-navigation wiki-tree">
    {groups.map((group, index) => {
      const expanded = open[group.module] ?? group.module === currentModule;
      return <details key={group.module} className="wiki-module" open={expanded} onToggle={(event) => {
        const next = event.currentTarget.open;
        setOpen((value) => value[group.module] === next ? value : { ...value, [group.module]: next });
      }}>
        <summary>
          <span className="wiki-chevron" aria-hidden="true" />
          <span className="wiki-mod-num">{String(index + 1).padStart(2, '0')}</span>
          <span className="wiki-mod-title">{group.title}</span>
        </summary>
        <ol>{group.lessons.map(({ lesson }) => {
          const current = pathname === lesson.url;
          return <li key={lesson.id}><Link href={lesson.url} aria-current={current ? 'page' : undefined} className={current ? 'is-current' : undefined}>{lesson.title}</Link></li>;
        })}</ol>
      </details>;
    })}
  </nav>;
}
function WikiSide({ locale, version, lessons, translations }: {
  locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; translations: Catalog['translations'];
}) {
  const ui = useTranslations('Ui');
  const courseCopy = useTranslations('Course');
  const { course } = useProgress();
  const { summary, ready } = useLessonStates();
  const done = ready ? summary.done : 0;
  return <details className="wiki-side mobile-course-bar" onKeyDown={(event) => { if (event.key === 'Escape') event.currentTarget.open = false; }}>
    <summary className="wiki-side-toggle">{ui('menu')}</summary>
    <div className="wiki-side-body">
      <Link href={`/${locale}`} className="home-logo wiki-logo" aria-label={`${site.name} · ${ui('home')}`}><span className="home-mark" aria-hidden="true" /><span>aidevcourse</span></Link>
      <Link href={course.url} className="wiki-course">{course.title}</Link>
      <div className="wiki-progress">
        <p>{courseCopy('progressLabel', { done, total: summary.total })}</p>
        <div className="wiki-meter" aria-hidden="true"><span style={{ width: `${ready ? summary.percent : 0}%` }} /></div>
      </div>
      <ModuleTree />
      <div className="wiki-tools">
        <SearchTrigger locale={locale} version={version} lessons={lessons} compact />
        <LanguageSwitcher locale={locale} translations={translations} compact />
      </div>
    </div>
  </details>;
}
export function LearnShell({ locale, version, lessons, translations, children }: {
  locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; translations: Catalog['translations']; children: ReactNode;
}) {
  return <div className="wiki"><WikiSide locale={locale} version={version} lessons={lessons} translations={translations} />{children}</div>;
}
