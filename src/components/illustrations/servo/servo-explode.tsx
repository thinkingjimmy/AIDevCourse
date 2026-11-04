'use client';

import { useEffect, useRef } from 'react';
import { animateIllustration, translatePart } from '../animation';
import { SERVO_CARD_SVG } from './markup';
import { SERVO_HERO_SVG } from './hero-markup';

function ease(amount: number) {
  return amount * amount * (3 - 2 * amount);
}

export function ServoExplode({ callouts = false }: { callouts?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const group = root?.querySelector<SVGGElement>('.parts');
    if (!root || !group) return;

    const parts = [...group.querySelectorAll<SVGGElement>('[data-part]')].map((element) => ({
      element,
      key: Number(element.dataset.key),
      depth: Number(element.dataset.depth),
      move: element.dataset.move!.split(',').map(Number) as [number, number],
      bounds: element.dataset.bounds!.split(',').map(Number),
    }));
    const paint = (amount: number) => {
      for (const part of parts) translatePart(part.element, part.move, amount);
      // Interleaved rings and bearings must follow depth in the current pose.
      const order = [...parts].sort((a, b) => a.key + a.depth * amount - b.key - b.depth * amount);
      for (let index = 0; index < order.length; index++) {
        if (group.children[index] !== order[index].element) group.insertBefore(order[index].element, group.children[index]);
      }
      const left = Math.min(...parts.map((part) => part.bounds[0] + part.move[0] * amount));
      const top = Math.min(...parts.map((part) => part.bounds[1] + part.move[1] * amount));
      const right = Math.max(...parts.map((part) => part.bounds[2] + part.move[0] * amount));
      const bottom = Math.max(...parts.map((part) => part.bounds[3] + part.move[1] * amount));
      const zoom = Math.min(1.65 - 0.65 * ease(amount), 500 / (right - left), 445 / (bottom - top));
      group.setAttribute('transform', `translate(300 260) scale(${zoom}) translate(${-(left + right) / 2} ${-(top + bottom) / 2})`);
      root.dataset.progress = amount.toFixed(4);
    };

    return animateIllustration(root, [{ delay: 0, duration: 1.4, paint }], { intro: 0.4, ease, loopOnHover: true });
  }, [callouts]);

  return <div ref={ref} data-anatomy="servo" data-callouts={callouts ? 'true' : 'false'} data-progress="0.0000" className="pointer-events-auto absolute inset-0 overflow-hidden bg-transparent" aria-hidden="true" dangerouslySetInnerHTML={{ __html: callouts ? SERVO_HERO_SVG : SERVO_CARD_SVG }} />;
}
