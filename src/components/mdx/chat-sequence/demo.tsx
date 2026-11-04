'use client';

import { useRef, type CSSProperties } from 'react';
import { UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { ChatsIcon } from '@phosphor-icons/react/dist/ssr/Chats';
import { HardDrivesIcon } from '@phosphor-icons/react/dist/ssr/HardDrives';
import { CpuIcon } from '@phosphor-icons/react/dist/ssr/Cpu';
import { Button } from '@/components/ui/button';
import { attempts, firstAttemptLength, playbackEvents } from './model';
import { MessageBubble } from './message-bubble';
import { useMessagePlayback } from './use-playback';
import { useSequenceLayout } from './use-sequence-layout';

const actors = [{ Icon: UserCircleIcon, label: '用户' }, { Icon: ChatsIcon, label: 'Chat 产品' }, { Icon: HardDrivesIcon, label: '厂商服务器' }, { Icon: CpuIcon, label: '模型程序' }];
const controlClass = 'min-h-11 cursor-pointer touch-manipulation rounded-sm px-3.5 py-2 text-caption whitespace-normal';

export function ChatMessageSequence() {
  const frameRef = useRef<HTMLElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const playback = useMessagePlayback(frameRef);
  const attempt = playback.index < firstAttemptLength ? 0 : 1;
  const step = playback.index - (attempt ? firstAttemptLength : 0);
  const event = playbackEvents[playback.index];
  const position = useSequenceLayout(sequenceRef, playback.index);

  return <figure ref={frameRef} aria-label="Chat 消息传递的自动时序演示" lang="zh-CN" data-chat-sequence data-attempt={attempt} data-step={step} data-paused={playback.paused} data-finished={playback.finished}
    className="quote-frame not-prose @container/sequence my-8 p-4 text-sm leading-body text-foreground sm:p-5">
    <div className="[@media(scripting:none)]:hidden">
      <div ref={sequenceRef} role="group" aria-label="用户、产品、厂商服务器和模型程序之间的消息时序" className="relative isolate grid grid-cols-4">
        {actors.map(({ Icon, label }, index) => <div key={label} data-sequence-actor className={`flex min-w-0 flex-col items-center gap-1.5 pb-3.5 text-center text-xs ${index === 3 && (attempt === 0 || step < 2) ? 'text-muted-foreground' : ''}`}>
          <Icon size={18} aria-hidden /><span>{label}</span><span data-model-state={index === 3 ? '' : undefined} className="min-h-9 text-diagram-label leading-copy">{index === 3 ? attempt === 0 ? '未调用' : step < 2 ? '等待调用' : step === 2 ? '运行中' : '已生成回复' : ''}</span>
        </div>)}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-20 -z-1 grid grid-cols-4">{actors.map(({ label }) => <div key={label} className="relative before:absolute before:inset-y-0 before:left-1/2 before:border-l before:border-border" />)}</div>
        {Array.from({ length: 6 }, (_, index) => {
          const item = attempts[attempt][index];
          const current = index === step;
          return <div key={`${attempt}-${index}`} className="col-span-4 grid min-h-12.5 grid-cols-4 @max-[480px]/sequence:min-h-16">
            {item && <div data-sequence-event={index} data-current={current} data-reached={index <= step} data-format={item.format} data-error={item.error}
              style={{ gridColumn: `${Math.min(item.from, item.to) + 1} / ${Math.max(item.from, item.to) + 2}` }}
              className={`mx-[25%] flex min-w-0 flex-col items-center justify-center text-center text-xs ${index > step ? 'invisible' : ''} ${item.error || item.format === 'invalid' ? 'text-red-800' : item.format === 'valid' ? 'text-green-800' : current ? 'text-foreground' : 'text-muted-foreground'}`}>
              <span className={`w-max max-w-[200%] bg-background px-1 ${current && position?.side === 'above' ? 'invisible' : ''}`}>{item.label}</span>
              <svg data-sequence-arrow data-direction={item.to > item.from ? 'right' : 'left'} aria-hidden focusable="false" className="h-3 w-full overflow-visible"><line x1="0" x2="100%" y1="6" y2="6" stroke="currentColor" strokeWidth={1.25} /><path fill="none" stroke="currentColor" strokeWidth={1.25} /></svg>
            </div>}
          </div>;
        })}
        <MessageBubble event={event} data-message-bubble data-side={position?.side} role="status" aria-live="polite" aria-atomic="true"
          style={{ left: position?.left ?? 0, top: position?.top ?? 0, '--tail-x': `${position?.tail ?? 0}px` } as CSSProperties}
          className={`group absolute z-10 w-[min(calc(100%-16px),18rem)] ${position ? '' : 'invisible'}`}>
          <span aria-hidden data-bubble-tail className="pointer-events-none absolute -bottom-1.5 left-(--tail-x) size-2.5 rotate-45 border-b border-r border-(--bubble-border) bg-(--bubble-fill) group-data-[side=below]:-top-1.5 group-data-[side=below]:bottom-auto group-data-[side=below]:rotate-225" />
        </MessageBubble>
      </div>
      <div className="mt-4.5 flex flex-wrap items-center justify-between gap-3">
        <span data-play-state className="text-xs text-muted-foreground">{playback.finished ? '演示完成' : playback.paused ? '已暂停' : '自动演示中'}</span>
        <div className="flex gap-2"><Button variant="action-outline" className={controlClass} onClick={playback.replay}>重新演示</Button><Button variant="action" className={controlClass} onClick={playback.toggle}>{playback.finished ? '再次播放' : playback.paused ? '继续' : '暂停'}</Button></div>
      </div>
    </div>
    <noscript><div className="space-y-6">{attempts.map((events, index) => <div key={index}><h3 className="mb-3 text-sm font-medium">{index ? '按约定格式发送，成功返回回复' : '格式不符，服务器拒绝请求'}</h3><ol className="space-y-3">{events.map((item) => <li key={item.label}><MessageBubble event={item} /></li>)}</ol></div>)}</div></noscript>
  </figure>;
}
