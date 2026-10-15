/**
 * [INPUT]: Static exploded-Mac SVG markup and the scheme-A frameAt motion.
 * [OUTPUT]: Decorative hero loop. Transforms are written on the SVG, not through React state.
 * [POS]: Homepage right column, in the slot the static Mac image used to fill.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';

import { useEffect, useRef } from 'react';
import { MAC_EXPLODE_SVG } from './mac-explode-markup';
import styles from './mac-explode.module.css';

const PERIOD = 6.4;
const STAG = 0.07;
const ORDER = ['kb', 'top', 'front', 'right', 'back', 'left', 'crt', 'guts'] as const;
const OPEN = 0.9 + STAG * ORDER.length;
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

/** 0 assembled, 1 apart. Opens after 0.9s, holds, then closes over the rest of the 6.4s loop. */
function share(time: number, delay: number, length = 0.9) {
  const closeAt = PERIOD / 2 + 0.5;
  if (time < closeAt) return ease((time - 0.9 - delay) / length);
  return 1 - ease((time - closeAt - (OPEN - length - delay)) / length);
}

function writeMove(el: Element, vector: [number, number], amount: number) {
  if (amount <= 0.0005) {
    el.removeAttribute('transform');
    return;
  }
  el.setAttribute('transform', `translate(${(vector[0] * amount).toFixed(2)} ${(vector[1] * amount).toFixed(2)})`);
}

export function MacExplode() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const svg = root?.querySelector('svg');
    if (!root || !svg) return;

    const parts = ORDER.map((name) => ({ el: svg.querySelector(`[data-asm="${name}"]`), vector: project(...MOVE[name]) }));
    const keys = [...svg.querySelectorAll<SVGGElement>('[data-key]')].map((el) => ({
      el,
      delay: 0.05 + (4 - Number(el.dataset.row)) * 0.04 + Number(el.dataset.col) * 0.006,
    }));
    const keyLift = project(0, 0, 16);
    const cable = svg.querySelector<SVGElement>('[data-asm="cable"]');

    const frameAt = (seconds: number) => {
      const time = ((seconds % PERIOD) + PERIOD) % PERIOD;
      for (const [index, part] of parts.entries()) {
        if (part.el) writeMove(part.el, part.vector, share(time, index * STAG));
      }
      for (const key of keys) writeMove(key.el, keyLift, share(time, key.delay, 0.8));
      if (cable) cable.style.opacity = (1 - share(time, 0, 0.25)).toFixed(2);
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let elapsed = 0;
    let last = 0;
    let visible = false;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };
    const tick = (now: number) => {
      if (!last) last = now;
      elapsed += now - last;
      last = now;
      frameAt(elapsed / 1000);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (reduce.matches) {
        stop();
        frameAt(0);
        return;
      }
      if (!visible) {
        stop();
        return;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    frameAt(0);
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    observer.observe(root);
    reduce.addEventListener('change', sync);
    return () => {
      stop();
      observer.disconnect();
      reduce.removeEventListener('change', sync);
    };
  }, []);

  return <div ref={ref} className={styles.stage} aria-hidden="true" dangerouslySetInnerHTML={{ __html: MAC_EXPLODE_SVG }} />;
}
