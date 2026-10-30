'use client';

import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { animateGeneration } from './llm-generation/animation';
import { answer, pendingClass, placeholderClass, question } from './llm-generation/model';

const rowClass = 'flex h-(--row-height) shrink-0 items-center';
const panelClass = 'grid w-full grid-cols-[minmax(0,1fr)_calc(var(--candidate-size)*3+var(--candidate-gap)*2)] items-center gap-3 p-3 @max-[600px]/generation:grid-cols-1 @max-[600px]/generation:gap-2';
const inputClass = 'grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-3 @max-[600px]/generation:grid-cols-[1.625rem_minmax(0,1fr)] @max-[600px]/generation:gap-2.5';
const labelClass = 'text-caption whitespace-nowrap text-muted-foreground tabular-nums';
const fullClass = 'min-w-0 whitespace-pre-wrap wrap-break-word text-reading';
const generatedClass = 'inline-block max-w-full align-baseline whitespace-normal font-medium text-foreground';
const fullLabel = '@max-[600px]/generation:hidden';
const shortLabel = 'hidden @max-[600px]/generation:inline';

export function LLMGenerationDemo() {
  const root = useRef<HTMLElement>(null);
  const rowsId = useId();
  useEffect(() => {
    if (root.current) return animateGeneration(root.current);
  }, []);

  return <figure ref={root} aria-label="文字接龙演示" lang="zh-CN" data-generation-demo data-complete="false" data-playing="true"
    className="quote-frame not-prose group/generation @container/generation relative my-8 p-4 text-base leading-reading sm:p-5">
    <figcaption className="text-sm font-medium">预测概率 → 按规则选择 → 继续生成</figcaption>
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
            <div className={labelClass}><span data-current-round className={fullLabel}>第 1 轮</span><span data-current-short className={shortLabel}>01</span></div>
            <div className={fullClass}><span data-current-input><span className="text-muted-foreground">今天广州的天气<span data-question-tail className={pendingClass}>如何？<span data-placeholder aria-hidden className={placeholderClass} /></span></span><span data-current-prefix className={generatedClass} /></span></div>
          </div>
          <div data-calculation className="flex min-w-0 items-center self-center justify-self-end group-data-[complete=true]/generation:hidden @max-[600px]/generation:ml-9">
            <div data-candidates className="flex gap-(--candidate-gap)">
              {['广', '今', '明'].map((letter, index) => <div key={letter} data-candidate={index}
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
            <div className={labelClass}><span data-draft-round className={fullLabel}>第 2 轮</span><span data-draft-short className={shortLabel}>02</span></div>
            <div data-draft-input className={fullClass}><span className="text-muted-foreground group-data-[complete=true]/generation:hidden">{question}</span><span data-generation-output className={generatedClass} /><span data-landing aria-hidden className="ml-[3px] inline-block h-[1em] w-0.5 align-[-0.12em]" /></div>
          </div>
          </div>
        </div>
        <div aria-hidden className={`${rowClass} invisible`} />
      </div>
    </div>
    <div role="group" aria-label="播放控制" className="mt-3 flex flex-wrap items-center justify-end gap-2 [@media(scripting:none)]:hidden">
      <Button variant="action-outline" size="sm" data-action="pause" aria-controls={rowsId} className="min-h-11 rounded-sm px-3">暂停</Button>
      <Button variant="action-outline" size="sm" data-action="replay" aria-controls={rowsId} className="min-h-11 rounded-sm px-3">重新播放</Button>
    </div>
    <span data-flight aria-hidden className="pointer-events-none absolute top-0 left-0 z-10 flex size-8 origin-top-left items-center justify-center rounded-sm bg-foreground text-lg font-medium text-background opacity-0" />
    <span data-announcement role="status" aria-live="polite" className="sr-only" />
    <noscript><details className="text-sm leading-reading">
      <summary className="rounded-sm text-foreground">查看完整生成过程</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
        <li>输入「{question}」，预测候选概率：「广」48%、「今」42%、「明」10%。</li>
        <li>按概率采样，本次选中「今」（42%），而非概率最高的「广」（48%）。</li>
        <li>输入「{question}今」，重新预测候选概率，再按规则选择，本次生成「天」。</li>
        <li>将结果接回完整输入，继续生成。</li>
        <li>最终回答（虚构）：{answer.join('')}</li>
      </ol>
    </details></noscript>
  </figure>;
}
