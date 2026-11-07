'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { trainingProbabilities, trainingTargetIndex } from './model';
import { trainingButtonClass, TrainingCandidates, TrainingFrame, TrainingHistory, TrainingInput, TrainingStatus, useTrainingCopy } from './shared';

const lastRound = trainingProbabilities.length - 1;

export function LLMMultiRoundTrainingDemo() {
  const { t, target } = useTrainingCopy();
  const [round, setRound] = useState(0);
  const contentId = useId();

  return <TrainingFrame aria-label={t('multipleLabel')} data-training-demo="multiple" data-round={round}>
    <div className="[@media(scripting:none)]:hidden">
      <div id={contentId}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-5 rounded-sm bg-muted p-4">
          <TrainingInput label={t('sameInput')} surface />
          <div className="ml-auto min-w-0"><TrainingCandidates round={round} /></div>
        </div>
        <TrainingHistory round={round} />
        <TrainingStatus>{round ? t('statusRound', { round, target, before: trainingProbabilities[round - 1][trainingTargetIndex], after: trainingProbabilities[round][trainingTargetIndex] }) : t('statusInitial')}</TrainingStatus>
      </div>
      <div role="group" aria-label={t('multipleControls')} className="mt-5 flex flex-wrap items-center justify-between gap-3 @max-[480px]/training:flex-col @max-[480px]/training:items-start">
        <span className="text-caption text-muted-foreground">{t('roundsCompleted', { round })}</span>
        <div className="flex flex-wrap justify-end gap-2 @max-[480px]/training:w-full">
          <Button variant="action-outline" size="sm" aria-controls={contentId} disabled={round === 0} onClick={() => setRound(0)} className={`${trainingButtonClass} border-foreground`}>{t('replay')}</Button>
          <Button variant="action" size="sm" aria-controls={contentId} disabled={round === lastRound} onClick={() => setRound((current) => Math.min(lastRound, current + 1))} className={trainingButtonClass}>
            {t(round === lastRound ? 'multipleActions.finish' : round ? 'multipleActions.again' : 'multipleActions.start')}
          </Button>
        </div>
      </div>
    </div>
    <noscript><div className="space-y-5">
      <TrainingInput label={t('sameInput')} />
      <div className="text-sm leading-reading">{t('static.multiple', { target })}</div>
      <TrainingCandidates round={lastRound} />
      <TrainingHistory round={lastRound} />
    </div></noscript>
  </TrainingFrame>;
}
