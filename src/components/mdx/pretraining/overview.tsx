'use client';

import { useId } from 'react';
import { Tabs } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { TrainingFrame } from '../llm-training/shared';
import { DataCleaningStep, TokenizationStep } from './diagrams';
import { PredictionCycle } from './prediction-cycle';

const steps = [
  { value: 'cleaning', label: '筛选和清洗' },
  { value: 'tokens', label: '转为 Token' },
  { value: 'prediction', label: '预测训练' },
] as const;

export function LLMPretrainingOverview() {
  const id = useId();
  return <TrainingFrame aria-label="预训练的大致流程" data-pretraining-overview>
    <div className="[@media(scripting:none)]:hidden">
      <Tabs.Root defaultValue="cleaning">
        <Tabs.List aria-label="选择预训练步骤" className="grid grid-cols-3 gap-3">
          {steps.map((step, index) => <Tabs.Trigger key={step.value} value={step.value} asChild>
            <Button variant="plain" size="reset" className="min-h-11 cursor-pointer touch-manipulation items-center justify-start gap-1.5 border-b-2 border-border pb-2 text-caption font-medium text-muted-foreground hover:text-foreground active:translate-y-px data-[state=active]:border-foreground data-[state=active]:text-foreground @max-[480px]/training:flex-col @max-[480px]/training:items-start @max-[480px]/training:gap-1">
              <span className="tabular-nums">0{index + 1}</span><span>{step.label}</span>
            </Button>
          </Tabs.Trigger>)}
        </Tabs.List>
        {steps.map((step) => <Tabs.Content key={step.value} value={step.value} className="outline-foreground">
          <div className="flex min-h-64 items-center py-6 @max-[480px]/training:min-h-100">
            {step.value === 'cleaning' ? <DataCleaningStep /> : step.value === 'tokens' ? <TokenizationStep /> : <PredictionCycle />}
          </div>
        </Tabs.Content>)}
      </Tabs.Root>
    </div>
    <noscript><ol aria-label="预训练的完整流程" className="space-y-6">
      <li><div className="mb-4 text-caption text-muted-foreground">01 筛选和清洗</div><DataCleaningStep /></li>
      <li><div className="mb-4 text-caption text-muted-foreground">02 转为 Token</div><TokenizationStep /></li>
      <li><div id={`${id}-prediction`} className="mb-2 text-caption text-muted-foreground">03 预测训练</div><p aria-labelledby={`${id}-prediction`}>预测下一个 Token → 对照原文 → 调整参数 → 再次预测</p></li>
    </ol></noscript>
  </TrainingFrame>;
}
