'use client';

import { useId, useRef } from 'react';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { PauseIcon } from '@phosphor-icons/react/dist/ssr/Pause';
import { PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { Button } from '@/components/ui/button';
import { duration, frameAt, posterTime } from './inspector/model';
import { InspectorScene } from './inspector/scene';
import { useInspectorPlayback } from './inspector/use-playback';

export function FrontendInspectorDemo() {
  const captionId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const playback = useInspectorPlayback(frame);
  const current = frameAt(playback.time);
  const [beforeKey, afterKey] = current.caption.split('Enter');
  const finished = playback.time >= duration;
  const action = playback.reduced ? '查看修改结果' : playback.playing ? '暂停演示' : finished ? '重新播放' : playback.time > 0 ? '继续播放' : '播放演示';
  const replayAction = playback.reduced ? '查看初始状态' : '从头播放';
  const controlClass = 'size-11 rounded-sm text-muted-foreground hover:bg-surface hover:text-foreground';

  return <figure data-frontend-inspector aria-labelledby={captionId} lang="zh-CN" className="not-prose my-8 overflow-hidden rounded-sm border border-border bg-background text-foreground">
    <figcaption id={captionId} className="sr-only">浏览器检查与文字修改演示</figcaption>
    <div ref={frame} data-inspector-animation data-time={playback.time} data-playing={playback.playing} data-ready={playback.ready} data-reduced={playback.reduced}>
      <div data-inspector-screen className="relative [@media(scripting:none)]:hidden">
        <InspectorScene time={playback.time} playing={playback.playing} />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-center">
          <p role="status" aria-atomic="true" data-inspector-caption data-confirming={current.confirming} className="m-0 max-w-full rounded-sm bg-[#4a4a4a]/95 px-3 py-2 text-center text-sm font-medium leading-copy text-white">
            <span>{current.confirming ? <>{beforeKey}<kbd className="inline-flex min-h-7 items-center rounded-sm border border-white/60 bg-white/10 px-1.5 font-mono text-sm font-semibold">Enter</kbd>{afterKey}</> : current.caption}</span>
          </p>
        </div>
      </div>
      <noscript><InspectorScene time={posterTime} /><p className="sr-only">右键检查 → 点击元素选择器 → 悬停并点击标题 → Elements 双击文字 → 输入新标题 → Enter</p></noscript>
      <div data-inspector-controls className="flex justify-end gap-1 border-t border-border/50 px-2 py-1 [@media(scripting:none)]:hidden">
        <Button variant="plain" size="reset" aria-label={action} title={action} disabled={!playback.ready} onClick={playback.toggle} className={controlClass}>{playback.playing ? <PauseIcon aria-hidden size={16} /> : <PlayIcon aria-hidden size={16} />}</Button>
        <Button variant="plain" size="reset" aria-label={replayAction} title={replayAction} disabled={!playback.ready} onClick={playback.replay} className={controlClass}><ArrowCounterClockwiseIcon aria-hidden size={16} /></Button>
      </div>
    </div>
  </figure>;
}
