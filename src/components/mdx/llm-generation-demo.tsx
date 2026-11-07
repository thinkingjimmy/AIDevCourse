'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { animateGeneration } from './llm-generation/animation';
import { createGenerationModel, pendingClass, placeholderClass } from './llm-generation/model';

const rowClass = 'flex h-(--row-height) shrink-0 items-center';
const panelClass = 'grid w-full grid-cols-[minmax(0,1fr)_calc(var(--candidate-size)*3+var(--candidate-gap)*2)] items-center gap-3 rounded-sm p-3 @max-[600px]/generation:grid-cols-1 @max-[600px]/generation:gap-2';
const inputClass = 'grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-baseline gap-3 @max-[600px]/generation:grid-cols-[1.625rem_minmax(0,1fr)] @max-[600px]/generation:gap-2.5';
const labelClass = 'text-caption whitespace-nowrap text-muted-foreground tabular-nums';
const fullClass = 'min-w-0 whitespace-pre-wrap wrap-break-word text-reading';
const generatedClass = 'inline-block max-w-full align-baseline whitespace-normal font-medium text-foreground';
const fullLabel = '@max-[600px]/generation:hidden';
const shortLabel = 'hidden @max-[600px]/generation:inline';

export function LLMGenerationDemo() {
  const locale = useLocale();
  const t = useTranslations('Generation');
  const model = useMemo(() => createGenerationModel({
    question: t('question'), answer: t('answer'), firstAlternatives: t('firstAlternatives'),
    secondAlternatives: t('secondAlternatives'), alternatives: t('alternatives'),
  }, locale), [locale, t]);
  const { question, answer, generationFrame } = model;
  const firstCandidates = generationFrame(0).candidates;
  const root = useRef<HTMLElement>(null);
  const rowsId = useId();
  useEffect(() => {
    if (root.current) return animateGeneration(root.current, model, t);
  }, [model, t]);

  return <figure ref={root} aria-label={t('label')} lang={locale} data-generation-demo data-complete="false" data-playing="true"
    className="quote-frame not-prose group/generation @container/generation relative my-8 p-4 text-base leading-reading sm:p-5">
    <figcaption className="text-sm font-medium">{t('caption')}</figcaption>
    <div data-paper id={rowsId} aria-hidden="true"
      className="relative h-[calc(var(--row-height)*2.5+var(--row-gap)*2)] overflow-hidden [--row-height:6rem] [--row-gap:0.875rem] [--candidate-size:2.5rem] [--candidate-gap:0.3125rem] [mask-image:linear-gradient(to_bottom,transparent,#000_calc(var(--row-height)/2))] @max-[600px]/generation:[--row-height:10.25rem] @max-[600px]/generation:[--row-gap:0.75rem] [@media(scripting:none)]:hidden">
      <div data-sheet className="flex flex-col gap-(--row-gap)">
        <div data-previous className={`${rowClass} invisible`}>
          <div data-row-content className={`${panelClass} bg-muted`}>
          <div data-input-row className={inputClass}>
            <div className={labelClass}><span data-previous-round className={fullLabel} /><span data-previous-short className={shortLabel} /></div>
            <div className={fullClass}><span className="text-muted-foreground">{question}</span><span data-previous-prefix className={generatedClass} /></div>
          </div>
          </div>
        </div>
        <div data-current className={`${rowClass} group-data-[complete=true]/generation:opacity-50`}>
          <div data-row-content className={`${panelClass} bg-muted`}>
          <div data-input-row className={`${inputClass} group-data-[complete=true]/generation:col-span-full`}>
            <div className={labelClass}><span data-current-round className={fullLabel}>{t('round', { number: 1 })}</span><span data-current-short className={shortLabel}>01</span></div>
            <div className={fullClass}><span data-current-input><span className="text-muted-foreground">{question.slice(0, -3)}<span data-question-tail className={pendingClass}>{question.slice(-3)}<span data-placeholder aria-hidden className={placeholderClass} /></span></span><span data-current-prefix className={generatedClass} /></span></div>
          </div>
          <div data-calculation className="flex min-w-0 items-center self-center justify-self-end group-data-[complete=true]/generation:hidden @max-[600px]/generation:ml-9">
            <div data-candidates className="flex gap-(--candidate-gap)">
              {firstCandidates.map(({ letter }, index) => <div key={letter} data-candidate={index}
                className="flex min-h-13 w-(--candidate-size) flex-col items-center justify-center rounded-sm border border-border bg-background text-reading data-[selected=true]:border-foreground data-[selected=true]:bg-foreground data-[selected=true]:text-background data-[muted=true]:opacity-35">
                <span data-letter className="text-base leading-copy font-medium data-[space=true]:text-caption">{letter}</span>
                <span data-probability-label className="text-caption leading-copy tabular-nums">—</span>
              </div>)}
            </div>
          </div>
          </div>
        </div>
        <div data-draft className={`${rowClass} invisible`}>
          <div data-row-content className={panelClass}>
          <div data-input-row className={`${inputClass} group-data-[complete=true]/generation:col-span-full`}>
            <div className={labelClass}><span data-draft-round className={fullLabel}>{t('round', { number: 2 })}</span><span data-draft-short className={shortLabel}>02</span></div>
            <div data-draft-input className={fullClass}><span className="text-muted-foreground group-data-[complete=true]/generation:hidden">{question}</span><span data-generation-output className={generatedClass} /><span data-landing aria-hidden className="ml-[3px] inline-block h-[1em] w-0.5 align-[-0.12em]" /></div>
          </div>
          </div>
        </div>
        <div aria-hidden className={`${rowClass} invisible`} />
      </div>
    </div>
    <div role="group" aria-label={t('controls')} className="mt-3 flex flex-wrap items-center justify-end gap-2 [@media(scripting:none)]:hidden">
      <Button variant="action-outline" size="sm" data-action="pause" aria-controls={rowsId} className="min-h-11 rounded-sm px-3">{t('pause')}</Button>
      <Button variant="action-outline" size="sm" data-action="replay" aria-controls={rowsId} className="min-h-11 rounded-sm px-3">{t('replay')}</Button>
    </div>
    <span data-flight aria-hidden className="pointer-events-none absolute top-0 left-0 z-10 flex size-8 origin-top-left items-center justify-center rounded-sm bg-foreground text-lg font-medium text-background opacity-0" />
    <span data-announcement role="status" aria-live="polite" className="sr-only" />
    <noscript><details className="text-sm leading-reading">
      <summary className="rounded-sm text-foreground">{t('staticTitle')}</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
        <li>{t('staticInput', { question, alternative: firstCandidates[0].letter, first: answer[0], other: firstCandidates[2].letter })}</li>
        <li>{t('staticSelection', { first: answer[0], alternative: firstCandidates[0].letter })}</li>
        <li>{t('staticNext', { question, first: answer[0], second: answer[1] })}</li>
        <li>{t('staticLoop')}</li>
        <li>{t('staticAnswer', { answer: answer.join('') })}</li>
      </ol>
    </details></noscript>
  </figure>;
}
