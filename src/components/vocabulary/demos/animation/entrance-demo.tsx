'use client';
import { useId, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { Button } from '@/components/ui/button';
import type { AnimationTermId } from '@/lib/vocabulary/animation';
import { DemoFrame } from '../controls';
import { AnimatedScene } from './animated-scene';
import { directions, useEntrance, type Direction } from './use-entrance';

const subscribeToHydration = () => () => {};

export function EntranceDemo({ id }: { id: AnimationTermId }) {
  const t = useTranslations('AnimationVocabulary');
  const controlId = useId();
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const { playback, phase, reduced, slow, setSlow, direction, setDirection, toggles, play, complete } = useEntrance(id);
  const action = id === 'fade' ? (playback.visible ? 'fadeOut' : 'fadeIn')
    : id === 'enter-exit' ? (playback.visible ? 'remove' : 'add') : 'replay';
  return <div className="entrance-demo" data-animation={id} data-phase={phase} data-ready={ready}>
    <DemoFrame note={t(`terms.${id}.note`)} controls={<>
      <div className="entrance-controls">
        {id === 'slide-in' && <span className="entrance-direction">
          <select aria-label={t('demo.direction')} value={direction}
            onChange={event => setDirection(event.target.value as Direction)}>
            {directions.map(direction => <option key={direction} value={direction}>{t(`demo.${direction}`)}</option>)}
          </select>
          <CaretDownIcon size={14} aria-hidden />
        </span>}
        <Button variant="brand-outline" className="min-h-11" aria-controls={controlId}
          onClick={() => play(toggles ? !playback.visible : true)}>
          {!toggles && <ArrowClockwiseIcon size={16} aria-hidden />}{t(`demo.${action}`)}
        </Button>
        <Button variant="ghost" className="min-h-11 min-w-11 px-2 font-mono text-caption text-muted-foreground" aria-label={t('demo.slow')}
          title={t('demo.slow')} aria-pressed={slow} onClick={() => setSlow(value => !value)}>{slow ? '0.25×' : '1×'}</Button>
      </div>
      <span className="entrance-status" role="status">{t(`demo.${phase}`)}</span>
      <span className="entrance-reduced-note">{t('demo.reducedMotion')}</span>
    </>}>
      <div className="entrance-stage" id={controlId} aria-hidden="true">
        <AnimatedScene id={id} playback={playback} reduced={reduced} slow={slow} onComplete={complete} />
      </div>
    </DemoFrame>
  </div>;
}
