import type { ComponentProps, ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { htmlLanguages, isLocale } from '@/lib/i18n/config';
import { trainingCandidates, trainingProbabilities, trainingTarget, trainingTargetIndex } from './model';

export function useTrainingCopy() {
  const t = useTranslations('Training');
  const candidates = trainingCandidates.map((candidate) => t(`candidates.${candidate}`));
  return {
    t, candidates, target: candidates[trainingTargetIndex], input: t('input'),
    probabilitySummary: (probabilities: readonly number[]) => candidates.map((candidate, index) => `${candidate} ${probabilities[index]}%`).join(t('separator')),
  };
}

export const trainingButtonClass = 'h-auto min-h-11 rounded-sm px-3 py-2 text-caption leading-copy whitespace-normal';

export function TrainingFrame(props: ComponentProps<'figure'>) {
  const locale = useLocale();
  return <figure {...props} lang={htmlLanguages[isLocale(locale) ? locale : 'en']} className="quote-frame not-prose @container/training my-8 p-4 text-sm leading-body text-foreground sm:p-5" />;
}

export function TrainingInput({ label, surface = false, compact = false }: { label?: string; surface?: boolean; compact?: boolean }) {
  const { t, input } = useTrainingCopy();
  return <div className="min-w-0">
    <div className={`text-caption ${surface ? 'text-reading' : 'text-muted-foreground'}`}>{label ?? t('inputLabel')}</div>
    <div data-training-input aria-label={t('inputAria', { input })}
      className={`mt-2 rounded-sm px-3 text-base leading-body [overflow-wrap:anywhere] ${compact ? 'py-2' : 'py-3'} ${surface ? 'bg-background' : 'bg-muted'}`}>{input}…</div>
  </div>;
}

export function TrainingCandidates({ round }: { round: number }) {
  const { t, candidates, probabilitySummary } = useTrainingCopy();
  const probabilities = trainingProbabilities[round];
  return <div>
    <div className="text-caption text-reading">{round ? t('predictionAfter', { round }) : t('predictionBefore')}</div>
    <div role="img" aria-label={probabilitySummary(probabilities)} data-training-candidates className="mt-2 flex flex-wrap gap-1.5">
      {trainingCandidates.map((candidate, index) => <div key={candidate} data-answer={candidate === trainingTarget}
        className="flex min-w-12 flex-col items-center justify-center rounded-sm border border-border bg-background px-2.5 py-2 data-[answer=true]:border-foreground data-[answer=true]:bg-foreground data-[answer=true]:text-background">
        <span className="max-w-full text-lg leading-copy font-medium [overflow-wrap:anywhere]">{candidates[index]}</span>
        <span className="text-caption leading-copy tabular-nums">{probabilities[index]}%</span>
      </div>)}
    </div>
  </div>;
}

export function TrainingHistory({ round }: { round: number }) {
  const { t, target } = useTrainingCopy();
  return <div>
    <div className="mb-3 text-caption text-muted-foreground">{t('historyTitle', { target })}</div>
    <ol aria-label={t('historyLabel', { target })} data-training-history className="grid grid-cols-2 gap-y-4 @min-[320px]/training:grid-cols-4">
      {trainingProbabilities.map((probabilities, index) => <li key={index} data-reached={index <= round} data-completed={index < round} aria-current={index === round ? 'step' : undefined}
        className="relative min-w-0 border-t-2 border-border pt-2.5 pr-1 data-[completed=true]:border-foreground aria-[current=step]:before:absolute aria-[current=step]:before:-top-1 aria-[current=step]:before:left-0 aria-[current=step]:before:size-1.5 aria-[current=step]:before:rounded-sm aria-[current=step]:before:bg-foreground">
        <span className="text-caption text-muted-foreground [overflow-wrap:anywhere]">{index ? t('afterRound', { round: index }) : t('before')}</span>
        <span className="mt-1 block text-2xl leading-copy tabular-nums data-[reached=false]:text-muted-foreground" data-reached={index <= round}>
          {index <= round ? `${probabilities[trainingTargetIndex]}%` : '—'}
        </span>
      </li>)}
    </ol>
  </div>;
}

export function TrainingStatus({ children }: { children: ReactNode }) {
  return <div role="status" aria-live="polite" aria-atomic="true" className="mt-5 rounded-sm bg-muted px-3 py-2.5 text-caption leading-body">{children}</div>;
}
