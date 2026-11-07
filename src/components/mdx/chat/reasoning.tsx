import type { ComponentProps } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Trace, TraceIcon, TraceLine, TraceTitle } from '@/components/ui/ai-elements/trace';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { ChatActivity } from './activity';

export function ChatThinking({ defaultOpen, children, className, ...props }: ComponentProps<'div'> & { defaultOpen?: boolean }) {
  const t = useTranslations('Ui');
  const locale = useLocale();
  return <ChatActivity {...props} defaultOpen={defaultOpen} data-component="chat-thinking" title={<span lang={locale === 'zh' ? 'en' : locale}>{t('thought')}</span>} label={t('thought')} icon={<CheckCircleIcon />}
    className={cn('text-sm leading-reading text-muted-foreground', className)}>
    <div data-slot="thinking-content" className="[&>p]:m-0 [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto">{children}</div>
  </ChatActivity>;
}

export function ChatThinkingStatus() {
  const t = useTranslations('Ui');
  const locale = useLocale();
  return <Trace className="*:has-[>[data-slot=trace-line]]:rounded-sm">
    <TraceLine status="running" role="status" lang={locale === 'zh' ? 'en' : locale}>
      <TraceIcon><Spinner aria-hidden="true" role="presentation" /></TraceIcon>
      <TraceTitle>{t('thinkingStatus')}</TraceTitle>
    </TraceLine>
  </Trace>;
}
