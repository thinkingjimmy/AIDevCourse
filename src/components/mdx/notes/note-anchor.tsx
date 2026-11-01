'use client';

import type { HTMLAttributes } from 'react';
import { Popover } from 'radix-ui';
import { useTranslations } from 'next-intl';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNoteScope } from './note-scope';

type NoteAnchorProps = HTMLAttributes<HTMLElement> & { id: string; noteNumber: string; variant?: 'text' | 'image' };

export function JimmyNoteAnchor({ id, noteNumber, variant = 'text', children, className, ...props }: NoteAnchorProps) {
  const t = useTranslations('Ui');
  const { entries, openId, rail, setOpen } = useNoteScope();
  const body = entries.get(id);
  const anchorProps = { ...props, id: `jimmy-note-anchor-${id}`, 'data-jimmy-note-anchor': id, 'data-note-anchor-variant': variant, tabIndex: -1 };
  const trigger = <Popover.Trigger asChild>
    <Button variant="ghost" size="icon-touch" data-note-trigger-for={id} disabled={!body}
      aria-label={t('openJimmyNote', { number: noteNumber })} aria-describedby={`jimmy-note-anchor-${id}`}
      className={cn('not-prose relative inline-block size-6 touch-manipulation rounded-none bg-transparent p-0 text-note-ink before:-inset-2.5 hover:bg-transparent hover:text-note-ink @[64rem]/lesson:hidden [@media(scripting:none)]:hidden',
        variant === 'image' ? 'absolute top-3 right-3 bg-background/95 hover:bg-background' : 'ml-0.5 align-middle')}>
      <span data-slot="note-marker" aria-hidden className={cn('pointer-events-none absolute inset-0 flex items-center justify-center text-xs leading-none font-medium tabular-nums', variant === 'text' && '-translate-y-2')}>{noteNumber}</span>
    </Button>
  </Popover.Trigger>;

  return <Popover.Root open={!rail && openId === id} onOpenChange={open => setOpen(id, open)}>
    {variant === 'image' ? <figure data-note-image={id} className="relative my-6 min-w-0">
      <div {...anchorProps} className={cn('[&>p]:m-0 [&_img]:m-0', className)}>{children}</div>
      {trigger}
    </figure> : <>
      <span {...anchorProps}
        className={cn('box-decoration-clone bg-[linear-gradient(transparent_28%,var(--color-note-highlight)_28%,var(--color-note-highlight)_88%,transparent_88%)] px-0.5 text-inherit [overflow-wrap:anywhere]', className)}>{children}</span>
      {trigger}
    </>}
    <Popover.Portal>
      <Popover.Content data-slot="jimmy-note-popover" aria-label={t('jimmyNote')} aria-describedby={`jimmy-note-number-${id}`} side="bottom" align="end" sideOffset={8} collisionPadding={16}
        onInteractOutside={event => {
          const qr = document.querySelector('[data-slot="note-wechat-popover"]');
          if (event.target instanceof Node && qr?.contains(event.target)) event.preventDefault();
        }}
        className="not-prose z-40 w-84 max-w-[calc(100vw-2rem)] outline-none [--note-max-height:var(--radix-popover-content-available-height)]">
        <Popover.Close asChild>
          <Button variant="ghost" size="icon-touch" aria-label={t('close')} className="absolute top-3 right-3 z-20 size-6 text-muted-foreground before:-inset-2.5">
            <XIcon size={16} aria-hidden />
          </Button>
        </Popover.Close>
        {body}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
