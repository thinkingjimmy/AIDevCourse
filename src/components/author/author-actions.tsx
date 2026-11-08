'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { author } from '@/lib/site-config';
import { cn } from '@/lib/utils';

export function AuthorBrandIcon({ brand, className }: {
  brand: 'github' | 'x' | 'xiaohongshu' | 'bilibili' | 'wechat'; className?: string;
}) {
  const sizes = { github: 'size-4', x: 'size-4', xiaohongshu: 'size-8', bilibili: 'size-[18px]', wechat: 'size-full' };
  return <span aria-hidden className={cn('pointer-events-none relative -top-px inline-flex size-5 shrink-0 items-center justify-center', className)}>
    <span data-slot="author-brand-icon" data-brand={brand}
      className={cn('block shrink-0 bg-current mask-contain mask-center mask-no-repeat', sizes[brand])}
      style={{ maskImage: `url('/images/social/${brand}.svg')` }} />
  </span>;
}

export function AuthorAction({ href, label, className, children }: {
  href: string; label: string; className?: string; children: ReactNode;
}) {
  return <Button asChild variant="brand-outline" size="sm" aria-label={label} title={label}
    className={cn('author-window-action h-auto min-h-11 min-w-11 flex-nowrap gap-1.5 px-3 py-2 text-xs leading-snug whitespace-normal', className)}>
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  </Button>;
}

export function AuthorSupportActions({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  const t = useTranslations('Author');
  const socialClass = stacked ? 'min-w-14 flex-1' : undefined;
  return <div data-slot="author-actions" className={cn(stacked ? 'flex flex-wrap gap-2' : 'grid grid-cols-3 gap-2 @[18rem]/author:grid-cols-[minmax(0,1fr)_3.5rem_3rem_3rem]', className)}>
    <AuthorAction href={author.projectUrl} label={t('starProjectLabel')} className={cn('author-window-primary', stacked ? 'w-full basis-full' : 'col-span-3 @[18rem]/author:col-span-1')}><AuthorBrandIcon brand="github" /><span className="min-w-0 wrap-anywhere">{t('starProject')}</span></AuthorAction>
    <AuthorAction href={author.xiaohongshuUrl} label={t('followXiaohongshu')} className={socialClass}><AuthorBrandIcon brand="xiaohongshu" /></AuthorAction>
    <AuthorAction href={author.xUrl} label={t('followX')} className={socialClass}><AuthorBrandIcon brand="x" /></AuthorAction>
    <AuthorAction href={author.bilibiliUrl} label={t('followBilibili')} className={socialClass}><AuthorBrandIcon brand="bilibili" /></AuthorAction>
  </div>;
}
