/**
 * [INPUT]: Stable lesson identity, restored progress, shared Button, and Phosphor check icon.
 * [OUTPUT]: A left-aligned complete/undo button and an independent last-visit update.
 * [POS]: Lesson footer interaction; navigation never marks a lesson complete.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { useProgress } from './progress-provider';
export function LessonCompletion({ lessonId }: { lessonId: string }) {
  const t = useTranslations('Learning');
  const { ready, progress, complete, visit } = useProgress();
  const [feedback, setFeedback] = useState('');
  useEffect(() => { if (ready) visit(lessonId); }, [ready, visit, lessonId]);
  const done = !!progress.completed[lessonId];
  return <section className="completion-box mt-10 block max-w-none border-0 bg-transparent p-0" data-done={done}>
    <div className="flex w-full flex-none items-center justify-start gap-4 text-[14px]">
      <Button variant="completion" size="completion" className="leading-[inherit]" disabled={!ready} aria-pressed={done} onClick={() => {
        complete(lessonId, !done); setFeedback(t(done ? 'incomplete' : 'completed'));
      }}><CheckIcon size={14} aria-hidden />{ready ? t(done ? 'undo' : 'complete') : t('loading')}</Button>
    </div>
    <p role="status" className={progress.failed ? 'mt-3 w-full text-[14px] text-muted-foreground' : 'sr-only'}>{progress.failed ? t('failure') : feedback}</p>
  </section>;
}
