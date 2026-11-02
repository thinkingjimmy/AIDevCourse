'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/ai-elements/hover-card';

type InlineCitationProps = {
  url: string;
  title?: string;
  description?: string;
};

export function InlineCitation({ url, title, description }: InlineCitationProps) {
  const t = useTranslations('Ui');
  const id = useId();
  const touch = useRef(false);
  const [open, setOpen] = useState(false);
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  const sourceTitle = title || hostname;
  const label = `${hostname}: ${t('citationSource', { title: sourceTitle })} ${t('opensInNewTab')}`;

  return <span data-component="inline-citation" className="not-prose mx-1 inline-block max-w-full align-baseline">
    <HoverCard open={open} onOpenChange={setOpen} openDelay={10} closeDelay={100}>
      <HoverCardTrigger asChild
        onPointerDown={(event) => { touch.current = event.pointerType === 'touch'; }}
        onPointerEnter={(event) => { if (event.pointerType !== 'touch') touch.current = false; }}
        onKeyDown={() => { touch.current = false; }}
        onFocus={(event) => { if (touch.current) event.preventDefault(); }}>
        <Button asChild variant="secondary" size="xs" className="relative max-w-full align-middle font-sans no-underline! before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']">
          <a data-citation-trigger href={url} target="_blank" rel="noreferrer" aria-label={label} aria-describedby={open ? id : undefined}>
            <span className="min-w-0 truncate">{hostname}</span>
          </a>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent id={id} role="tooltip" data-component="inline-citation-preview" align="start" collisionPadding={12}
        className="not-prose flex w-64 max-w-[calc(100vw-24px)] max-h-[var(--radix-hover-card-content-available-height)] flex-col gap-1.5 overflow-y-auto font-sans leading-reading [overflow-wrap:anywhere]">
        <div className="font-medium">{sourceTitle}</div>
        {description && <p className="m-0 text-muted-foreground">{description}</p>}
        <a href={url} target="_blank" rel="noreferrer" className="w-fit max-w-full underline underline-offset-4">
          {hostname}<span className="sr-only"> {t('opensInNewTab')}</span>
        </a>
      </HoverCardContent>
    </HoverCard>
  </span>;
}
