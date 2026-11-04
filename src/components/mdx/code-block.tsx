'use client';
import { useRef, useState, type ComponentProps } from 'react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
export function LocalizedCodeBlock({ icon, title, ...props }: ComponentProps<'pre'> & { 'data-language'?: string; icon?: string }) {
  const t = useTranslations('Ui');
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'copied' | 'copyFailed'>('idle');
  return <div className="relative my-7 min-w-0 [&_figure]:m-0 [&_figure]:border-border [&_figure]:shadow-none [&_figure>div:first-child]:min-h-[42px] [&_figure>div:first-child]:border-b [&_figure>div:first-child]:border-border [&_figure>div:first-child]:bg-background [&_figure>div:first-child]:font-mono [&_figure>div:first-child]:text-xs" ref={ref}>
    <CodeBlock className="rounded-sm" allowCopy={false} keepBackground style={props.style} icon={icon} title={title || props['data-language'] || t('code')}><Pre {...props} /></CodeBlock>
    <Button variant="plain" size="reset" className="copy-button absolute top-px right-1.5 min-h-10 gap-[7px] rounded-sm bg-background px-2.5 text-xs text-strong hover:text-foreground" aria-label={t('copy')} onClick={async () => {
      try { await navigator.clipboard.writeText(ref.current?.querySelector('pre')?.textContent ?? ''); setStatus('copied'); }
      catch { setStatus('copyFailed'); }
    }}>{status === 'copied' ? <CheckIcon size={16} aria-hidden /> : <CopyIcon size={16} aria-hidden />}<span>{t(status === 'copied' ? 'copied' : 'copy')}</span></Button>
    <span className={status === 'copyFailed' ? 'copy-error mt-2 block text-caption text-destructive' : 'sr-only'} role="status">{status !== 'idle' ? t(status) : ''}</span>
  </div>;
}
