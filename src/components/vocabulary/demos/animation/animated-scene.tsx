'use client';
import { Fade } from '@animate-ui/react/primitives/effects/fade';
import { Slide } from '@animate-ui/react/primitives/effects/slide';
import { Zoom } from '@animate-ui/react/primitives/effects/zoom';
import { Effect } from '@animate-ui/react/primitives/effects/effect';
import { AnimatePresence, motion, type Transition } from 'motion/react';
import type { AnimationTermId } from '@/lib/vocabulary/animation';
import { EntranceScene } from './scene';
import type { EntrancePlayback } from './use-entrance';

export function AnimatedScene({ id, playback, reduced, slow, onComplete }: {
  id: AnimationTermId; playback: EntrancePlayback; reduced: boolean; slow: boolean; onComplete: () => void;
}) {
  const { run, visible, playing, direction } = playback;
  const scene = <EntranceScene id={id} />;
  // Teaching controls suppress even fades when reduced motion is enabled.
  if (reduced) return <div className="entrance-target" style={{ opacity: visible ? 1 : 0 }}>
    {(id !== 'enter-exit' || visible) && scene}
  </div>;

  const speed = playback.slow ? 4 : 1;
  const transition: Transition = { type: 'tween', duration: 0.28 * speed, ease: [0.22, 1, 0.36, 1] };
  const props = { className: 'entrance-target', initial: playing ? 'hidden' as const : false as const, transition, onAnimationComplete: onComplete };

  if (id === 'fade') return <Fade {...props} initial={false} animate={visible ? 'visible' : 'hidden'}
    transition={{ ...transition, duration: (visible ? 0.28 : 0.2) * speed }}>{scene}</Fade>;

  if (id === 'enter-exit') return <AnimatePresence initial={false} onExitComplete={onComplete}>
    {visible && <Effect key="notification" className="entrance-target" fade zoom={{ initialScale: 0.97 }}
      slide={{ direction: 'up', offset: 16 }} transition={transition} onAnimationComplete={onComplete}
      exit={{ opacity: 0, y: -12, scale: 0.97, transition: { ...transition, duration: 0.2 * (slow ? 4 : 1) } }}>
      {scene}
    </Effect>}
  </AnimatePresence>;

  if (id === 'slide-in') return <Slide key={run} {...props}
    direction={{ left: 'right' as const, right: 'left' as const, top: 'down' as const, bottom: 'up' as const }[direction]}
    offset={direction === 'left' || direction === 'right' ? 360 : 220}>{scene}</Slide>;

  if (id === 'scale-in') return <Effect key={run} {...props} fade zoom={{ initialScale: 0.92 }}>{scene}</Effect>;

  if (id === 'pop-in') return <Zoom key={run} {...props} initialScale={0.92}
    transition={{ type: 'spring', duration: 0.28 * speed, bounce: 0.3 }}>{scene}</Zoom>;

  return <motion.div key={run} {...props} animate="visible" variants={{
    hidden: { clipPath: 'inset(0 100% 0 0)' }, visible: { clipPath: 'inset(0 0% 0 0)' },
  }}>{scene}</motion.div>;
}
