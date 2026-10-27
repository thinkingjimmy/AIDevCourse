/**
 * [INPUT]: Static exploded-Mac SVG markup, the shared animation driver, and the scheme-A stagger.
 * [OUTPUT]: Decorative hero that opens once, loops assembly and explosion while hovered, and returns to the exploded pose on pointer leave.
 * [POS]: Homepage right column. The slot is the fully exploded bounds.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';

import { useEffect, useRef } from 'react';
import { animateIllustration, translatePart, type AnimationChannel } from './animation';
import { MAC_EXPLODE_SVG } from './mac-explode-markup';

const INTRO = 0.8;
const STAG = 0.07;
const PART_DURATION = 0.9;
const ORDER = ['kb', 'top', 'front', 'right', 'back', 'left', 'crt', 'guts'] as const;
const AXES = { up: [0, -1.22], fwd: [-0.79, 0.58], side: [1.17, 0.39] } as const;
const MOVE: Record<(typeof ORDER)[number], [number, number, number]> = {
  kb: [0, 104, 0], top: [0, 0, 74], front: [0, 50, 0], right: [60, 0, 0],
  back: [0, -56, 0], left: [-56, 0, 0], crt: [0, 0, 40], guts: [0, 0, 0],
};

function project(a: number, b: number, c: number): [number, number] {
  return [
    AXES.side[0] * a + AXES.fwd[0] * b + AXES.up[0] * c,
    AXES.side[1] * a + AXES.fwd[1] * b + AXES.up[1] * c,
  ];
}

function ease(amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

export function MacExplode() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const svg = root?.querySelector('svg');
    if (!root || !svg) return;

    const channels: AnimationChannel[] = [];
    const add = (delay: number, duration: number, paint: (amount: number) => void) => {
      channels.push({ delay, duration, paint });
    };
    ORDER.forEach((name, index) => {
      const el = svg.querySelector(`[data-asm="${name}"]`);
      const vector = project(...MOVE[name]);
      if (el) add(index * STAG, PART_DURATION, (amount) => translatePart(el, vector, amount));
    });
    const keyLift = project(0, 0, 16);
    for (const el of svg.querySelectorAll<SVGGElement>('[data-key]')) {
      const delay = 0.05 + (4 - Number(el.dataset.row)) * 0.04 + Number(el.dataset.col) * 0.006;
      add(delay, 0.8, (amount) => translatePart(el, keyLift, amount));
    }
    const cable = svg.querySelector<SVGElement>('[data-asm="cable"]');
    if (cable) add(0, 0.25, (amount) => { cable.style.opacity = (1 - amount).toFixed(2); });

    return animateIllustration(root, channels, { intro: INTRO, ease, loopOnHover: true });
  }, []);

  return <div ref={ref} data-anatomy="mac" className="pointer-events-auto absolute -top-[13.049%] -left-[28.583%] aspect-[720/620] w-[159.978%] bg-transparent" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MAC_EXPLODE_SVG }} />;
}
