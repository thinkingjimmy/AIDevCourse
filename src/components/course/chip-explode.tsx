/**
 * [INPUT]: Static exploded-chip SVG and the iso-kit lift (up axis, per-layer distance, stagger).
 * [OUTPUT]: Decorative course figure that opens once and stays open. Callouts appear after the last layer settles. Hover eases it shut from the current pose and hides the callouts first.
 * [POS]: Course hero right column. The slot is the fully exploded bounds.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';

import { useEffect, useRef } from 'react';
import { CHIP_EXPLODE_SVG, CHIP_UP } from './chip-explode-markup';
import styles from './chip-explode.module.css';

const INTRO = 0.4;
const STAG = 0.07;
const PART_DURATION = 0.9;
const ORDER = ['fan', 'lid', 'die', 'sub', 'socket'] as const;
const LIFT: Record<(typeof ORDER)[number], number> = { fan: 150, lid: 112, die: 80, sub: 52, socket: 24 };

function ease(amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  return 1 - (1 - t) ** 3;
}

function writeMove(el: Element, lift: number, amount: number) {
  if (amount <= 0.0005) {
    el.removeAttribute('transform');
    return;
  }
  const y = CHIP_UP[1] * lift * amount;
  el.setAttribute('transform', `translate(${(CHIP_UP[0] * lift * amount).toFixed(2)} ${y.toFixed(2)})`);
}

export function ChipExplode() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const svg = root?.querySelector('svg');
    if (!root || !svg) return;

    type Channel = { delay: number; duration: number; u: number; delayLeft: number; paint: (amount: number) => void };
    const channels: Channel[] = [];
    ORDER.forEach((name, index) => {
      const el = svg.querySelector(`[data-asm="${name}"]`);
      if (!el) return;
      channels.push({
        delay: index * STAG,
        duration: PART_DURATION,
        u: 0,
        delayLeft: 0,
        paint: (amount) => writeMove(el, LIFT[name], amount),
      });
    });

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
    const showCallouts = (on: boolean) => root.classList.toggle(styles.settled, on);
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
      if (aim === 1 && settled()) showCallouts(true);
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
      if (next === 0) showCallouts(false);
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
      showCallouts(true);
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

  return <div ref={ref} className={styles.stage} aria-hidden="true" dangerouslySetInnerHTML={{ __html: CHIP_EXPLODE_SVG }} />;
}
