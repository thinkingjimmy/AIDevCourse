import { Children, isValidElement, type ComponentProps } from 'react';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { RobotIcon } from '@phosphor-icons/react/dist/ssr/Robot';
import { useTranslations } from 'next-intl';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/ai-elements/input-group';
import { ModelSelector } from '@/components/ui/ai-elements/model-selector';
import { cn } from '@/lib/utils';
import { ChatThinking, ChatThinkingStatus } from './reasoning';
import { ChatToolCall } from './tool-call';

export { ChatThinking } from './reasoning';

type ChatMessageProps = ComponentProps<'div'> & (
  | { from: 'user' | 'assistant'; state?: 'complete' }
  | { from: 'assistant'; state: 'thinking'; children?: never }
);

const markdownContent = '[&>p]:m-0 [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto';

function ChatInput({ value }: { value: string }) {
  const t = useTranslations('Ui');
  return <InputGroup data-chat-input="" className="@container/chat-input gap-1.5 rounded-sm border-brand/35 bg-background p-2.5 shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-brand has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[>textarea:focus]:outline-2 has-[>textarea:focus]:outline-offset-2 has-[>textarea:focus]:outline-solid has-[>textarea:focus]:outline-brand">
    <InputGroupTextarea readOnly defaultValue={value} rows={3} aria-label={t('promptExample')} className="block min-h-10 min-w-0 flex-none px-2 py-1.5 text-base leading-relaxed text-foreground md:text-base" />
    <InputGroupAddon align="block-end" className="min-w-0 flex-wrap gap-1.5 p-0">
      <InputGroupButton variant="outline" size="icon-sm" className="shrink-0 rounded-full border-brand/35 text-brand disabled:pointer-events-none" disabled aria-label={t('attachFile')}>
        <PlusIcon size={16} weight="bold" aria-hidden />
      </InputGroupButton>
      <div className="ml-auto flex min-w-0 max-w-full items-center gap-1.5">
        <ModelSelector label={t('deepSeekModel')} provider="DeepSeek" models={[
          { id: 'deepseek-flash', name: 'V4.1 Flash' },
          { id: 'deepseek-v4-pro', name: 'V4 Pro' },
        ]} />
        <InputGroupButton variant="plain" size="icon-sm" className="shrink-0 rounded-full bg-brand text-background" disabled aria-label={t('sendMessage')}>
          <ArrowUpIcon size={16} weight="bold" aria-hidden />
        </InputGroupButton>
      </div>
    </InputGroupAddon>
  </InputGroup>;
}

export function Chat({ className, children, input, ...props }: ComponentProps<'div'> & { input?: string }) {
  const draft = input?.trim();
  return <div {...props} data-component="chat" className={cn(
    'quote-frame not-prose my-6 flex min-w-0 flex-col gap-6',
    draft && !children ? 'bg-sidebar p-3' : 'p-4 sm:p-5',
    '[&>[data-component=chat-message]]:m-0 [&>[data-component=chat-message]]:border-0 [&>[data-component=chat-message]]:bg-transparent',
    '[&>[data-component=chat-message]]:p-0 [&>[data-component=chat-message]]:shadow-none',
    className,
  )}>
    {children}
    {draft && <ChatInput value={draft} />}
  </div>;
}

export function ChatMessage({ from, state = 'complete', className, children, ...props }: ChatMessageProps) {
  const thinking = state === 'thinking';
  const AvatarIcon = from === 'user' ? UserIcon : RobotIcon;
  const content = Children.toArray(children).filter((child) => typeof child !== 'string' || child.trim());
  const activities = from === 'assistant' ? content.filter((child) => isValidElement(child) && (child.type === ChatThinking || child.type === ChatToolCall)) : [];
  const answer = content.filter((child) => !activities.includes(child));
  const bubble = cn('rounded-sm px-4 py-3', from === 'user' ? 'bg-brand-soft' : 'border border-brand/25 bg-background');
  return <div {...props} data-component="chat-message" data-slot="message" data-from={from} data-state={thinking ? 'thinking' : undefined} className={cn(
    'quote-frame not-prose my-6 flex min-w-0 items-start gap-3 p-4 text-base leading-reading text-foreground sm:p-5',
    from === 'user' ? 'justify-end' : 'justify-start',
    className,
  )}>
    <div data-slot="message-content" className={cn(
      'min-w-0 max-w-[85%] [overflow-wrap:anywhere]', markdownContent,
      thinking ? 'flex min-h-11 items-center' : activities.length ? 'w-full space-y-3' : bubble,
    )}>{thinking ? <ChatThinkingStatus /> : activities.length ? <>
      {activities}
      {answer.length > 0 && <div data-slot="message-response" className={cn('w-fit max-w-full', bubble, markdownContent)}>{answer}</div>}
    </> : children}</div>
    <span data-slot="message-avatar" aria-hidden="true" className={cn(
      'mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-sm border border-brand/25 bg-brand-soft text-brand',
      from === 'assistant' && 'order-first',
    )}>
      <AvatarIcon size={18} />
    </span>
  </div>;
}
