'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Popover } from 'radix-ui';
import { useTranslations } from 'next-intl';
import { AuthorActionIcon, type AuthorAction } from '@/components/course/author-icons';
import { AuthorWechat } from '@/components/course/author-card';
import { Button } from '@/components/ui/button';
import { author } from '@/lib/site-config';

const actionClass = 'size-8 shrink-0 rounded-(--radius) p-0 text-muted-foreground before:inset-0 hover:text-foreground [@media(any-pointer:coarse)]:size-11';

function WechatPopover() {
  const t = useTranslations('Author');
  const [open, setOpen] = useState(false);
  const mode = useRef<'hover' | 'click' | null>(null);
  const returnFocus = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(() => () => clearTimer(), []);

  function changeOpen(value: boolean) {
    clearTimer();
    mode.current = value ? 'click' : null;
    if (value) returnFocus.current = true;
    setOpen(value);
  }

  function enter(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    clearTimer();
    if (open) return;
    timer.current = setTimeout(() => {
      mode.current = 'hover';
      returnFocus.current = false;
      setOpen(true);
    }, 200);
  }

  function leave() {
    clearTimer();
    if (mode.current !== 'hover') return;
    timer.current = setTimeout(() => { mode.current = null; setOpen(false); }, 180);
  }

  return <>
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon-touch" className={`${actionClass} [@media(scripting:none)]:hidden`}
          data-note-author-action="wechat" aria-label={t('openWechatQr')} title={t('openWechatQr')}
          onPointerEnter={enter} onPointerLeave={leave}
          onClick={event => {
            if (mode.current !== 'hover') return;
            // A click pins an already visible hover preview until it is dismissed.
            event.preventDefault();
            clearTimer();
            mode.current = 'click';
            returnFocus.current = true;
            event.currentTarget.focus();
          }}>
          <AuthorActionIcon name="wechat" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content data-slot="note-wechat-popover" aria-label={t('openWechatQr')} side="bottom" align="end" sideOffset={8} collisionPadding={16}
          onPointerEnter={clearTimer} onPointerLeave={leave}
          onOpenAutoFocus={event => { if (!returnFocus.current) event.preventDefault(); }}
          onCloseAutoFocus={event => { if (!returnFocus.current) event.preventDefault(); }}
          onEscapeKeyDown={() => { returnFocus.current = true; }}
          className="not-prose z-50 max-h-[min(calc(100svh-2rem),var(--radix-popover-content-available-height))] w-84 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-(--radius) border border-border bg-background p-3 text-foreground shadow-sm outline-none">
          <AuthorWechat />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
    <details data-note-wechat-fallback className="w-8 shrink-0 open:w-full [@media(any-pointer:coarse)]:w-11 [@media(scripting:enabled)]:hidden">
      <Button asChild variant="ghost" size="icon-touch" className={`${actionClass} ml-auto list-none [&::-webkit-details-marker]:hidden`}>
        <summary aria-label={t('openWechatQr')} title={t('openWechatQr')}><AuthorActionIcon name="wechat" /></summary>
      </Button>
      <AuthorWechat className="mt-2" />
    </details>
  </>;
}

export function NoteAuthor({ anchor, noteNumber }: { anchor: string; noteNumber: string }) {
  const t = useTranslations('Author');
  const ui = useTranslations('Ui');

  const links: { name: AuthorAction; href: string; label: string }[] = [
    { name: 'star', href: author.projectUrl, label: t('starProjectLabel') },
    { name: 'xiaohongshu', href: author.xiaohongshuUrl, label: t('followXiaohongshu') },
    { name: 'x', href: author.xUrl, label: t('followX') },
    { name: 'bilibili', href: author.bilibiliUrl, label: t('followBilibili') },
  ];

  return <header data-slot="note-signature" className="sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 bg-background [[data-slot=jimmy-note-popover]_&]:static">
    <div className="flex shrink-0 items-center gap-1.5 [[data-slot=jimmy-note-popover]_&]:pr-9">
      <Image src={author.avatar} alt="" width={24} height={24} sizes="1.5rem" className="size-6 shrink-0 rounded-full object-cover" />
      <div className="min-w-0">
        <span className="block text-sm leading-copy font-medium text-foreground" lang="en">{author.name}</span>
        <span id={`jimmy-note-number-${anchor}`} data-slot="note-description" className="sr-only">{ui('noteNumber', { number: noteNumber })}</span>
        <span className="block text-xs leading-copy text-muted-foreground">{t('articleRole')}</span>
      </div>
    </div>
    <div data-slot="note-author-actions" className="flex max-w-full flex-wrap items-center justify-start [[data-slot=jimmy-note-popover]_&]:basis-full">
      {links.map(link => <Button key={link.name} asChild variant="ghost" size="icon-touch" className={actionClass}>
        <a data-note-author-action={link.name} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label}><AuthorActionIcon name={link.name} /></a>
      </Button>)}
      <WechatPopover />
    </div>
  </header>;
}
