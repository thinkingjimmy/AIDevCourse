'use client';

import { useId, useState } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { trainingFormulaInput, trainingFormulaModels, trainingProbabilities, trainingSteps, trainingTargetIndex } from './model';
import { FormulaTrainingModel } from './formula-model';
import { trainingButtonClass, TrainingFrame, TrainingInput, useTrainingCopy } from './shared';

const initialTarget = trainingFormulaModels[0][trainingTargetIndex];
const updatedTarget = trainingFormulaModels[1][trainingTargetIndex];

export function LLMSingleRoundTrainingDemo() {
  const { t, target, input, probabilitySummary } = useTrainingCopy();
  const chinese = useLocale() === 'zh';
  const [step, setStep] = useState(0);
  const contentId = useId();
  const lastStep = trainingSteps.length - 1;
  const comparing = step >= 2;

  return <TrainingFrame aria-label={t('singleLabel')} data-training-demo="single" data-step={step}>
    <div className="[@media(scripting:none)]:hidden">
      <div id={contentId}>
        <ol aria-label={t('singleSteps')} className={`mb-5 grid gap-2 ${chinese ? 'grid-cols-4' : 'grid-cols-2 @min-[480px]/training:grid-cols-4'}`}>
          {trainingSteps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}
            className="min-w-0 border-b-2 border-border pb-2 text-caption text-muted-foreground [overflow-wrap:anywhere] aria-[current=step]:border-foreground aria-[current=step]:font-medium aria-[current=step]:text-foreground">
            <span className="mr-1.5 tabular-nums @max-[480px]/training:block">0{index}</span>{t(`steps.${label}`)}
          </li>)}
        </ol>
        {step > 0 && <div data-training-input-row className={`flex items-end justify-between gap-4 @max-[400px]/training:gap-3 @max-[12rem]/training:flex-wrap ${chinese ? '' : '@max-[480px]/training:flex-col @max-[480px]/training:items-stretch'}`}>
          <TrainingInput label={t('fixedInput')} compact={comparing} />
          {comparing && <div className={`shrink-0 border-l border-border pl-5 ${chinese ? 'w-40 @max-[400px]/training:w-18 @max-[400px]/training:pl-3' : 'min-w-0 max-w-full @max-[480px]/training:border-l-0 @max-[480px]/training:pl-0'}`}>
            <div className="mb-2 text-caption text-muted-foreground">{t('sourceAnswer')}</div>
            <div data-training-target className={`flex min-h-13 w-fit min-w-13 max-w-full items-center justify-center rounded-sm bg-foreground leading-copy font-medium text-background @max-[400px]/training:min-h-11 @max-[400px]/training:min-w-11 ${chinese ? 'text-3xl @max-[400px]/training:text-2xl' : 'px-3 py-2 text-lg [overflow-wrap:anywhere]'}`}>{target}</div>
          </div>}
        </div>}
        <div data-training-models className={`grid items-start gap-4 ${step > 0 ? 'mt-5' : ''} ${step === lastStep ? 'grid-cols-2 @max-[580px]/training:grid-cols-1' : 'grid-cols-1'}`}>
          <FormulaTrainingModel candidates={trainingFormulaModels[0]} title={t(step === 0 ? 'initialParams' : step === lastStep ? 'beforeModel' : 'currentModel')} initializing={step === 0} comparing={comparing} showComparisonNote={step === 2} />
          {step === lastStep && <FormulaTrainingModel candidates={trainingFormulaModels[1]} title={t('afterModel')} updated comparing />}
        </div>
        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">{t(`announcements.${trainingSteps[step]}`, { target, before: initialTarget.probability, after: updatedTarget.probability })}</span>
      </div>
      <div role="group" aria-label={t('singleControls')} className="mt-5 flex flex-wrap items-center justify-between gap-3 @max-[480px]/training:flex-col-reverse @max-[480px]/training:items-start">
        <Button variant="plain" size="sm" aria-controls={contentId} disabled={step === 0} onClick={() => setStep(0)} className={`${trainingButtonClass} px-0 text-muted-foreground`}>{t('replay')}</Button>
        <div className="flex flex-wrap justify-end gap-2 @max-[480px]/training:w-full">
          <Button variant="action-outline" size="sm" aria-controls={contentId} disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className={`${trainingButtonClass} border-foreground`}>{t('previous')}</Button>
          <Button variant="action" size="sm" aria-controls={contentId} disabled={step === lastStep} onClick={() => setStep((current) => Math.min(lastStep, current + 1))} className={trainingButtonClass}>{t(`actions.${trainingSteps[step]}`)}</Button>
        </div>
      </div>
    </div>
    <noscript><ol aria-label={t('singleFull')} start={0} className="list-decimal space-y-3 pl-5 text-sm leading-reading">
      <li>{t('static.initialize', { target, a: initialTarget.a.toFixed(2), b: initialTarget.b.toFixed(2) })}</li>
      <li>{t('static.predict', { input, x: trainingFormulaInput, summary: probabilitySummary(trainingProbabilities[0]) })}</li>
      <li>{t('static.compare', { source: t('sourceText'), target })}</li>
      <li>{t('static.update', { target, a: initialTarget.a.toFixed(2), nextA: updatedTarget.a.toFixed(2), b: initialTarget.b.toFixed(2), nextB: updatedTarget.b.toFixed(2), x: trainingFormulaInput, score: initialTarget.score.toFixed(2), nextScore: updatedTarget.score.toFixed(2), before: initialTarget.probability, after: updatedTarget.probability })}</li>
    </ol></noscript>
  </TrainingFrame>;
}
