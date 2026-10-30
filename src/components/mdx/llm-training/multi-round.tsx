'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { trainingProbabilities, trainingTarget, trainingTargetIndex } from './model';
import { trainingButtonClass, TrainingCandidates, TrainingFrame, TrainingHistory, TrainingInput, TrainingStatus } from './shared';

const lastRound = trainingProbabilities.length - 1;
const statuses = trainingProbabilities.map((probabilities, round) => round
  ? `完成第 ${round} 轮，「${trainingTarget}」的预测概率从 ${trainingProbabilities[round - 1][trainingTargetIndex]}% 变为 ${probabilities[trainingTargetIndex]}%。`
  : '每次点击完成一轮：对照、调参数，再预测。');

export function LLMMultiRoundTrainingDemo() {
  const [round, setRound] = useState(0);
  const contentId = useId();

  return <TrainingFrame aria-label="多轮预测训练" data-training-demo="multiple" data-round={round}>
    <div className="[@media(scripting:none)]:hidden">
      <div id={contentId}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-5 bg-muted p-4">
          <TrainingInput label="同一个输入" surface />
          <div className="ml-auto"><TrainingCandidates round={round} /></div>
        </div>
        <TrainingHistory round={round} />
        <TrainingStatus>{statuses[round]}</TrainingStatus>
      </div>
      <div role="group" aria-label="多轮训练控制" className="mt-5 flex flex-wrap items-center justify-between gap-3 @max-[480px]/training:flex-col @max-[480px]/training:items-start">
        <span className="text-caption text-muted-foreground">已完成 {round} 轮</span>
        <div className="flex flex-wrap justify-end gap-2 @max-[480px]/training:w-full">
          <Button variant="action-outline" size="sm" aria-controls={contentId} disabled={round === 0} onClick={() => setRound(0)} className={`${trainingButtonClass} border-foreground`}>重新演示</Button>
          <Button variant="action" size="sm" aria-controls={contentId} disabled={round === lastRound} onClick={() => setRound((current) => Math.min(lastRound, current + 1))} className={trainingButtonClass}>
            {round === lastRound ? '演示完成' : round ? '再训练一轮' : '训练一轮'}
          </Button>
        </div>
      </div>
    </div>
    <noscript><div className="space-y-5">
      <TrainingInput label="同一个输入" />
      <div className="text-sm leading-reading">每轮都用原文答案「{trainingTarget}」作对照，根据差距调整参数，再次预测。</div>
      <TrainingCandidates round={lastRound} />
      <TrainingHistory round={lastRound} />
    </div></noscript>
  </TrainingFrame>;
}
