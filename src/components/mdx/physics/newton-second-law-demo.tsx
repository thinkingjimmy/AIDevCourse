'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { htmlLanguages, isLocale } from '@/lib/i18n/config';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { PauseIcon } from '@phosphor-icons/react/dist/ssr/Pause';
import { PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { Button } from '@/components/ui/button';

const duration = 2;
const initialForce = 4;
const initialMass = 2;
const referenceAcceleration = initialForce / initialMass;
const subscribeToHydration = () => () => {};

function useNumberFormat() {
  const formatter = useFormatter();
  return (value: number) => formatter.number(value, { maximumFractionDigits: 2 });
}

function CartTrack({ force, mass, time, reference = false }: { force: number; mass: number; time: number; reference?: boolean }) {
  const t = useTranslations('Newton');
  const format = useNumberFormat();
  const acceleration = force / mass;
  const x = 32 + 0.5 * acceleration * time ** 2 * 26;
  const arrowEnd = x + 58 + force * 5;
  const name = reference ? 'reference' : 'current';

  return <div>
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm leading-body">
      <span className={reference ? 'text-muted-foreground' : 'font-medium'}>{t(reference ? 'reference' : 'yourSettings')}</span>
      <span className="text-reading">{t('speed')} <span data-newton-speed={name} className="tabular-nums">{format(acceleration * time)} m/s</span></span>
    </div>
    <svg viewBox="0 0 560 76" aria-hidden focusable="false" className="block h-auto w-full">
      <path d="M 32 64 H 548" className="stroke-border" />
      {[0, 4, 8, 12, 16].map((distance) => <path key={distance} d={`M ${32 + distance * 26} 64 v 4`} className="stroke-border" />)}
      <rect data-newton-cart={name} x={x} y="27" width="52" height="26" rx="2" strokeWidth="1.5" className={reference ? 'fill-background stroke-muted-foreground' : 'fill-foreground stroke-foreground'} />
      <text x={x + 26} y="45" textAnchor="middle" className={`text-sm ${reference ? 'fill-muted-foreground' : 'fill-background'}`}>{mass} kg</text>
      <g className={reference ? 'fill-muted-foreground' : 'fill-foreground'}>
        <circle cx={x + 10} cy="58" r="6" />
        <circle cx={x + 42} cy="58" r="6" />
      </g>
      {force > 0 && <path d={`M ${x + 58} 40 H ${arrowEnd} m -6 -5 6 5 -6 5`} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={reference ? 'stroke-muted-foreground' : 'stroke-foreground'} />}
    </svg>
  </div>;
}

export function NewtonSecondLawDemo() {
  const t = useTranslations('Newton');
  const locale = useLocale();
  const format = useNumberFormat();
  const formatter = useFormatter();
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [force, setForce] = useState(initialForce);
  const [mass, setMass] = useState(initialMass);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const elapsed = useRef(0);
  const root = useRef<HTMLElement>(null);
  const forceId = useId();
  const massId = useId();
  const explanationId = useId();
  const acceleration = force / mass;
  const state = playing ? 'playing' : time === duration ? 'complete' : time > 0 ? 'paused' : 'ready';
  const rounded = Number(acceleration.toFixed(2)) !== acceleration;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPlaying(false);
    });
    observer.observe(root.current!);
    const visibility = () => { if (document.hidden) setPlaying(false); };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => {
      if (reducedMotion.matches) {
        setPlaying(false);
        if (elapsed.current > 0) {
          elapsed.current = duration;
          setTime(duration);
        }
      }
    };
    document.addEventListener('visibilitychange', visibility);
    reducedMotion.addEventListener('change', reduce);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      reducedMotion.removeEventListener('change', reduce);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous: number | undefined;
    function tick(timestamp: number) {
      previous ??= timestamp;
      elapsed.current = Math.min(duration, elapsed.current + (timestamp - previous) / 1000);
      previous = timestamp;
      setTime(elapsed.current);
      if (elapsed.current === duration) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function stop() {
    setPlaying(false);
    elapsed.current = 0;
    setTime(0);
  }

  function reset() {
    stop();
    setForce(initialForce);
    setMass(initialMass);
  }

  function toggle() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elapsed.current = duration;
      setTime(duration);
      return;
    }
    if (elapsed.current === duration) {
      elapsed.current = 0;
      setTime(0);
    }
    setPlaying(true);
  }

  const action = t(playing ? 'pause' : state === 'paused' ? 'resume' : state === 'complete' ? 'playAgain' : 'start');
  const insight = force === 0
    ? t('insights.zero')
    : force === initialForce && mass === initialMass
      ? t('insights.initial')
      : force === initialForce * 2 && mass === initialMass
        ? t('insights.doubleForce')
        : force === initialForce && mass === initialMass * 2
          ? t('insights.doubleMass')
          : acceleration === referenceAcceleration
            ? t('insights.sameRatio')
            : t('insights.other', { acceleration: format(acceleration), ratio: format(acceleration / referenceAcceleration) });

  return <figure ref={root} aria-label={t('label')} lang={htmlLanguages[isLocale(locale) ? locale : 'en']} data-newton-demo data-ready={ready} data-state={state} data-time={time.toFixed(3)}
    className="quote-frame not-prose relative my-8 px-4 pt-7 pb-5 text-foreground sm:px-6 sm:pb-6">
    <figcaption className="absolute start-2.5 top-0 max-w-[calc(100%-1.25rem)] -translate-y-1/2 bg-background px-1.5 text-sm leading-copy font-medium sm:start-3.5">{t('title')}</figcaption>
    <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
      <p className="font-mono text-3xl leading-heading font-medium">F = ma</p>
      <p className="text-sm leading-body text-reading">{t('formula')}</p>
    </div>
    <p data-newton-equation className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-base leading-body" aria-label={t(rounded ? 'equationApproximate' : 'equationExact', { force, mass, acceleration: format(acceleration) })}>
      <span className="whitespace-nowrap">a = {force} N ÷ {mass} kg</span>
      <span className="inline-flex items-baseline gap-2">{rounded ? '≈' : '='}<strong data-newton-acceleration className="text-2xl font-medium tabular-nums">{format(acceleration)} m/s²</strong></span>
    </p>

    <div className="mt-5 rounded-sm bg-surface px-3 pt-3 pb-2 sm:px-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-caption leading-body text-muted-foreground">
        <span>{t('setup')}</span>
        <span aria-hidden className="tabular-nums">t = {formatter.number(time, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s</span>
      </div>
      <CartTrack force={force} mass={mass} time={time} />
      <div className="mt-3"><CartTrack force={initialForce} mass={initialMass} time={time} reference /></div>
    </div>

    <div className="mt-4 [@media(scripting:none)]:hidden">
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3 text-sm"><label htmlFor={forceId}>{t('force')}</label><span className="shrink-0 font-medium tabular-nums">{force} N</span></div>
          <input id={forceId} type="range" min="0" max="8" step="1" value={force} disabled={!ready} aria-valuetext={t('forceValue', { force })} aria-describedby={explanationId}
            onChange={(event) => { stop(); setForce(Number(event.target.value)); }} className="block h-11 w-full cursor-pointer accent-foreground" />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 text-sm"><label htmlFor={massId}>{t('mass')}</label><span className="shrink-0 font-medium tabular-nums">{mass} kg</span></div>
          <input id={massId} type="range" min="1" max="4" step="1" value={mass} disabled={!ready} aria-valuetext={t('massValue', { mass })} aria-describedby={explanationId}
            onChange={(event) => { stop(); setMass(Number(event.target.value)); }} className="block h-11 w-full cursor-pointer accent-foreground" />
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Button variant="action" size="action" className="h-auto min-h-11 min-w-31 rounded-sm whitespace-normal" onClick={toggle} disabled={!ready}>
          {playing ? <PauseIcon aria-hidden size={16} /> : <PlayIcon aria-hidden size={16} />}{action}
        </Button>
        <Button variant="plain" size="action" onClick={reset} disabled={!ready} className="h-auto min-h-11 rounded-sm text-muted-foreground whitespace-normal"><ArrowCounterClockwiseIcon aria-hidden size={16} />{t('reset')}</Button>
      </div>
    </div>

    <div id={explanationId} className="mt-4 border-t border-border pt-3 text-sm leading-body">
      <p data-newton-insight className="text-reading">{insight}</p>
      <p className="mt-2 text-caption text-muted-foreground">{t('assumptions')}</p>
    </div>
    <p role="status" aria-live="polite" className="sr-only">{t(`status.${state}`, { force, mass, acceleration: format(acceleration), speed: format(acceleration * duration) })}</p>
    <p className="mt-3 hidden text-sm leading-body text-reading [@media(scripting:none)]:block">{t('static')}</p>
  </figure>;
}
