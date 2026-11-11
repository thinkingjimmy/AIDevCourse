'use client';

import { useRef, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { htmlLanguages, isLocale } from '@/lib/i18n/config';
import { UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { ChatsIcon } from '@phosphor-icons/react/dist/ssr/Chats';
import { HardDrivesIcon } from '@phosphor-icons/react/dist/ssr/HardDrives';
import { CpuIcon } from '@phosphor-icons/react/dist/ssr/Cpu';
import { Button } from '@/components/ui/button';
import { attempts, firstAttemptLength, playbackEvents } from './model';
import { MessageBubble } from './message-bubble';
import { useMessagePlayback } from './use-playback';
import { useSequenceLayout } from './use-sequence-layout';

const actors = [{ Icon: UserCircleIcon, key: 'user' }, { Icon: ChatsIcon, key: 'product' }, { Icon: HardDrivesIcon, key: 'server' }, { Icon: CpuIcon, key: 'model' }];
const controlClass = 'h-auto min-h-11 cursor-pointer touch-manipulation rounded-sm px-3.5 py-2 text-caption whitespace-normal';

function StableLabel({ value, alternatives }: { value: string; alternatives: string[] }) {
  // Reserve space for every translated state without exposing inactive labels.
  return <span className="grid min-w-0">
    {alternatives.map((text) => <span key={text} aria-hidden className="invisible col-start-1 row-start-1">{text}</span>)}
    <span className="col-start-1 row-start-1">{value}</span>
  </span>;
}

export function ChatMessageSequence() {
  const t = useTranslations('ChatSequence');
  const locale = useLocale();
  const frameRef = useRef<HTMLElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const playback = useMessagePlayback(frameRef);
  const attempt = playback.index < firstAttemptLength ? 0 : 1;
  const step = playback.index - (attempt ? firstAttemptLength : 0);
  const event = playbackEvents[playback.index];
  const position = useSequenceLayout(sequenceRef, playback.index);

  return <figure ref={frameRef} aria-label={t('label')} lang={htmlLanguages[isLocale(locale) ? locale : 'en']} data-chat-sequence data-attempt={attempt} data-step={step} data-paused={playback.paused} data-finished={playback.finished}
    className="quote-frame not-prose @container/sequence my-8 p-4 text-sm leading-body text-foreground sm:p-5">
    <div className="[@media(scripting:none)]:hidden">
      <div ref={sequenceRef} role="group" aria-label={t('actorsLabel')} className="relative isolate grid grid-cols-4 @max-[20rem]/sequence:pb-32">
        {actors.map(({ Icon, key }, index) => <div key={key} data-sequence-actor className={`flex min-w-0 flex-col items-center gap-1.5 pb-3.5 text-center text-xs [overflow-wrap:anywhere] ${index === 3 && (attempt === 0 || step < 2) ? 'text-muted-foreground' : ''}`}>
          <Icon size={18} aria-hidden /><span>{t(`actors.${key}`)}</span>
          <span className="grid min-h-9 text-diagram-label leading-copy">{index === 3 && <>
            {['idle', 'waiting', 'running', 'generated'].map((state) => <span key={state} aria-hidden className="invisible col-start-1 row-start-1">{t(`modelStates.${state}`)}</span>)}
            <span data-model-state className="col-start-1 row-start-1">{t(attempt === 0 ? 'modelStates.idle' : step < 2 ? 'modelStates.waiting' : step === 2 ? 'modelStates.running' : 'modelStates.generated')}</span>
          </>}</span>
        </div>)}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-20 -z-1 grid grid-cols-4">{actors.map(({ key }) => <div key={key} className="relative before:absolute before:inset-y-0 before:left-1/2 before:border-l before:border-border" />)}</div>
        {Array.from({ length: 6 }, (_, index) => {
          const item = attempts[attempt][index];
          const current = index === step;
          return <div key={`${attempt}-${index}`} className="col-span-4 grid min-h-12.5 grid-cols-4 @max-[480px]/sequence:min-h-16">
            {attempts.map((events, attemptIndex) => events[index] && <div key={attemptIndex} aria-hidden
              style={{ gridColumn: `${Math.min(events[index].from, events[index].to) + 1} / ${Math.max(events[index].from, events[index].to) + 2}`, gridRow: 1 }}
              className="invisible mx-[25%] flex min-w-0 flex-col items-center justify-center text-center text-xs">
              <span className="w-max max-w-[200%] px-1 [overflow-wrap:anywhere]">{t(`events.${events[index].key}.label`)}</span><span className="h-3 w-full" />
            </div>)}
            {item && <div data-sequence-event={index} data-current={current} data-reached={index <= step} data-format={item.format} data-error={item.error}
              style={{ gridColumn: `${Math.min(item.from, item.to) + 1} / ${Math.max(item.from, item.to) + 2}`, gridRow: 1 }}
              className={`mx-[25%] flex min-w-0 flex-col items-center justify-center text-center text-xs ${index > step ? 'invisible' : ''} ${item.error || item.format === 'invalid' ? 'text-red-800' : item.format === 'valid' ? 'text-green-800' : current ? 'text-foreground' : 'text-muted-foreground'}`}>
              <span className={`w-max max-w-[200%] bg-background px-1 [overflow-wrap:anywhere] ${current && position?.side === 'above' ? 'invisible' : ''}`}>{t(`events.${item.key}.label`)}</span>
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
      <div data-sequence-controls className="mt-4.5 flex flex-wrap items-center justify-between gap-3">
        <span data-play-state className="text-xs text-muted-foreground"><StableLabel value={t(playback.finished ? 'playStates.finished' : playback.paused ? 'playStates.paused' : 'playStates.playing')} alternatives={['finished', 'paused', 'playing'].map((state) => t(`playStates.${state}`))} /></span>
        <div className="flex flex-wrap gap-2"><Button variant="action-outline" className={controlClass} onClick={playback.replay}>{t('replay')}</Button><Button variant="action" className={controlClass} onClick={playback.toggle}><StableLabel value={t(playback.finished ? 'playAgain' : playback.paused ? 'resume' : 'pause')} alternatives={['playAgain', 'resume', 'pause'].map((action) => t(action))} /></Button></div>
      </div>
    </div>
    <noscript><div className="space-y-6">{attempts.map((events, index) => <div key={index}><h3 className="mb-3 text-sm font-medium">{t(index ? 'validAttempt' : 'invalidAttempt')}</h3><ol className="space-y-3">{events.map((item) => <li key={item.key}><MessageBubble event={item} /></li>)}</ol></div>)}</div></noscript>
  </figure>;
}
