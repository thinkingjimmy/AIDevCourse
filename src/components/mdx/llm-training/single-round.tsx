'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { probabilitySummary, trainingFormulaInput, trainingFormulaModels, trainingInput, trainingProbabilities, trainingSteps, trainingTarget, trainingTargetIndex } from './model';
import { FormulaTrainingModel } from './formula-model';
import { trainingButtonClass, TrainingFrame, TrainingInput } from './shared';

const initialTarget = trainingFormulaModels[0][trainingTargetIndex];
const updatedTarget = trainingFormulaModels[1][trainingTargetIndex];
const stepAnnouncements = [
  '先给每个候选的 a、b 设置初始值，还没有输入或预测结果。',
  `模型给「${trainingTarget}」的概率是 ${initialTarget.probability}%。接下来对照原文。`,
  `原文答案是「${trainingTarget}」，模型却只给了它 ${initialTarget.probability}% 的概率。用原文答案衡量这次预测的差距。`,
  `原模型保留不变，旁边显示调整后的模型。相同输入下，a、b 改变了分数，${trainingTarget}的预测概率从 ${initialTarget.probability}% 变为 ${updatedTarget.probability}%。`,
];
const actions = ['开始预测', '对照原文', '根据差距调参数', '本轮完成'];

export function LLMSingleRoundTrainingDemo() {
  const [step, setStep] = useState(0);
  const contentId = useId();
  const lastStep = trainingSteps.length - 1;
  const comparing = step >= 2;

  return <TrainingFrame aria-label="一轮预测训练" data-training-demo="single" data-step={step}>
    <div className="[@media(scripting:none)]:hidden">
      <div id={contentId}>
        <ol aria-label="本轮训练步骤" className="mb-5 grid grid-cols-4 gap-2">
          {trainingSteps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}
            className="min-w-0 border-b-2 border-border pb-2 text-caption text-muted-foreground aria-[current=step]:border-foreground aria-[current=step]:font-medium aria-[current=step]:text-foreground">
            <span className="mr-1.5 tabular-nums @max-[480px]/training:block">0{index}</span>{label}
          </li>)}
        </ol>
        {step > 0 && <div data-training-input-row className="flex items-end justify-between gap-4 @max-[400px]/training:gap-3 @max-[12rem]/training:flex-wrap">
          <TrainingInput label="固定输入" compact={comparing} />
          {comparing && <div className="w-40 shrink-0 border-l border-border pl-5 @max-[400px]/training:w-18 @max-[400px]/training:pl-3">
            <div className="mb-2 text-caption text-muted-foreground">原文答案</div>
            <div data-training-target className="flex min-h-13 w-fit min-w-13 items-center justify-center bg-foreground text-3xl leading-copy font-medium text-background @max-[400px]/training:min-h-11 @max-[400px]/training:min-w-11 @max-[400px]/training:text-2xl">{trainingTarget}</div>
          </div>}
        </div>}
        <div data-training-models className={`grid items-start gap-4 ${step > 0 ? 'mt-5' : ''} ${step === lastStep ? 'grid-cols-2 @max-[580px]/training:grid-cols-1' : 'grid-cols-1'}`}>
          <FormulaTrainingModel candidates={trainingFormulaModels[0]} title={step === 0 ? '初始参数' : step === lastStep ? '调整前的模型' : '当前模型'} initializing={step === 0} comparing={comparing} showComparisonNote={step === 2} />
          {step === lastStep && <FormulaTrainingModel candidates={trainingFormulaModels[1]} title="调整后的模型" updated comparing />}
        </div>
        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">{stepAnnouncements[step]}</span>
      </div>
      <div role="group" aria-label="一轮训练控制" className="mt-5 flex flex-wrap items-center justify-between gap-3 @max-[480px]/training:flex-col-reverse @max-[480px]/training:items-start">
        <Button variant="plain" size="sm" aria-controls={contentId} disabled={step === 0} onClick={() => setStep(0)} className={`${trainingButtonClass} px-0 text-muted-foreground`}>重新演示</Button>
        <div className="flex flex-wrap justify-end gap-2 @max-[480px]/training:w-full">
          <Button variant="action-outline" size="sm" aria-controls={contentId} disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className={`${trainingButtonClass} border-foreground`}>上一步</Button>
          <Button variant="action" size="sm" aria-controls={contentId} disabled={step === lastStep} onClick={() => setStep((current) => Math.min(lastStep, current + 1))} className={trainingButtonClass}>{actions[step]}</Button>
        </div>
      </div>
    </div>
    <noscript><ol aria-label="一轮预测训练的完整过程" start={0} className="list-decimal space-y-3 pl-5 text-sm leading-reading">
      <li>初始化每个候选的参数。例如「{trainingTarget}」的 a = {initialTarget.a.toFixed(2)}，b = {initialTarget.b.toFixed(2)}。</li>
      <li>输入「{trainingInput}…」，将下雨简化为 x = {trainingFormulaInput}，预测下一个 Token：{probabilitySummary(trainingProbabilities[0])}。</li>
      <li>对照原文「{trainingInput}{trainingTarget}」，下一个 Token 是「{trainingTarget}」。</li>
      <li>根据差距调整参数。例如「{trainingTarget}」的 a 从 {initialTarget.a.toFixed(2)} 变为 {updatedTarget.a.toFixed(2)}，b 从 {initialTarget.b.toFixed(2)} 变为 {updatedTarget.b.toFixed(2)}。输入 x 仍是 {trainingFormulaInput}，分数从 {initialTarget.score.toFixed(2)} 变为 {updatedTarget.score.toFixed(2)}，经 Softmax 换算后的概率从 {initialTarget.probability}% 变为 {updatedTarget.probability}%。</li>
    </ol></noscript>
  </TrainingFrame>;
}
