import { Children, isValidElement, type ComponentProps } from 'react';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { RobotIcon } from '@phosphor-icons/react/dist/ssr/Robot';
import { cn } from '@/lib/utils';
import { ChatThinking, ChatThinkingStatus } from './reasoning';
import { ChatToolCall } from './tool-call';

export { ChatThinking } from './reasoning';

type ChatMessageProps = ComponentProps<'div'> & (
  | { from: 'user' | 'assistant'; state?: 'complete' }
  | { from: 'assistant'; state: 'thinking'; children?: never }
);

const markdownContent = '[&>p]:m-0 [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto';

export function Chat({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-component="chat" className={cn(
    'quote-frame not-prose my-6 flex min-w-0 flex-col gap-6 p-4 sm:p-5',
    '[&>[data-component=chat-message]]:m-0 [&>[data-component=chat-message]]:border-0 [&>[data-component=chat-message]]:bg-transparent',
    '[&>[data-component=chat-message]]:p-0 [&>[data-component=chat-message]]:shadow-none',
    className,
  )} />;
}

export function ChatMessage({ from, state = 'complete', className, children, ...props }: ChatMessageProps) {
  const thinking = state === 'thinking';
  const AvatarIcon = from === 'user' ? UserIcon : RobotIcon;
  const content = Children.toArray(children).filter((child) => typeof child !== 'string' || child.trim());
  const activities = from === 'assistant' ? content.filter((child) => isValidElement(child) && (child.type === ChatThinking || child.type === ChatToolCall)) : [];
  const answer = content.filter((child) => !activities.includes(child));
  const bubble = cn('rounded-lg px-4 py-3', from === 'user' ? 'bg-muted' : 'border border-border bg-surface');
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
      'mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground',
      from === 'assistant' && 'order-first',
    )}>
      <AvatarIcon size={18} />
    </span>
  </div>;
}
