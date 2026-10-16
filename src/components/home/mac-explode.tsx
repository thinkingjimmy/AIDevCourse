/**
 * [INPUT]: Static exploded-Mac SVG markup, shared illustration paint, and the scheme-A stagger.
 * [OUTPUT]: Decorative hero that opens once and stays open. Hover eases it back together from the current pose.
 * [POS]: Homepage right column. The slot is the fully exploded bounds.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';

import { useEffect, useRef } from 'react';
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

    type Channel = { delay: number; duration: number; u: number; delayLeft: number; paint: (amount: number) => void };
    const channels: Channel[] = [];
    const add = (delay: number, duration: number, paint: (amount: number) => void) => {
      channels.push({ delay, duration, u: 0, delayLeft: 0, paint });
    };
    ORDER.forEach((name, index) => {
      const el = svg.querySelector(`[data-asm="${name}"]`);
      const vector = project(...MOVE[name]);
      if (el) add(index * STAG, PART_DURATION, (amount) => writeMove(el, vector, amount));
    });
    const keyLift = project(0, 0, 16);
    for (const el of svg.querySelectorAll<SVGGElement>('[data-key]')) {
      const delay = 0.05 + (4 - Number(el.dataset.row)) * 0.04 + Number(el.dataset.col) * 0.006;
      add(delay, 0.8, (amount) => writeMove(el, keyLift, amount));
    }
    const cable = svg.querySelector<SVGElement>('[data-asm="cable"]');
    if (cable) add(0, 0.25, (amount) => { cable.style.opacity = (1 - amount).toFixed(2); });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = 0;
    let visible = false;
    let aim: 0 | 1 = 1;
    let intro = INTRO;

    const paint = () => {
      for (const channel of channels) channel.paint(ease(channel.u));
    };
    const settled = () => intro <= 0 && channels.every((channel) => channel.delayLeft <= 0 && channel.u === aim);
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };
    const step = (dt: number) => {
      if (intro > 0 && aim === 1) {
        intro -= dt;
        if (intro > 0) return;
        dt = -intro;
        intro = 0;
        for (const channel of channels) channel.delayLeft = channel.delay;
      }
      for (const channel of channels) {
        let slice = dt;
        if (channel.delayLeft > 0) {
          channel.delayLeft -= slice;
          if (channel.delayLeft > 0) continue;
          slice = -channel.delayLeft;
          channel.delayLeft = 0;
        }
        if (channel.u === aim || slice <= 0) continue;
        const delta = slice / channel.duration;
        channel.u = aim > channel.u ? Math.min(aim, channel.u + delta) : Math.max(aim, channel.u - delta);
      }
      paint();
    };
    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      if (settled()) {
        frame = 0;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (frame || reduce.matches || !visible || settled()) return;
      frame = requestAnimationFrame(tick);
    };
    const retarget = (next: 0 | 1) => {
      if (reduce.matches || aim === next) return;
      aim = next;
      intro = 0;
      for (const channel of channels) channel.delayLeft = channel.delay;
      kick();
    };
    const holdExploded = () => {
      stop();
      intro = 0;
      aim = 1;
      for (const channel of channels) {
        channel.u = 1;
        channel.delayLeft = 0;
      }
      paint();
    };
    const sync = () => {
      if (reduce.matches) {
        holdExploded();
        return;
      }
      if (!visible) {
        stop();
        return;
      }
      kick();
    };

    if (reduce.matches) holdExploded();
    else paint();
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      retarget(0);
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      retarget(1);
    };
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
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
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <div ref={ref} data-anatomy="mac" className="pointer-events-auto absolute -top-[13.049%] -left-[28.583%] aspect-[720/620] w-[159.978%] bg-transparent" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MAC_EXPLODE_SVG }} />;
}
