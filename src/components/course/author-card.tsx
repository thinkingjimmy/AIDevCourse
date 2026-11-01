'use client';
import Image from 'next/image';
import type { ReactElement, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/overlays/dialog';
import { author } from '@/lib/site-config';
import { cn } from '@/lib/utils';

function AuthorBrandIcon({ brand, className }: {
  brand: 'github' | 'x' | 'xiaohongshu' | 'bilibili' | 'wechat'; className?: string;
}) {
  const sizes = {
    github: 'size-4',
    x: 'size-4',
    xiaohongshu: 'size-8',
    bilibili: 'size-[18px]',
    wechat: 'size-full',
  };
  return <span aria-hidden className={cn('pointer-events-none relative -top-px inline-flex size-5 shrink-0 items-center justify-center', className)}>
    <span data-slot="author-brand-icon" data-brand={brand}
      className={cn('block shrink-0 bg-current mask-contain mask-center mask-no-repeat', sizes[brand])}
      style={{ maskImage: `url('/images/social/${brand}.svg')` }} />
  </span>;
}

export function AuthorWechat({ className }: { className?: string }) {
  const t = useTranslations('Author');
  return <div data-slot="author-wechat" className={cn('flex min-w-0 items-center gap-3 rounded-(--radius) bg-muted p-3.5', className)}>
    {author.wechatQrImage ? <Image src={author.wechatQrImage} alt={t('wechatQrAlt')} width={80} height={80} sizes="5rem" className="size-20 shrink-0 rounded-(--radius) bg-background object-contain" />
      : <div role="img" aria-label={t('qrPlaceholderLabel')} className="flex size-20 shrink-0 flex-col items-center justify-center gap-1.5 rounded-(--radius) bg-background text-muted-foreground"><AuthorBrandIcon brand="wechat" className="size-8" /><span className="text-xs leading-copy">{t('qrPlaceholder')}</span></div>}
    <div className="min-w-0"><p className="m-0 mb-1 text-xs leading-copy font-medium">{t('wechatTitle')}</p><p className="m-0 text-xs leading-body text-reading">{t('wechatPrompt')}<br />{t('wechatNote')}</p></div>
  </div>;
}

function AuthorAction({ href, label, className, children }: {
  href: string; label: string; className?: string; children: ReactNode;
}) {
  return <Button asChild variant="action-outline" size="sm" aria-label={label} title={label}
    className={cn('h-10 min-h-10 min-w-10 flex-nowrap gap-1.5 rounded-(--radius) px-3 py-0 text-xs leading-none whitespace-nowrap max-sm:min-h-11', className)}>
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  </Button>;
}

function AuthorCard() {
  const t = useTranslations('Author');
  return <section data-slot="author-card" aria-label={t('label')} className="min-h-0 overflow-y-auto">
      <CardContent className="@container/author p-[18px] pt-2">
        <div data-slot="author-identity" className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-3 @[18rem]/author:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
          <Image src={author.avatar} alt="" width={40} height={40} sizes="2.5rem" className="size-10 shrink-0 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="m-0 text-sm leading-copy font-semibold">{author.name}</p>
            <p className="m-0 text-xs leading-body text-muted-foreground">{t('role')}</p>
          </div>
          <div className="col-span-2 min-w-0 @[18rem]/author:col-span-1">
            <AuthorAction href={author.websiteUrl} label={t('website')} className="w-full @[18rem]/author:w-auto"><span aria-hidden className="pointer-events-none relative -top-px inline-flex size-5 shrink-0 items-center justify-center"><GlobeIcon size={16} weight="fill" /></span><span className="min-w-0 whitespace-normal">{t('website')}</span></AuthorAction>
          </div>
        </div>
        <div className="mt-4 text-xs leading-body text-muted-foreground"><p className="m-0">{t('intro')}</p><p className="m-0 mt-0.5">{t('invitation')}</p></div>
        <div data-slot="author-actions" className="mt-4 grid grid-cols-3 gap-2 @[18rem]/author:grid-cols-[minmax(0,1fr)_3.5rem_3rem_3rem]">
          <AuthorAction href={author.projectUrl} label={t('starProjectLabel')} className="col-span-3 @[18rem]/author:col-span-1"><AuthorBrandIcon brand="github" /><span>{t('starProject')}</span></AuthorAction>
          <AuthorAction href={author.xiaohongshuUrl} label={t('followXiaohongshu')}><AuthorBrandIcon brand="xiaohongshu" /></AuthorAction>
          <AuthorAction href={author.xUrl} label={t('followX')}><AuthorBrandIcon brand="x" /></AuthorAction>
          <AuthorAction href={author.bilibiliUrl} label={t('followBilibili')}><AuthorBrandIcon brand="bilibili" /></AuthorAction>
        </div>
        <AuthorWechat className="mt-3.5" />
      </CardContent>
  </section>;
}

export function AuthorDialog({ children }: { children?: ReactElement }) {
  const t = useTranslations('Author');
  const ui = useTranslations('Ui');
  return <>
    <Dialog>
      <DialogTrigger asChild>
        {children ?? <Button data-slot="author-dialog-trigger" variant="ghost" size="icon" aria-label={t('label')} title={t('label')} className="size-11 shrink-0 text-lg [@media(scripting:none)]:hidden"><span aria-hidden>👋</span></Button>}
      </DialogTrigger>
      <DialogContent data-author-dialog overlayClassName="bg-background/60 backdrop-blur-sm"
        className="top-1/2 max-h-[calc(100dvh-32px)] w-[min(24rem,calc(100vw-32px))] -translate-y-1/2 rounded-(--radius) border-border shadow-[4px_4px_0_var(--line)] max-sm:top-1/2">
        <header className="flex shrink-0 items-center justify-between gap-3 px-[18px] pt-4 pb-3">
          <DialogTitle className="m-0 min-w-0 text-sm leading-copy font-semibold">{t('label')}</DialogTitle>
          <DialogClose asChild><Button variant="action-outline" size="icon-touch" aria-label={ui('close')} className="shrink-0 rounded-(--radius)"><XIcon size={18} aria-hidden /></Button></DialogClose>
        </header>
        <DialogDescription className="sr-only">{t('intro')}</DialogDescription>
        <AuthorCard />
      </DialogContent>
    </Dialog>
    {!children && <noscript><Button asChild variant="ghost" size="icon" className="size-11 shrink-0 text-lg"><a href={author.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={t('website')} title={t('website')}><span aria-hidden>👋</span></a></Button></noscript>}
  </>;
}
