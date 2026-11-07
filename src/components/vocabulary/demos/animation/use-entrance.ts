'use client';
import { useCallback, useState, useSyncExternalStore } from 'react';
import type { AnimationTermId } from '@/lib/vocabulary/animation';

export const directions = ['left', 'right', 'top', 'bottom'] as const;
export type Direction = typeof directions[number];
export type EntrancePlayback = { run: number; visible: boolean; playing: boolean; direction: Direction; slow: boolean };
const motionPreference = '(prefers-reduced-motion: reduce)';

export function useEntrance(id: AnimationTermId) {
  const [playback, setPlayback] = useState<EntrancePlayback>({ run: 0, visible: true, playing: false, direction: 'left', slow: false });
  const [slow, setSlow] = useState(false);
  const [direction, setDirection] = useState<Direction>('left');
  const toggles = id === 'fade' || id === 'enter-exit';
  const subscribe = useCallback((notify: () => void) => {
    const preference = window.matchMedia(motionPreference);
    const change = () => {
      if (preference.matches) setPlayback(current => current.playing ? { ...current, playing: false } : current);
      notify();
    };
    preference.addEventListener('change', change);
    return () => {
      preference.removeEventListener('change', change);
    };
  }, []);
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(motionPreference).matches, () => false);
  const complete = useCallback(() => {
    setPlayback(current => current.run === playback.run && current.playing ? { ...current, playing: false } : current);
  }, [playback.run]);

  function play(show = true) {
    setPlayback(current => ({ run: current.run + 1, visible: show, playing: !reduced, direction, slow }));
  }

  const phase = playback.playing && !reduced ? (playback.visible ? 'entering' : 'exiting') : (playback.visible ? 'visible' : 'hidden');
  return { playback, phase, reduced, slow, setSlow, direction, setDirection, toggles, play, complete };
}
