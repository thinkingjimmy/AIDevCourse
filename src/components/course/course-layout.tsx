/**
 * [INPUT]: Course and progress from progress/progress-provider, and module groups from lib/content/modules.
 * [OUTPUT]: Lesson course index (current module only) and the compact contents strip.
 * [POS]: Client lesson navigation; article content stays server rendered. Course overviews do not mount this.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { courseLabel, groupModules } from '@/lib/content/modules';
import { useProgress, useLessonStates } from '../progress/progress-provider';
function CourseNav({ onNavigate }: { onNavigate?: () => void }) {
  const ui = useTranslations('Ui');
  const { course } = useProgress();
  const pathname = usePathname();
  return <nav aria-label={ui('menu')} className="course-navigation learn-nav learn-index">
    {groupModules(course.lessons).map((group, index) => {
      const num = String(index + 1).padStart(2, '0');
      const open = group.lessons.some(({ lesson }) => lesson.url === pathname);
      const first = group.lessons[0]?.lesson;
      if (!open) {
        return first ? <Link key={group.module} href={first.url} onClick={onNavigate} className="learn-modline">{group.title}<span className="num"> {num}</span></Link> : null;
      }
      return <div key={group.module} className="is-open">
        <p className="learn-modline">{group.title}<span className="num"> {num}</span></p>
        <ol>{group.lessons.map(({ lesson }) => {
          const current = pathname === lesson.url;
          return <li key={lesson.id}><Link href={lesson.url} onClick={onNavigate} className={`learn-lesson${current ? ' is-current' : ''}`} aria-current={current ? 'page' : undefined}>{lesson.title}{current ? ' —' : ''}</Link></li>;
        })}</ol>
      </div>;
    })}
  </nav>;
}
function LessonStrip() {
  const t = useTranslations('Course');
  const ui = useTranslations('Ui');
  const { course } = useProgress();
  const { summary, ready } = useLessonStates();
  const pathname = usePathname();
  const index = course.lessons.findIndex((lesson) => lesson.url === pathname);
  const lesson = course.lessons[index];
  const doneCount = ready ? summary.done : 0;
  return <div className="learn-strip mobile-course-bar">
    <p className="learn-strip-crumb">{lesson
      ? <>{courseLabel(course.slug)}<span aria-hidden> / </span><b>{ui('lessonNumber', { number: index + 1 })} · {lesson.title}</b></>
      : <b>{course.title}</b>}</p>
    <div className="learn-strip-tools">
      <details>
        <summary>{t('contents')}<span aria-hidden> ▾</span></summary>
        <CourseNav />
      </details>
      <span className="count">{doneCount} / {summary.total}</span>
    </div>
  </div>;
}
export function LearnShell({ children }: { children: ReactNode }) {
  return <>
    <LessonStrip />
    <aside className="learn-out learn-lnav"><div className="learn-out-in"><CourseNav /></div></aside>
    {children}
  </>;
}
