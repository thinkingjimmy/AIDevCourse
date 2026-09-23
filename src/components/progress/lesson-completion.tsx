/**
 * [INPUT]: Stable lesson identity and restored course progress.
 * [OUTPUT]: Completion card with an explicit complete/undo action and an independent last-visit update.
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
  const { ready, progress, complete, visit } = useProgress();
  const [feedback, setFeedback] = useState('');
  useEffect(() => { if (ready) visit(lessonId); }, [ready, visit, lessonId]);
  const done = !!progress.completed[lessonId];
  return <section className="completion-box" data-done={done}>
    <div><strong>{t(done ? 'completed' : 'completeTitle')}</strong><p>{t(done ? 'doneBody' : 'completeBody')}</p></div>
    <button className={`button ${done ? 'done' : 'primary'}`} disabled={!ready} aria-pressed={done} onClick={() => {
      complete(lessonId, !done); setFeedback(t(done ? 'incomplete' : 'completed'));
    }}><Check size={18} aria-hidden />{ready ? t(done ? 'undo' : 'complete') : t('loading')}</button>
    <p role="status" className={progress.failed ? undefined : 'sr-only'}>{progress.failed ? t('failure') : feedback}</p>
  </section>;
}
