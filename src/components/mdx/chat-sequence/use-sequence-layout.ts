'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

type BubblePosition = { left: number; top: number; tail: number; side: 'above' | 'below' };

export function useSequenceLayout(rootRef: RefObject<HTMLDivElement | null>, eventIndex: number) {
  const [position, setPosition] = useState<BubblePosition | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current!;
    const bubble = root.querySelector<HTMLElement>('[data-message-bubble]')!;
    let disposed = false;
    function measure() {
      if (disposed) return;
      root.querySelectorAll<SVGSVGElement>('[data-sequence-arrow]').forEach((svg) => {
        const width = svg.getBoundingClientRect().width;
        if (!width) return;
        svg.querySelector('path')!.setAttribute('d', svg.dataset.direction === 'right'
          ? `M${width - 5} 2 L${width} 6 L${width - 5} 10` : 'M5 2 L0 6 L5 10');
      });
      const bounds = root.getBoundingClientRect();
      const line = root.querySelector('[data-current="true"] svg')!.getBoundingClientRect();
      const box = bubble.getBoundingClientRect();
      if (!bounds.width || !line.width) return;
      const anchorX = line.left + line.width / 2;
      const anchorY = line.top + 6;
      const left = Math.max(bounds.left + 8, Math.min(anchorX - box.width / 2, bounds.right - box.width - 8));
      const actorsBottom = Math.max(...[...root.querySelectorAll('[data-sequence-actor]')].map((actor) => actor.getBoundingClientRect().bottom));
      const above = anchorY - 12 - box.height >= actorsBottom + 4;
      const next: BubblePosition = {
        left: left - bounds.left, top: (above ? anchorY - 12 - box.height : anchorY + 12) - bounds.top,
        tail: anchorX - left - 6, side: above ? 'above' : 'below',
      };
      setPosition((previous) => previous && Object.keys(next).every((key) => previous[key as keyof BubblePosition] === next[key as keyof BubblePosition]) ? previous : next);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(bubble);
    void document.fonts.ready.then(measure);
    return () => { disposed = true; observer.disconnect(); };
  }, [rootRef, eventIndex]);

  return position;
}
