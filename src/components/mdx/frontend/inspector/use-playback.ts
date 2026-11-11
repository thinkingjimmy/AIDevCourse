'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { duration, posterTime } from './model';

const subscribeToHydration = () => () => {};
const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribeToMotion = (notify: () => void) => {
  const preference = window.matchMedia(motionQuery);
  preference.addEventListener('change', notify);
  return () => preference.removeEventListener('change', notify);
};

export function useInspectorPlayback(root: RefObject<HTMLDivElement | null>) {
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const elapsed = useRef(0);
  const started = useRef(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showOpening, setShowOpening] = useState(false);
  const reduced = useSyncExternalStore(subscribeToMotion, () => window.matchMedia(motionQuery).matches, () => false);

  useEffect(() => {
    const preference = window.matchMedia(motionQuery);
    const updatePreference = () => {
      if (preference.matches) {
        setPlaying(false);
        elapsed.current = posterTime;
        setTime(posterTime);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPlaying(false);
      else if (entry.intersectionRatio >= 0.5 && !started.current && !document.hidden && !preference.matches) {
        started.current = true;
        setPlaying(true);
      }
    }, { threshold: [0, 0.5] });
    observer.observe(root.current!);
    const visibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', updatePreference);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', updatePreference);
    };
  }, [root]);

  useEffect(() => {
    if (!playing || reduced) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      elapsed.current = Math.min(duration, elapsed.current + now - previous);
      previous = now;
      setTime(elapsed.current);
      if (elapsed.current === duration) setPlaying(false);
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, reduced]);

  function seek(value: number) {
    started.current = true;
    elapsed.current = value;
    setTime(value);
    setPlaying(false);
  }

  function toggle() {
    started.current = true;
    if (reduced) {
      seek(posterTime);
      return;
    }
    if (elapsed.current >= duration) {
      elapsed.current = 0;
      setTime(0);
    }
    setPlaying((current) => !current);
  }

  function replay() {
    setShowOpening(true);
    seek(0);
    if (!reduced) setPlaying(true);
  }

  return { ready, time: reduced && time === 0 && !showOpening ? posterTime : time, playing, reduced, toggle, replay };
}
