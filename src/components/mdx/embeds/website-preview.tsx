import type { ComponentProps, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { cn } from '@/lib/utils';

type WebsitePreviewProps = Omit<ComponentProps<'figure'>, 'title'> & {
  url: string;
  title: string;
  height?: 'auto';
  children: ReactNode;
};

export function WebsitePreview({ url, title, height, children, className, ...props }: WebsitePreviewProps) {
  const t = useTranslations('Ui');
  const address = new URL(url);
  const label = `${title} ${t('opensInNewTab')}`;
  const viewportHeight = height === 'auto'
    ? 'max-h-[260px] @[36rem]/website-preview:max-h-[400px]'
    : 'h-[260px] @[36rem]/website-preview:h-[400px]';
  return <figure {...props} data-component="website-preview"
    className={cn('not-prose @container/website-preview my-8 min-w-0 overflow-hidden rounded-sm border border-brand/35 bg-background text-foreground hover:border-brand/70', className)}>
    <a data-slot="website-toolbar" href={url} target="_blank" rel="noopener noreferrer" data-reading-standalone=""
      aria-label={label}
      className="flex min-h-11 min-w-0 touch-manipulation items-center gap-3 border-b border-brand/20 bg-muted/60 px-3 py-2 no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
      <span aria-hidden className="flex shrink-0 gap-1">
        <span className="size-1.5 rounded-full bg-muted-foreground/35" />
        <span className="size-1.5 rounded-full bg-muted-foreground/35" />
        <span className="size-1.5 rounded-full bg-muted-foreground/35" />
      </span>
      <span aria-hidden className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-sm border border-brand/10 bg-background px-2 py-1 text-caption leading-copy text-muted-foreground">
        <LockSimpleIcon size={12} className="shrink-0" />
        <span data-slot="website-address" className="truncate">{address.host}{address.pathname === '/' ? '' : address.pathname}</span>
      </span>
      <ArrowUpRightIcon size={16} aria-hidden className="shrink-0 text-brand" />
    </a>
    <div data-slot="website-viewport" role="region" aria-label={title} tabIndex={0}
      className={cn('overflow-x-hidden overflow-y-auto overscroll-y-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand', viewportHeight)}>
      <a data-slot="website-link" href={url} target="_blank" rel="noopener noreferrer" data-reading-standalone=""
        aria-label={label} className="block min-w-0 touch-manipulation no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
        <div className="[&_p]:m-0 [&_img]:m-0 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:rounded-none">{children}</div>
      </a>
    </div>
  </figure>;
}
