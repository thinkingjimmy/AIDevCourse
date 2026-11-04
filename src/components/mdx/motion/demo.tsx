'use client';

import { PauseIcon } from '@phosphor-icons/react/dist/ssr/Pause';
import { PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { Button } from '@/components/ui/button';
import { animationExamples, type AnimationType } from './model';
import { MotionScene } from './scenes';
import { useAnimationPlayback } from './use-playback';
import styles from './motion.module.css';

export function AnimationDemo({ type }: { type: AnimationType }) {
  const { name, timing, duration, hint } = animationExamples[type];
  const { root, ready, state, run, play, resume, pause } = useAnimationPlayback(type);
  const looping = duration === null;
  const action = state === 'paused' ? '继续播放' : looping && state === 'playing' ? '暂停' : state === 'idle' ? '播放动效' : '重新播放';
  const Icon = state === 'paused' || state === 'idle' ? PlayIcon : looping && state === 'playing' ? PauseIcon : ArrowCounterClockwiseIcon;
  const activate = state === 'paused' ? resume : looping && state === 'playing' ? pause : play;

  return <figure ref={root} aria-label={`${name} 动效案例`} lang="zh-CN" data-animation-demo={type} data-ready={ready} data-state={state} data-active={run > 0}
    className={`${styles.demo} quote-frame not-prose relative my-8 px-4 pt-7 pb-4 text-foreground sm:px-5`}>
    <figcaption className="absolute start-2.5 top-0 -translate-y-1/2 bg-background px-1.5 text-sm leading-copy font-medium sm:start-3.5">试一试 · {name}</figcaption>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-caption leading-body">
      <span className="text-reading">{hint}</span><span className="text-muted-foreground tabular-nums">{timing}</span>
    </div>
    <div key={run} className={`${styles.stage} flex min-h-48 min-w-0 items-center justify-center overflow-hidden rounded-sm bg-surface px-4 py-5 sm:min-h-52`}>
      <MotionScene type={type} />
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 [@media(scripting:none)]:hidden">
      <Button variant="action-outline" size="action" className="min-w-30 rounded-sm motion-reduce:hidden" disabled={!ready} onClick={activate}>
        <Icon size={16} aria-hidden />{action}
      </Button>
      {state === 'paused' && !looping && <Button variant="plain" size="action" onClick={play} className="rounded-sm text-muted-foreground motion-reduce:hidden">重新播放</Button>}
      <span className="text-caption text-muted-foreground motion-reduce:hidden">{state === 'paused' ? '已暂停，可从当前位置继续。' : looping ? '循环演示，可随时暂停。' : '单次演示，可重复播放。'}</span>
    </div>
    <p className="mt-3 hidden text-caption leading-body text-reading motion-reduce:block">已开启减少动态效果，显示静态结果。</p>
    <p className="mt-3 hidden text-caption leading-body text-reading [@media(scripting:none)]:block">这是静态预览。启用 JavaScript 后可播放动效。</p>
    <p role="status" className="sr-only">{state === 'playing' ? `${name} 演示播放中。` : state === 'paused' ? `${name} 演示已暂停。` : state === 'complete' ? `${name} 演示完成。` : ''}</p>
  </figure>;
}
