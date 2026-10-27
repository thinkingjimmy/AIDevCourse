/**
 * [INPUT]: Validated article achievement definition, localized messages, course learning state, shared Alert/Button, and status icons.
 * [OUTPUT]: Achievement with a medal-labeled question, explicit answer feedback, immediate earned cards, retries, and a no-JavaScript explanation.
 * [POS]: Reusable inline article milestone; correct answers reveal and save achievements immediately; retries preserve earned records.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLearning } from '@/components/progress/progress-provider';
import { useTranslations } from 'next-intl';
import type { AchievementDefinition } from '@/lib/content/model';

const optionLetter = (index: number): string => index < 26 ? String.fromCharCode(65 + index) : optionLetter(Math.floor(index / 26) - 1) + optionLetter(index % 26);

export function Achievement({ definition }: { definition: AchievementDefinition }) {
  const { id, title, question, answer, explanation, takeaway, options } = definition;
  const t = useTranslations('Achievement');
  const { learning, ready, unlock } = useLearning();
  const unlocked = ready && Object.hasOwn(learning.unlocked, id);
  const [result, setResult] = useState<'correct' | 'incorrect'>();
  const [announcement, setAnnouncement] = useState('');
  const [selected, setSelected] = useState<string>();
  const [retrying, setRetrying] = useState(false);
  const showReward = unlocked && !retrying;
  const incorrect = !showReward && result === 'incorrect';
  const titleId = useId();
  const feedbackId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const firstOption = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLElement>(null);
  const pendingFocus = useRef<'question' | 'reward' | null>(null);

  useEffect(() => {
    if (!unlocked || !pendingFocus.current) return;
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === 'question') {
      // Wait for the new controls before returning focus to the first answer.
      const frame = requestAnimationFrame(() => firstOption.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(frame);
    }
    heading.current?.focus({ preventScroll: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.current?.animate([{ opacity: 0.65 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
    }
  }, [unlocked, result, retrying]);

  const retry = () => {
    card.current?.getAnimations().forEach((animation) => animation.cancel());
    pendingFocus.current = 'question';
    setRetrying(true);
    setSelected(undefined);
    setResult(undefined);
    setAnnouncement('');
  };

  return <Alert ref={card} variant="notice" role="region" aria-labelledby={titleId}
    data-achievement={id} data-state={showReward ? 'unlocked' : incorrect ? 'incorrect' : retrying ? 'retrying' : 'locked'}
    className="quote-frame not-prose my-8 border-foreground p-5">
    <AlertDescription className="gap-4">
      {showReward ? <header className="flex flex-col gap-2">
        <h3 ref={heading} id={titleId} tabIndex={-1} className="m-0 text-base leading-copy font-semibold">
          <span aria-hidden>🥇 </span>{t('unlocked', { title })}
        </h3>
      </header> : <p className="text-xs font-medium tracking-label text-muted-foreground"><span aria-hidden>🥇 </span><span>{t('challenge')}</span></p>}
      {showReward ? <>
        <p>{takeaway}</p>
        <Button variant="action-outline" size="action" className="self-start rounded-none" onClick={retry}>{t('retry')}</Button>
      </> : <>
        <form onSubmit={(event) => event.preventDefault()}>
          <fieldset disabled={!ready} className="m-0 min-w-0 border-0 p-0">
            <legend id={titleId} className="w-full p-0 text-ui leading-reading">{question}</legend>
            <div className="mt-4 grid gap-3 [@media(scripting:none)]:hidden">
              {options.map((choice, index) => <label key={choice.value} className="flex min-h-12 cursor-pointer items-start gap-3 border border-border bg-background px-4 py-3 text-sm leading-copy text-foreground hover:bg-surface has-checked:border-foreground has-checked:bg-surface has-disabled:cursor-not-allowed">
                <input ref={index === 0 ? firstOption : undefined} type="radio" name={titleId} value={choice.value} checked={selected === choice.value}
                  aria-invalid={incorrect && selected === choice.value || undefined}
                  aria-describedby={selected === choice.value && incorrect ? feedbackId : undefined}
                  className="mt-0.5 size-4 shrink-0 accent-foreground"
                  onChange={() => {
                    setSelected(choice.value);
                    if (choice.value !== answer) { setResult('incorrect'); return; }
                    if (unlock(id)) {
                      pendingFocus.current = 'reward';
                      setResult('correct');
                      setRetrying(false);
                      setAnnouncement(`${t('correct')} ${t('unlocked', { title })} ${takeaway}`);
                    }
                  }} />
                <span aria-hidden className="shrink-0 font-mono font-medium">{optionLetter(index)}.</span>
                <span>{choice.label}</span>
              </label>)}
            </div>
          </fieldset>
        </form>
        <noscript>
          <p>{t('noJs')}</p>
          <details className="mt-3">
            <summary className="cursor-pointer">{t('explanation')}</summary>
            <p className="mt-2">{explanation}</p>
          </details>
        </noscript>
      </>}
      <div data-answer-feedback={incorrect ? 'incorrect' : undefined} className={incorrect ? 'border border-destructive bg-destructive/5 p-4' : 'sr-only'}>
        <div id={feedbackId} role="status" aria-atomic="true" className={incorrect ? 'flex flex-col gap-2' : undefined}>
          {incorrect ? <>
            <p className="flex items-center gap-2 font-semibold text-destructive"><XCircleIcon size={20} aria-hidden />{t('incorrect')}</p>
            <p className="text-sm text-foreground">{explanation}</p>
          </> : announcement}
        </div>
      </div>
      {unlocked && learning.failed && <p role="status" className="text-sm text-muted-foreground">{t('saveFailed')}</p>}
    </AlertDescription>
  </Alert>;
}
