import Image from 'next/image';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Locale } from '@/lib/i18n/config';
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

function AuthorAction({ href, label, children }: {
  href: string; label: string; children: ReactNode;
}) {
  return <Button asChild variant="action-outline" size="sm" aria-label={label} title={label}
    className="h-10 min-h-10 min-w-10 flex-nowrap gap-1.5 rounded-(--radius) px-3 py-0 text-xs leading-none whitespace-nowrap max-sm:min-h-11">
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  </Button>;
}

export async function AuthorCard({ locale, className }: { locale: Locale; className?: string }) {
  const t = await getTranslations({ locale, namespace: 'Author' });
  return <section data-slot="author-card" aria-label={t('label')} className={cn('w-full max-w-[21rem]', className)}>
    <Card className="overflow-visible rounded-(--radius) shadow-[4px_4px_0_var(--line)]">
      <CardContent className="p-[18px]">
        <div data-slot="author-identity" className="flex items-center gap-2.5">
          <Image src={author.avatar} alt="" width={40} height={40} sizes="2.5rem" className="size-10 shrink-0 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm leading-copy font-semibold">{author.name}</p>
            <p className="m-0 text-xs leading-body text-muted-foreground">{t('role')}</p>
          </div>
          <div className="shrink-0">
            <AuthorAction href={author.websiteUrl} label={t('website')}><span aria-hidden className="pointer-events-none relative -top-px inline-flex size-5 shrink-0 items-center justify-center"><GlobeIcon size={16} weight="fill" /></span><span>{t('website')}</span></AuthorAction>
          </div>
        </div>
        <div className="mt-4 text-xs leading-body text-muted-foreground"><p className="m-0">{t('intro')}</p><p className="m-0 mt-0.5">{t('invitation')}</p></div>
        <div data-slot="author-actions" className="mt-4 grid grid-cols-[minmax(0,1fr)_repeat(3,2.5rem)] gap-2">
          <AuthorAction href={author.projectUrl} label={t('starProjectLabel')}><AuthorBrandIcon brand="github" /><span>{t('starProject')}</span></AuthorAction>
          <AuthorAction href={author.xUrl} label={t('followX')}><AuthorBrandIcon brand="x" /></AuthorAction>
          <AuthorAction href={author.xiaohongshuUrl} label={t('followXiaohongshu')}><AuthorBrandIcon brand="xiaohongshu" /></AuthorAction>
          <AuthorAction href={author.bilibiliUrl} label={t('followBilibili')}><AuthorBrandIcon brand="bilibili" /></AuthorAction>
        </div>
        <div data-slot="author-wechat" className="mt-3.5 flex min-w-0 items-center gap-3 rounded-(--radius) bg-muted p-3.5">
          {author.wechatQrImage ? <Image src={author.wechatQrImage} alt={t('wechatQrAlt')} width={80} height={80} sizes="5rem" className="size-20 shrink-0 rounded-(--radius) bg-background object-contain" />
            : <div role="img" aria-label={t('qrPlaceholderLabel')} className="flex size-20 shrink-0 flex-col items-center justify-center gap-1.5 rounded-(--radius) bg-background text-muted-foreground"><AuthorBrandIcon brand="wechat" className="size-8" /><span className="text-xs leading-copy">{t('qrPlaceholder')}</span></div>}
          <div className="min-w-0"><p className="m-0 mb-1 text-xs leading-copy font-medium">{t('wechatTitle')}</p><p className="m-0 text-xs leading-body text-reading">{t('wechatPrompt')}<br />{t('wechatNote')}</p></div>
        </div>
      </CardContent>
    </Card>
  </section>;
}
