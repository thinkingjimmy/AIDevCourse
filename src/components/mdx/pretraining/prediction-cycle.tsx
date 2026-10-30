'use client';

import { useId, useLayoutEffect, useRef } from 'react';
import { FlowArrow, pretrainingFlowClass } from './diagrams';

export function PredictionCycle() {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerId = useId();

  useLayoutEffect(() => {
    const container = containerRef.current!;
    const nodes = container.querySelectorAll<HTMLElement>('[data-pretraining-operation]');
    const svg = container.querySelector('svg[data-pretraining-return]')!;
    const path = svg.querySelector('path[data-return-path]')!;
    const label = container.querySelector('[data-repeat-label]')!;

    function draw() {
      const bounds = container.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const first = nodes[0].getBoundingClientRect();
      const last = nodes[2].getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      let shape: string;
      if (Math.abs(first.top - last.top) < 1) {
        const startX = last.left + last.width / 2 - bounds.left;
        const endX = first.left + first.width / 2 - bounds.left;
        const startY = last.bottom - bounds.top;
        const endY = first.bottom - bounds.top + 4;
        const trackY = (Math.max(first.bottom, last.bottom) + label.getBoundingClientRect().top) / 2 - bounds.top;
        shape = `M${startX} ${startY} V${trackY - 6} Q${startX} ${trackY} ${startX - 6} ${trackY} H${endX + 6} Q${endX} ${trackY} ${endX} ${trackY - 6} V${endY}`;
      } else {
        const startX = last.left - bounds.left;
        const startY = last.top + last.height / 2 - bounds.top;
        const endX = first.left - bounds.left - 4;
        const endY = first.top + first.height / 2 - bounds.top;
        const trackX = (first.left - bounds.left) / 4;
        shape = `M${startX} ${startY} H${trackX + 6} Q${trackX} ${startY} ${trackX} ${startY - 6} V${endY + 6} Q${trackX} ${endY} ${trackX + 6} ${endY} H${endX}`;
      }
      path.setAttribute('d', shape);
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} role="group" aria-label="调整参数后返回预测下一个 Token，反复进行预测、对照原文和调整参数" className="relative w-full pb-15 @max-[480px]/training:pb-8 @max-[480px]/training:pl-6">
    <div className={pretrainingFlowClass}>
      {['预测下一个 Token', '对照原文', '调整参数'].map((label, index) => <div key={label} className="contents">
        {index > 0 && <FlowArrow />}
        <div data-pretraining-operation className="flex min-h-16 items-center justify-center bg-muted px-2 py-3.5 text-center @max-[480px]/training:min-h-12">{label}</div>
      </div>)}
    </div>
    <svg data-pretraining-return aria-hidden focusable="false" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-muted-foreground">
      <defs><marker id={markerId} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L5 5 L1 9" fill="none" stroke="currentColor" strokeWidth={1.25} /></marker></defs>
      <path data-return-path fill="none" stroke="currentColor" strokeWidth={1.25} markerEnd={`url(#${markerId})`} />
    </svg>
    <div data-repeat-label className="absolute bottom-0 left-0 w-full text-center text-caption text-muted-foreground">重复训练</div>
  </div>;
}
