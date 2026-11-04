import type { ComponentProps, CSSProperties } from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { cn } from '@/lib/utils';
import { requestExample, responseExample, type MessageEvent } from './model';

export function MessageBubble({ event, className, style, children, ...props }: ComponentProps<'div'> & { event: MessageEvent }) {
  const fill = event.format === 'invalid' ? 'var(--color-red-50)' : event.format === 'valid' ? 'var(--color-green-50)' : 'var(--color-muted)';
  const border = event.format === 'invalid' ? 'var(--color-red-200)' : event.format === 'valid' ? 'var(--color-green-200)' : 'var(--color-border)';
  const Icon = event.format === 'invalid' ? XCircleIcon : CheckCircleIcon;
  return <div {...props} data-format={event.format} style={{ '--bubble-fill': fill, '--bubble-border': border, ...style } as CSSProperties}
    className={cn('flex flex-col justify-center gap-1 rounded-sm border border-(--bubble-border) bg-(--bubble-fill) px-3 py-2.5 text-caption text-foreground shadow-md', className)}>
    {event.format && <div className={`flex items-center gap-1.5 font-medium ${event.format === 'invalid' ? 'text-red-800' : 'text-green-800'}`}><Icon size={18} aria-hidden className="shrink-0" /><span>{event.format === 'invalid' ? '格式错误' : '格式正确'}</span></div>}
    <div className="text-xs text-reading">{event.caption}</div>
    {event.response || event.format === 'valid'
      ? <pre data-sequence-json={event.response ? 'response' : 'request'} aria-label={event.response ? '服务器返回的 JSON 回复示意' : '符合约定结构的 JSON 请求示意'} className="m-0 mt-1 bg-transparent p-0 font-mono text-xs leading-copy whitespace-pre-wrap [overflow-wrap:anywhere]">{event.response ? responseExample : requestExample}</pre>
      : <div data-sequence-message>{event.message}</div>}
    {children}
  </div>;
}
