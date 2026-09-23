/**
 * [INPUT]: Localized learning messages, the active course progress context, and its lesson states.
 * [OUTPUT]: ProgressSegments, ContinueLink, and the CourseProgress panel with accessible reset confirmation.
 * [POS]: Course progress controls for cards, the overview, and the reading sidebar; reset never affects other courses.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { ArrowRight, Laptop, RotateCcw } from 'lucide-react';
import { useProgress, useLessonStates } from './progress-provider';
export function ProgressSegments() {
  const t = useTranslations('Learning');
  const { course } = useProgress();
  const { stateOf, summary } = useLessonStates();
  return <div className="segments" role="progressbar" aria-label={t('progress', { done: summary.done, total: summary.total })} aria-valuemin={0} aria-valuemax={summary.total || 1} aria-valuenow={summary.done}>
    {course.lessons.map((lesson) => <span key={lesson.id} data-state={stateOf(lesson)} />)}
  </div>;
}
export function ContinueLink({ detailed = false }: { detailed?: boolean }) {
  const t = useTranslations('Learning');
  const ui = useTranslations('Ui');
  const { course } = useProgress();
  const { summary, ready } = useLessonStates();
  if (!summary.next) return null;
  const label = t(ready ? summary.action : 'start');
  if (!detailed) return <Link className="button primary" href={summary.next.url}>{label}<ArrowRight size={17} aria-hidden /></Link>;
  return <Link className="button primary continue-button" href={summary.next.url}>
    <span><small>{label} · {ui('lessonNumber', { number: course.lessons.indexOf(summary.next) + 1 })}</small><span>{summary.next.title}</span></span><ArrowRight size={18} aria-hidden />
  </Link>;
}
export function CourseProgress() {
  const t = useTranslations('Learning');
  const { progress, ready, reset } = useProgress();
  const { summary } = useLessonStates();
  const [feedback, setFeedback] = useState('');
  return <div className="progress-panel">
    <p className="eyebrow">{t('progressTitle')}</p>
    <p className="progress-count" aria-live="polite"><strong aria-hidden>{summary.done}</strong><span aria-hidden>{t('ofLessons', { total: summary.total })}</span><span className="sr-only">{ready ? t('progress', { done: summary.done, total: summary.total }) : t('loading')}</span></p>
    <ProgressSegments />
    {ready && summary.allDone && <p className="small">{t('allDone')}</p>}
    <ContinueLink detailed />
    {progress.failed && <p role="status" className="notice warning">{t('failure')}</p>}
    <div className="progress-foot"><span><Laptop size={14} aria-hidden />{t('local')}</span>
      <AlertDialog.Root>
        <AlertDialog.Trigger className="text-button" disabled={!ready}><RotateCcw size={13} aria-hidden />{t('reset')}</AlertDialog.Trigger>
        <AlertDialog.Portal><AlertDialog.Overlay className="dialog-overlay" /><AlertDialog.Content className="dialog-content">
          <AlertDialog.Title>{t('resetTitle')}</AlertDialog.Title><AlertDialog.Description>{t('resetBody')}</AlertDialog.Description>
          <div className="dialog-actions"><AlertDialog.Cancel className="button">{t('cancel')}</AlertDialog.Cancel><AlertDialog.Action className="button primary" onClick={() => { reset(); setFeedback(t('resetDone')); }}>{t('confirm')}</AlertDialog.Action></div>
        </AlertDialog.Content></AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
    <p role="status" className="small">{feedback}</p>
  </div>;
}
