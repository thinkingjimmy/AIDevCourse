import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';

const candidates = ['伞', '雨衣', '帽子'] as const;
const layers = [
  { y: 12, xs: [50, 150, 250, 350] },
  { y: 60, xs: [32, 116, 200, 284, 368] },
  { y: 108, xs: [50, 150, 250, 350] },
] as const;
const arrowClass = 'my-2 size-4 shrink-0 text-muted-foreground';
const scoreClass = 'mx-0.5 flex items-center justify-center rounded-sm px-0.5 py-2 text-sm @min-[360px]/probability:mx-1.5 @min-[360px]/probability:text-ui';

export function TokenProbabilityDiagram() {
  return <figure aria-label="从输入内容到采样选择下一个 Token 的过程" lang="zh-CN" data-token-probability-diagram
    className="quote-frame not-prose @container/probability mx-auto my-8 w-full max-w-150 px-4 py-7 text-base leading-body text-foreground sm:px-9 sm:py-8">
    <ol aria-label="输入、计算、候选分数和采样" className="flex flex-col items-center">
      <li data-probability-stage="input" className="flex max-w-full flex-col items-center">
        <div data-probability-input className="max-w-full rounded-sm bg-muted px-6 py-3 text-center">
          <div className="text-sm text-reading">输入内容</div>
          <div className="mt-1.5 text-base [overflow-wrap:anywhere]">今天下雨，出门记得带…</div>
        </div>
        <ArrowDownIcon aria-hidden className={arrowClass} />
      </li>
      <li data-probability-stage="compute" className="flex w-full flex-col items-center">
        <div className="text-center text-ui">大量相互连接的计算</div>
        <svg viewBox="0 0 400 120" aria-hidden focusable="false" className="mt-3 h-28 w-full max-w-95 sm:h-30">
          {layers.slice(0, -1).flatMap((layer, index) => {
            const nextLayer = layers[index + 1];
            return layer.xs.flatMap((x) => nextLayer.xs.map((nextX) => <path key={`${index}-${x}-${nextX}`}
              d={`M${x} ${layer.y} C${x} ${layer.y + 22} ${nextX} ${nextLayer.y - 22} ${nextX} ${nextLayer.y}`}
              fill="none" vectorEffect="non-scaling-stroke" className="stroke-border" />));
          })}
          {layers.flatMap((layer) => layer.xs.map((x) => <circle key={`${layer.y}-${x}`} cx={x} cy={layer.y} r={4}
            strokeWidth={1.2} vectorEffect="non-scaling-stroke" className="fill-background stroke-muted-foreground" />))}
        </svg>
        <ArrowDownIcon aria-hidden className={arrowClass} />
      </li>
      <li data-probability-stage="scores" className="flex w-full flex-col items-center">
        <div className="mb-4 text-ui">得到很多分数</div>
        <ol aria-label="候选分数与对应的 Token" className="grid w-full grid-cols-4 text-center">
          {candidates.map((candidate, index) => <li key={candidate} className="grid min-w-0 grid-rows-[1fr_auto_auto]">
            <div data-score-candidate={candidate} className={`${scoreClass} bg-muted`}>分数 {index + 1}</div>
            <ArrowDownIcon aria-hidden className="mx-auto my-1.5 size-4 text-muted-foreground" />
            <div data-token-candidate={candidate} className="text-caption text-reading @min-[360px]/probability:text-sm">{candidate}</div>
          </li>)}
          <li aria-label="以及其他分数和对应的 Token" className="grid min-w-0 grid-rows-[1fr_auto_auto] text-reading">
            <div className={scoreClass}>…</div>
            <ArrowDownIcon aria-hidden className="mx-auto my-1.5 size-4 text-muted-foreground" />
            <div className="text-caption @min-[360px]/probability:text-sm">…</div>
          </li>
        </ol>
        <div aria-hidden className="mt-3.5 flex w-full flex-col items-center">
          <svg viewBox="0 0 400 36" preserveAspectRatio="none" focusable="false" className="h-9 w-full">
            <path d="M50 0 V7 Q50 18 62 18 H338 Q350 18 350 7 V0 M150 0 V18 M250 0 V18 M200 18 V36"
              fill="none" vectorEffect="non-scaling-stroke" className="stroke-border" />
          </svg>
          <ArrowDownIcon className="size-4 text-muted-foreground" />
        </div>
      </li>
      <li data-probability-stage="sampling" className="max-w-full">
        <div data-probability-sampling className="max-w-full rounded-sm bg-muted px-4 py-3 text-center text-ui font-medium text-balance sm:px-6">
          按采样策略选择一个 <span className="whitespace-nowrap">Token ID</span>
          <div data-probability-output className="mt-1.5 text-sm font-normal text-reading">伞</div>
        </div>
      </li>
    </ol>
  </figure>;
}
