'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { animationExamples, frameText, type AnimationType } from './model';

const subscribeToHydration = () => () => {};
type PlaybackState = 'idle' | 'playing' | 'paused' | 'complete';

export function useAnimationPlayback(type: AnimationType) {
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const root = useRef<HTMLElement>(null);
  const elapsed = useRef(0);
  const [state, setState] = useState<PlaybackState>('idle');
  const [run, setRun] = useState(0);
  const { duration } = animationExamples[type];

  function showResult() {
    elapsed.current = duration ?? 0;
    const value = root.current?.querySelector('[data-motion-value]');
    if (value) value.textContent = frameText(type, elapsed.current);
    setRun(0);
    setState('complete');
  }

  function play() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showResult();
      return;
    }
    elapsed.current = 0;
    setRun((value) => value + 1);
    setState('playing');
  }

  function resume() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) showResult();
    else setState('playing');
  }

  useEffect(() => {
    const pause = () => setState((current) => current === 'playing' ? 'paused' : current);
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pause(); });
    observer.observe(root.current!);
    const visibility = () => { if (document.hidden) pause(); };
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => {
      if (!preference.matches) return;
      elapsed.current = duration ?? 0;
      const value = root.current?.querySelector('[data-motion-value]');
      if (value) value.textContent = frameText(type, elapsed.current);
      setRun(0);
      setState('complete');
    };
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', reduce);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', reduce);
    };
  }, [duration, type]);

  useEffect(() => {
    if (state !== 'playing' || duration === null) return;
    let frame: number;
    let previous: number | undefined;
    const value = root.current?.querySelector('[data-motion-value]');
    if (value) value.textContent = frameText(type, elapsed.current);
    function tick(timestamp: number) {
      previous ??= timestamp;
      elapsed.current = Math.min(duration!, elapsed.current + timestamp - previous);
      previous = timestamp;
      if (value) value.textContent = frameText(type, elapsed.current);
      if (elapsed.current === duration) setState('complete');
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, run, state, type]);

  return { root, ready, state, run, play, resume, pause: () => setState('paused') };
}
