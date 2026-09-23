/**
 * [INPUT]: Server-highlighted code and current-locale copy feedback.
 * [OUTPUT]: Reused Fumadocs code surface with truthful clipboard status.
 * [POS]: Client-side copy action registered by components.tsx; highlighting stays at build time.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useRef, useState, type ComponentProps } from 'react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
export function LocalizedCodeBlock({ icon, title, ...props }: ComponentProps<'pre'> & { 'data-language'?: string; icon?: string }) {
  const t = useTranslations('Ui');
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'copied' | 'copyFailed'>('idle');
  return <div className="localized-code" ref={ref}>
    <CodeBlock allowCopy={false} keepBackground style={props.style} icon={icon} title={title || props['data-language'] || t('code')}><Pre {...props} /></CodeBlock>
    <button className="copy-button" aria-label={t('copy')} onClick={async () => {
      try { await navigator.clipboard.writeText(ref.current?.querySelector('pre')?.textContent ?? ''); setStatus('copied'); }
      catch { setStatus('copyFailed'); }
    }}>{status === 'copied' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}<span>{t(status === 'copied' ? 'copied' : 'copy')}</span></button>
    <span className={status === 'copyFailed' ? 'copy-error' : 'sr-only'} role="status">{status !== 'idle' ? t(status) : ''}</span>
  </div>;
}
