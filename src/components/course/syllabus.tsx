/**
 * [INPUT]: Course lessons from progress/progress-provider, module groups, and restored lesson states.
 * [OUTPUT]: LessonStateIcon and the compact/full Syllabus list. Module grouping lives in lib/content/modules.
 * [POS]: Compact lesson path on course cards.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check } from 'lucide-react';
import { groupModules } from '@/lib/content/modules';
import { useProgress, useLessonStates, type LessonState } from '../progress/progress-provider';
export { groupModules };
export function LessonStateIcon({ state, number, large = false }: { state: LessonState; number: number; large?: boolean }) {
  const t = useTranslations('Learning');
  return <span className={large ? 'state-icon large' : 'state-icon'} data-state={state} role={state === 'done' ? 'img' : undefined} aria-label={state === 'done' ? t('completed') : undefined}>
    {state === 'done' ? <Check size={large ? 16 : 13} strokeWidth={2.5} aria-hidden /> : state === 'todo' ? number : null}
  </span>;
}
export function Syllabus({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const ui = useTranslations('Ui');
  const t = useTranslations('Learning');
  const { course } = useProgress();
  const { stateOf, lastId } = useLessonStates();
  const full = variant === 'full';
  return <div className={`syllabus ${variant}`}>{groupModules(course.lessons).map((group, index) => <section className="syllabus-group" key={group.module}>
    <p className="syllabus-label"><span className="mono">{ui('moduleNumber', { number: index + 1 })}</span>{group.title}</p>
    <ol>{group.lessons.map(({ lesson, number }) => {
      const state = stateOf(lesson);
      return <li key={lesson.id}><Link href={lesson.url} className="syllabus-row" data-state={state}>
        <LessonStateIcon state={state} number={number} large={full} />
        <span className="syllabus-text">{full
          ? <><span><strong>{lesson.title}</strong>{lesson.id === lastId && state === 'current' && <span className="last-read">{t('lastRead')}</span>}</span><small>{lesson.description}</small></>
          : <strong>{lesson.title}</strong>}</span>
        <span className="chip">{ui(lesson.type)}</span>
        <span className="syllabus-minutes">{ui('minutes', { count: lesson.durationMinutes })}</span>
        {full && <ArrowRight size={18} aria-hidden />}
      </Link></li>;
    })}</ol>
  </section>)}</div>;
}
