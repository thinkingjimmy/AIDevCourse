/**
 * [INPUT]: Static exploded-chip SVG, the shared animation driver, and the iso-kit lift (up axis, per-layer distance, stagger).
 * [OUTPUT]: Decorative chip figure with optional callouts that loops assembly and explosion while hovered and returns to the exploded pose on pointer leave.
 * [POS]: Course hero right column and cropped catalog artwork without callouts; both use the shared animation driver.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';

import { useEffect, useRef } from 'react';
import { animateIllustration, translatePart, type AnimationChannel } from './animation';
import { CHIP_CARD_SVG, CHIP_EXPLODE_SVG, CHIP_UP } from './chip-explode-markup';

const INTRO = 0.4;
const STAG = 0.07;
const PART_DURATION = 0.9;
const ORDER = ['fan', 'lid', 'die', 'sub', 'socket'] as const;
const LIFT: Record<(typeof ORDER)[number], number> = { fan: 150, lid: 112, die: 80, sub: 52, socket: 24 };

function ease(amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  return 1 - (1 - t) ** 3;
}

export function ChipExplode({ callouts = true }: { callouts?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const svg = root?.querySelector('svg');
    if (!root || !svg) return;

    const channels: AnimationChannel[] = [];
    ORDER.forEach((name, index) => {
      const el = svg.querySelector(`[data-asm="${name}"]`);
      if (!el) return;
      channels.push({
        delay: index * STAG,
        duration: PART_DURATION,
        paint: (amount) => translatePart(el, [CHIP_UP[0] * LIFT[name], CHIP_UP[1] * LIFT[name]], amount),
      });
    });

    return animateIllustration(root, channels, { intro: INTRO, ease, loopOnHover: true });
  }, []);

  return <div ref={ref} data-anatomy="chip" data-callouts={callouts ? 'true' : 'false'} className="pointer-events-auto absolute inset-0 bg-transparent" aria-hidden="true" dangerouslySetInnerHTML={{ __html: callouts ? CHIP_EXPLODE_SVG : CHIP_CARD_SVG }} />;
}
