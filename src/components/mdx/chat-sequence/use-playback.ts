'use client';

import { useEffect, useState, type RefObject } from 'react';
import { playbackEvents } from './model';

export function useMessagePlayback(rootRef: RefObject<HTMLElement | null>) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(rootRef.current!);
    const visibility = () => setForeground(!document.hidden);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [rootRef]);

  useEffect(() => {
    if (paused || finished || !visible || !foreground) return;
    const timer = window.setTimeout(() => {
      if (index === playbackEvents.length - 1) setFinished(true);
      else setIndex(index + 1);
    }, playbackEvents[index].duration ?? 1800);
    return () => window.clearTimeout(timer);
  }, [index, paused, finished, visible, foreground]);

  function replay() {
    setIndex(0);
    setPaused(false);
    setFinished(false);
  }

  return { index, paused, finished, replay, toggle: () => finished ? replay() : setPaused((value) => !value) };
}
