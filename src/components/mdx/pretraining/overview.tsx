'use client';

import { Tabs } from 'radix-ui';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { TrainingFrame } from '../llm-training/shared';
import { PretrainingIllustration, usePretrainingSteps } from './illustrations';

export function LLMPretrainingOverview() {
  const t = useTranslations('Pretraining');
  const pretrainingSteps = usePretrainingSteps();
  return <TrainingFrame aria-label={t('label')} data-pretraining-overview>
    <div className="[@media(scripting:none)]:hidden">
      <Tabs.Root defaultValue="cleaning">
        <Tabs.List aria-label={t('tabsLabel')} className="grid grid-cols-3 gap-3">
          {pretrainingSteps.map((step, index) => <Tabs.Trigger key={step.value} value={step.value} asChild>
            <Button variant="plain" size="reset" className="min-h-11 min-w-0 cursor-pointer touch-manipulation items-center justify-start gap-1.5 rounded-sm border-b-2 border-border pb-2 text-left text-caption font-medium whitespace-normal text-muted-foreground [overflow-wrap:anywhere] hover:text-foreground active:translate-y-px data-[state=active]:border-foreground data-[state=active]:text-foreground @max-[480px]/training:flex-col @max-[480px]/training:items-start @max-[480px]/training:gap-1">
              <span className="tabular-nums">0{index + 1}</span><span>{step.label}</span>
            </Button>
          </Tabs.Trigger>)}
        </Tabs.List>
        {pretrainingSteps.map((step) => <Tabs.Content key={step.value} value={step.value} forceMount className="pt-4 outline-foreground data-[state=inactive]:hidden">
          <PretrainingIllustration step={step} />
        </Tabs.Content>)}
      </Tabs.Root>
    </div>
    <noscript><ol aria-label={t('fullLabel')} className="space-y-6">
      {pretrainingSteps.map((step, index) => <li key={step.value}>
        <div className="mb-4 text-caption text-muted-foreground">0{index + 1} {step.label}</div>
        <PretrainingIllustration step={step} interactive={false} />
      </li>)}
    </ol></noscript>
  </TrainingFrame>;
}
