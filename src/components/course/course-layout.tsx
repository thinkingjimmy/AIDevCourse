/**
 * [INPUT]: Course and progress from progress/progress-provider, sibling syllabus.tsx states, and lesson children.
 * [OUTPUT]: ReadingLayout: Fumadocs docs layout with the course sidebar, mobile drawer, reading progress, and mobile lesson bar.
 * [POS]: Lesson reading shell mounted by the lesson route layout; the course overview renders outside it.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { Fragment, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { useTranslations } from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import { List, X, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { useProgress, useLessonStates } from '../progress/progress-provider';
import { ProgressSegments } from '../progress/progress-controls';
import { groupModules, LessonStateIcon } from './syllabus';
function CourseNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const ui = useTranslations('Ui');
  const learning = useTranslations('Learning');
  const { course } = useProgress();
  const { stateOf, summary, ready } = useLessonStates();
  const pathname = usePathname();
  return <nav aria-label={ui('menu')} className="course-navigation">
    <Link href={course.url} className="back-link" onClick={onNavigate}><ArrowLeft size={14} aria-hidden />{ui('overview')}</Link>
    <div className="sidebar-course">
      <Link href={course.url} className="sidebar-course-title" onClick={onNavigate}>{course.title}</Link>
      <ProgressSegments />
      <small>{ready ? learning('progressShort', { done: summary.done, total: summary.total }) : learning('loading')}</small>
    </div>
    {groupModules(course.lessons).map((group, index) => <Fragment key={group.module}>
      <p className="module-label">{ui('moduleNumber', { number: index + 1 })} · {group.title}</p>
      <ol>{group.lessons.map(({ lesson, number }) => {
        const current = pathname === lesson.url;
        const state = stateOf(lesson) === 'done' ? 'done' : current ? 'current' : 'todo';
        return <li key={lesson.id}><Link href={lesson.url} onClick={onNavigate} className="nav-lesson" aria-current={current ? 'page' : undefined}>
          <LessonStateIcon state={state} number={number} />
          <span>{lesson.title}<small>{ui(lesson.type)} · {ui('minutes', { count: lesson.durationMinutes })}</small></span>
        </Link></li>;
      })}</ol>
    </Fragment>)}
  </nav>;
}
function LessonBar({ onMenu }: { onMenu: () => void }) {
  const ui = useTranslations('Ui');
  const t = useTranslations('Learning');
  const { course, progress, ready, complete } = useProgress();
  const pathname = usePathname();
  const index = course.lessons.findIndex((lesson) => lesson.url === pathname);
  if (index < 0) return null;
  const lesson = course.lessons[index];
  const next = course.lessons[index + 1];
  const done = !!progress.completed[lesson.id];
  return <div className="lesson-bar">
    <button type="button" className="bar-item" onClick={onMenu}><List size={18} aria-hidden />{ui('menu')}</button>
    <button type="button" className={`button ${done ? 'done' : 'primary'}`} disabled={!ready} aria-pressed={done} onClick={() => complete(lesson.id, !done)}><Check size={17} aria-hidden />{t(done ? 'completed' : 'markDone')}</button>
    <Link href={next?.url ?? course.url}><ArrowRight size={18} aria-hidden />{ui(next ? 'next' : 'overview')}</Link>
  </div>;
}
export function ReadingLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('Ui');
  const { course } = useProgress();
  const [open, setOpen] = useState(false);
  const tree = { name: course.title, children: course.lessons.map((lesson) => ({ type: 'page' as const, name: lesson.title, url: lesson.url })) };
  return <DocsLayout tree={tree} nav={{ enabled: false }} sidebar={{ enabled: false }} tabs={false} i18n={false} themeSwitch={{ enabled: false }} searchToggle={{ enabled: false }} containerProps={{ className: 'reading-layout' }}>
    <div className="reading-progress" aria-hidden />
    <aside className="course-sidebar"><CourseNavigation /></aside>
    <div className="mobile-course-bar"><Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="text-button"><List size={17} aria-hidden />{t('menu')}</Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="course-drawer" aria-describedby={undefined}>
        <div className="drawer-heading"><Dialog.Title>{t('menu')}</Dialog.Title><Dialog.Close className="icon-button" aria-label={t('close')}><X size={20} /></Dialog.Close></div>
        <CourseNavigation onNavigate={() => setOpen(false)} />
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root><ProgressSegments /><noscript><details><summary>{t('menu')}</summary><CourseNavigation /></details></noscript></div>
    {children}
    <LessonBar onMenu={() => setOpen(true)} />
  </DocsLayout>;
}
