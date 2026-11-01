import { Children, isValidElement, type ComponentProps } from 'react';
import { BrainIcon } from '@phosphor-icons/react/dist/ssr/Brain';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { RobotIcon } from '@phosphor-icons/react/dist/ssr/Robot';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

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

export function ChatThinking({ children, className, open = true, ...props }: ComponentProps<'details'>) {
  return <details {...props} open={open} data-component="chat-thinking" className={cn('group/thinking min-w-0 text-sm leading-reading text-muted-foreground', className)}>
    <summary className="flex min-h-11 list-none items-center gap-2 rounded-sm hover:text-foreground [&::-webkit-details-marker]:hidden">
      <BrainIcon size={18} aria-hidden="true" />
      <span lang="en">Thinking</span>
      <CaretDownIcon size={16} aria-hidden="true" className="ml-auto group-open/thinking:rotate-180" />
    </summary>
    <div data-slot="thinking-content" className={cn('mt-1 border-l border-border pl-4', markdownContent)}>{children}</div>
  </details>;
}

export function ChatMessage({ from, state = 'complete', className, children, ...props }: ChatMessageProps) {
  const thinking = state === 'thinking';
  const AvatarIcon = from === 'user' ? UserIcon : RobotIcon;
  const content = Children.toArray(children).filter((child) => typeof child !== 'string' || child.trim());
  const reasoning = from === 'assistant' ? content.find((child) => isValidElement(child) && child.type === ChatThinking) : undefined;
  const answer = content.filter((child) => child !== reasoning);
  const bubble = cn('rounded-2xl px-4 py-3', from === 'user' ? 'bg-muted' : 'border border-border bg-surface');
  return <div {...props} data-component="chat-message" data-slot="message" data-from={from} data-state={thinking ? 'thinking' : undefined} className={cn(
    'quote-frame not-prose my-6 flex min-w-0 items-start gap-3 p-4 text-base leading-reading text-foreground sm:p-5',
    from === 'user' ? 'justify-end' : 'justify-start',
    className,
  )}>
    <div data-slot="message-content" className={cn(
      'min-w-0 max-w-[85%] [overflow-wrap:anywhere]', markdownContent,
      thinking ? 'flex min-h-11 items-center' : reasoning ? 'w-full space-y-3' : bubble,
    )}>{thinking ? <span role="status" lang="en" className="inline-flex items-center gap-2 text-muted-foreground">
      <Spinner aria-hidden="true" role="presentation" />
      <span>Thinking</span>
    </span> : reasoning ? <>
      {reasoning}
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
