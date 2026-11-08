'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { MedalIcon } from '@phosphor-icons/react/dist/ssr/Medal';
import { Button } from '@/components/ui/button';
import { FramedNote } from '@/components/mdx/notes/framed-note';
import { useLearning } from '@/components/progress/progress-provider';
import { AchievementGallery } from '@/components/progress/achievement-gallery';
import { useTranslations } from 'next-intl';
import type { AchievementDefinition } from '@/lib/content/model';
import { playAchievementConfetti } from '@/components/progress/confetti';

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
  const stopCelebration = useRef<(() => void) | null>(null);

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
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const emphasis = !motion.matches ? card.current?.animate([{ opacity: 0.65 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' }) : undefined;
    const stopConfetti = playAchievementConfetti();
    const stop = () => { emphasis?.cancel(); stopConfetti(); };
    const onMotionChange = () => { if (motion.matches) stop(); };
    stopCelebration.current = stop;
    motion.addEventListener('change', onMotionChange);
    return () => {
      stop();
      stopCelebration.current = null;
      motion.removeEventListener('change', onMotionChange);
    };
  }, [unlocked, result, retrying]);

  const retry = () => {
    stopCelebration.current?.();
    card.current?.getAnimations().forEach((animation) => animation.cancel());
    pendingFocus.current = 'question';
    setRetrying(true);
    setSelected(undefined);
    setResult(undefined);
    setAnnouncement('');
  };

  return <FramedNote ref={card} id={`achievement-${id}`} role="region" aria-labelledby={titleId}
    label={showReward ? t('unlocked', { title }) : t('challenge')}
    data-achievement={id} data-state={showReward ? 'unlocked' : incorrect ? 'incorrect' : retrying ? 'retrying' : 'locked'}
    signature={showReward ? <h3 ref={heading} id={titleId} tabIndex={-1} className="m-0 min-w-0 wrap-anywhere text-sm leading-copy font-medium text-brand">
      <span aria-hidden>🥇 </span>{t('unlocked', { title })}
    </h3> : <span className="text-sm leading-copy font-medium text-brand"><span aria-hidden>🥇 </span><span>{t('challenge')}</span></span>}>
    <div className="flex min-w-0 flex-col gap-4">
      {showReward ? <>
        <p>{takeaway}</p>
        <footer className="flex flex-wrap items-center gap-3">
          <Button variant="brand-outline" className="h-auto min-h-11 max-w-full touch-manipulation rounded-sm px-4 whitespace-normal" onClick={retry}>
            <ArrowCounterClockwiseIcon size={20} aria-hidden /><span>{t('retry')}</span>
          </Button>
          <AchievementGallery>
            <Button variant="brand-outline" className="h-auto min-h-11 max-w-full touch-manipulation rounded-sm px-4 whitespace-normal">
              <MedalIcon size={20} aria-hidden /><span>{t('viewAll')}</span>
            </Button>
          </AchievementGallery>
        </footer>
      </> : <>
        <form onSubmit={(event) => event.preventDefault()}>
          <fieldset disabled={!ready} className="m-0 min-w-0 border-0 p-0">
            <legend id={titleId} className="w-full p-0 text-base leading-reading">{question}</legend>
            <div className="mt-4 grid gap-3 [@media(scripting:none)]:hidden">
              {options.map((choice, index) => <label key={choice.value} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-sm border border-brand/25 bg-background px-4 py-3 text-sm leading-copy text-foreground hover:border-brand/50 hover:bg-brand/5 has-checked:border-brand has-checked:bg-brand-soft has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:bg-destructive/5 has-disabled:cursor-not-allowed">
                <input ref={index === 0 ? firstOption : undefined} type="radio" name={titleId} value={choice.value} checked={selected === choice.value}
                  aria-invalid={incorrect && selected === choice.value || undefined}
                  aria-describedby={selected === choice.value && incorrect ? feedbackId : undefined}
                  className="mt-0.5 size-4 shrink-0 accent-brand focus-visible:outline-brand aria-invalid:accent-destructive"
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
            <summary className="cursor-pointer rounded-sm">{t('explanation')}</summary>
            <p className="mt-2">{explanation}</p>
          </details>
        </noscript>
      </>}
      <div data-answer-feedback={incorrect ? 'incorrect' : undefined} className={incorrect ? 'rounded-sm border border-destructive bg-destructive/5 p-4' : 'sr-only'}>
        <div id={feedbackId} role="status" aria-atomic="true" className={incorrect ? 'flex flex-col gap-2' : undefined}>
          {incorrect ? <>
            <p className="flex items-center gap-2 font-semibold text-destructive"><XCircleIcon size={20} aria-hidden />{t('incorrect')}</p>
            <p className="text-sm text-foreground">{explanation}</p>
          </> : announcement}
        </div>
      </div>
      {unlocked && learning.failed && <p role="status" className="text-sm text-muted-foreground">{t('saveFailed')}</p>}
    </div>
  </FramedNote>;
}
