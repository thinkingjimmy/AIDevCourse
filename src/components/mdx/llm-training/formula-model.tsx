import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { useLocale } from 'next-intl';
import { trainingFormulaInput, trainingTarget, type TrainingFormulaCandidate } from './model';
import { useTrainingCopy } from './shared';
import { TrainingComparisonNote } from './comparison-note';

export function FormulaTrainingModel({ candidates, title, updated = false, comparing = false, initializing = false, showComparisonNote = false }: {
  candidates: readonly TrainingFormulaCandidate[];
  title: string;
  updated?: boolean;
  comparing?: boolean;
  initializing?: boolean;
  showComparisonNote?: boolean;
}) {
  const { t, probabilitySummary } = useTrainingCopy();
  const compactLabels = useLocale() === 'zh';
  const target = candidates.find((candidate) => candidate.token === trainingTarget);
  const coefficientClass = `inline-flex flex-wrap items-baseline justify-center gap-1 rounded-sm px-1.5 py-1 text-caption leading-copy font-medium tabular-nums ${updated ? 'bg-foreground text-background' : 'bg-muted'}`;
  return <div data-training-model={updated ? 'after' : 'before'} className={`min-w-0 rounded-sm border p-3 ${updated ? 'border-foreground' : 'border-border'}`}>
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span className="text-sm font-medium">{title}</span>
      <span className="text-caption text-muted-foreground">y = ax + b</span>
    </div>
    <div className="mb-2 text-caption text-muted-foreground">{t(initializing ? 'initialHint' : 'formulaHint')}</div>
    <div aria-label={t(initializing ? 'paramsLabel' : 'formulaLabel', { title })} className="grid gap-2.5">
      {candidates.map((candidate) => <div key={candidate.token} data-training-formula-candidate={t(`candidates.${candidate.token}`)} data-candidate-id={candidate.token} className={`grid min-w-0 items-center gap-2 ${compactLabels ? 'grid-cols-[2rem_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        <span className="text-sm [overflow-wrap:anywhere]">{t(`candidates.${candidate.token}`)}</span>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-caption tabular-nums">
          <span data-training-coefficient="a" className={coefficientClass}><span className="font-normal">a</span><span data-coefficient-value>{candidate.a.toFixed(2)}</span></span>
          {!initializing && <span>× {trainingFormulaInput} +</span>}
          <span data-training-coefficient="b" className={coefficientClass}><span className="font-normal">b</span><span data-coefficient-value>{candidate.b.toFixed(2)}</span></span>
          {!initializing && <span className="whitespace-nowrap">= <span data-training-score>{candidate.score.toFixed(2)}</span></span>}
        </div>
      </div>)}
    </div>
    {!initializing && <>
      <div data-training-softmax className="my-3 flex items-center justify-start gap-2 text-caption text-muted-foreground"><ArrowDownIcon size={16} className="shrink-0" aria-hidden /><span>{t('softmax')}</span></div>
      <div className="relative">
        {showComparisonNote && target && <TrainingComparisonNote probability={target.probability} />}
        <div role="img" aria-label={probabilitySummary(candidates.map((candidate) => candidate.probability))} data-training-probabilities className="grid gap-3">
        {candidates.map((candidate) => <div key={candidate.token} data-answer={candidate.token === trainingTarget} data-comparing={comparing && candidate.token === trainingTarget}
          className={`grid min-w-0 items-center gap-2 rounded-sm border border-transparent px-1 py-1 data-[comparing=true]:border-foreground data-[comparing=true]:font-medium ${compactLabels ? 'grid-cols-[2rem_minmax(0,1fr)_2.75rem]' : 'grid-cols-[minmax(0,1fr)_2.75rem]'}`}>
          <span className={compactLabels ? undefined : 'col-span-2 [overflow-wrap:anywhere]'}>{t(`candidates.${candidate.token}`)}</span>
          <div className="h-2 rounded-sm bg-muted"><div className={`h-full rounded-sm ${candidate.token === trainingTarget ? 'bg-foreground' : 'bg-faint'}`} style={{ width: `${candidate.probability}%` }} /></div>
          <span data-training-probability className="text-right tabular-nums">{candidate.probability}%</span>
        </div>)}
        </div>
      </div>
    </>}
  </div>;
}
