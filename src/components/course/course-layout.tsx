/**
 * [INPUT]: Course and progress from progress/progress-provider, and module groups from lib/content/modules.
 * [OUTPUT]: Lesson course nav and contents strip, plus the course continue link and syllabus rows.
 * [POS]: Client course controls and lesson-only navigation; article content stays server rendered.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { courseLabel, groupModules } from '@/lib/content/modules';
import { useProgress, useLessonStates } from '../progress/progress-provider';
function CourseNav({ onNavigate }: { onNavigate?: () => void }) {
  const ui = useTranslations('Ui');
  const learning = useTranslations('Learning');
  const { course, progress, ready } = useProgress();
  const { stateOf, summary } = useLessonStates();
  const pathname = usePathname();
  const viewing = course.lessons.some((lesson) => lesson.url === pathname);
  const doneCount = ready ? summary.done : 0;
  return <nav aria-label={ui('menu')} className="course-navigation learn-nav">
    <div className="learn-course-head">
      <Link href={course.url} onClick={onNavigate}>{course.title}</Link>
      <p className="learn-meter">
        <span className="track" role="progressbar" aria-valuemin={0} aria-valuemax={summary.total || 1} aria-valuenow={doneCount} aria-label={learning('progress', { done: doneCount, total: summary.total })}>
          <span className="fill" style={{ width: `${ready ? summary.percent : 0}%` }} />
        </span>
        <span className="count">{doneCount} / {summary.total}</span>
      </p>
    </div>
    {groupModules(course.lessons).map((group, index) => <section key={group.module}>
      <p className="learn-mod">{String(index + 1).padStart(2, '0')} · {group.title}</p>
      <ol>{group.lessons.map(({ lesson, part }) => {
        const done = ready && !!progress.completed[lesson.id];
        const current = viewing ? pathname === lesson.url : stateOf(lesson) === 'current';
        return <li key={lesson.id}><Link href={lesson.url} onClick={onNavigate} className={`learn-lesson${done ? ' is-done' : ''}${current ? ' is-current' : ''}`} aria-current={pathname === lesson.url ? 'page' : undefined}>
          <span className="idx">{part}</span>
          <span className="ttl">{lesson.title}</span>
          {done && <Check className="mark" size={13} strokeWidth={1.6} aria-hidden />}
        </Link></li>;
      })}</ol>
    </section>)}
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
export function CourseContinue() {
  const course = useTranslations('Course');
  const learning = useTranslations('Learning');
  const { summary, ready } = useLessonStates();
  if (!summary.next) return null;
  const action = ready ? summary.action : 'start';
  const label = action === 'continue' ? course('continueNamed', { title: summary.next.title }) : action === 'review' ? learning('review') : course('startFirst');
  return <Link className="home-cta learn-start" href={summary.next.url}>{label}<span aria-hidden> →</span></Link>;
}
export function CourseCatalog() {
  const t = useTranslations('Course');
  const ui = useTranslations('Ui');
  const { course, progress, ready } = useProgress();
  return <div className="learn-catalog">
    <p className="learn-catalog-title">{t('catalog')}</p>
    {groupModules(course.lessons).map((group, index) => <section key={group.module}>
      <p className="learn-mod">{String(index + 1).padStart(2, '0')} · {group.title}</p>
      {group.lessons.map(({ lesson, part }) => {
        const done = ready && !!progress.completed[lesson.id];
        const meta = `${done ? `${t('doneMark')} · ` : ''}${ui(lesson.type)} · ${ui('minutes', { count: lesson.durationMinutes })}`;
        return <Link key={lesson.id} href={lesson.url} className={`learn-row${done ? ' is-done' : ''}`}>
          <span className="idx">{part}</span><span className="ttl">{lesson.title}</span><span className="meta">{meta}</span>
        </Link>;
      })}
    </section>)}
  </div>;
}
