/**
 * [INPUT]: Stable lesson identity and restored course progress.
 * [OUTPUT]: A finish row with an explicit complete/undo action and an independent last-visit update.
 * [POS]: Lesson footer interaction; navigation never marks a lesson complete.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { useProgress } from './progress-provider';
export function LessonCompletion({ lessonId }: { lessonId: string }) {
  const t = useTranslations('Learning');
  const course = useTranslations('Course');
  const { ready, progress, complete, visit } = useProgress();
  const [feedback, setFeedback] = useState('');
  useEffect(() => { if (ready) visit(lessonId); }, [ready, visit, lessonId]);
  const done = !!progress.completed[lessonId];
  return <section className="completion-box" data-done={done}>
    <div className="learn-finish">
      <span>{course('finishedPrompt')}</span>
      <button className="learn-done" type="button" disabled={!ready} aria-pressed={done} onClick={() => {
        complete(lessonId, !done); setFeedback(t(done ? 'incomplete' : 'completed'));
      }}><Check size={14} strokeWidth={1.6} aria-hidden />{ready ? t(done ? 'undo' : 'complete') : t('loading')}</button>
    </div>
    <p role="status" className={progress.failed ? 'learn-save' : 'sr-only'}>{progress.failed ? t('failure') : feedback}</p>
  </section>;
}
