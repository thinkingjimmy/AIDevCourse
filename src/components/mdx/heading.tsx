'use client';
import { Children, isValidElement, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function canLinkHeading(children: ReactNode): boolean {
  return Children.toArray(children).every(child => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return true;
    // MDX components can render their own links or buttons.
    return typeof child.type === 'string'
      && !['a', 'button', 'input', 'select', 'textarea', 'details'].includes(child.type)
      && canLinkHeading(child.props.children);
  });
}

export function Heading({ as: Tag = 'h1', id, className, children, ...props }: ComponentProps<'h1'> & { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' }) {
  const t = useTranslations('Ui');
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(reset.current), []);
  if (!id) return <Tag {...props} className={className}>{children}</Tag>;
  return <Tag {...props} id={id} className={cn('group/heading flex scroll-m-28 flex-row items-center gap-1', className)}>
    {canLinkHeading(children) ? <a data-card="" href={`#${id}`}>{children}</a> : <span className="min-w-0">{children}</span>}
    <Button variant="ghost" size="icon-touch" className="not-prose size-6 shrink-0 rounded-sm text-muted-foreground opacity-0 transition-opacity before:-inset-2.5 group-hover/heading:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100" aria-label={t('copyAnchor')} onClick={async () => {
      clearTimeout(reset.current);
      try {
        const url = new URL(window.location.href);
        url.hash = id;
        await navigator.clipboard.writeText(url.href);
        setStatus('copied');
        reset.current = setTimeout(() => setStatus('idle'), 1500);
      } catch { setStatus('failed'); }
    }}>{status === 'copied' ? <CheckIcon size={16} aria-hidden /> : <LinkSimpleIcon size={16} aria-hidden />}<span className="sr-only" role="status">{status === 'copied' ? t('copied') : status === 'failed' ? t('copyAnchorFailed') : ''}</span></Button>
  </Tag>;
}
