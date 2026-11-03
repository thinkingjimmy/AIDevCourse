'use client';

import { useEffect, useRef } from 'react';
import { animateIllustration, translatePart, type AnimationChannel } from './animation';
import { ROCKET_CARD_SVG, ROCKET_EXPLODE_SVG } from './rocket-explode-markup';

const INTRO = 0.5;
const STAG = 0.08;
const PART_DURATION = 0.85;

// All assemblies lift straight up. Nozzle (bottom) stays put; gimbal (top) rises most.
const ROCKET_UP: readonly [number, number] = [0, -1.2539];
const ORDER = ['nozzle', 'chamber', 'ftp', 'gimbal'] as const;
const LIFT: Record<(typeof ORDER)[number], number> = {
  nozzle:   0,   // bottom — stays fixed
  chamber:  40,  // rises a little
  ftp:      70,  // rises more (turbopump side assembly)
  gimbal:  100,  // top — rises most
};

function ease(amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  return 1 - (1 - t) ** 3;
}

export function RocketExplode({ callouts = false }: { callouts?: boolean }) {
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
        paint: (amount) => translatePart(el, [ROCKET_UP[0] * LIFT[name], ROCKET_UP[1] * LIFT[name]], amount),
      });
    });

    return animateIllustration(root, channels, { intro: INTRO, ease, loopOnHover: true });
  }, [callouts]);

  return (
    <div
      ref={ref}
      data-anatomy="rocket"
      data-callouts={callouts ? 'true' : 'false'}
      className="pointer-events-auto absolute inset-0 bg-transparent"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: callouts ? ROCKET_EXPLODE_SVG : ROCKET_CARD_SVG }}
    />
  );
}
