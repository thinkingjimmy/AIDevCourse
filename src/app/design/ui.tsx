import Link from 'next/link';
import { SiteLogo } from '@/components/layout/page-primitives';
import { site } from '@/lib/site-config';
import type { ReactNode } from 'react';

export const variants = [
  { id: 'a', href: '/design/a', label: '目录' },
  { id: 'b', href: '/design/b', label: '课页' },
  { id: 'c', href: '/design/c', label: '工作台' },
] as const;
export type VariantId = (typeof variants)[number]['id'];

export function Brand() {
  return <SiteLogo href="/design" className="gap-2.5 text-ui font-medium" />;
}

export function VariantSwitch({ current }: { current?: VariantId }) {
  return <nav className="flex items-center gap-0 text-[var(--mfg)] text-xs [&_a]:px-0.5 [&_a[aria-current=page]]:text-[var(--fg)] [&_a:hover]:text-[var(--fg)] font-mono tabular-nums" aria-label="设计稿">{variants.map((item, index) => <span key={item.id}>{index > 0 ? <span className="px-1 text-[var(--faint)]">/</span> : null}<Link href={item.href} aria-current={current === item.id ? 'page' : undefined}>{item.id.toUpperCase()} {item.label}</Link></span>)}</nav>;
}

export function DesignHeader({ current, sections = [] }: { current?: VariantId; sections?: { href: string; label: string }[] }) {
  return <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--bg)]">
    <a className="absolute -top-10 left-4 z-20 rounded-md bg-[var(--fg)] px-3 py-2 text-[var(--bg)] focus:top-3" href="#main">跳到正文</a>
    <div className="mx-auto w-[min(1200px,calc(100%-32px))] flex h-14 items-center gap-[18px] max-[721px]:h-auto max-[721px]:min-h-14 max-[721px]:flex-wrap max-[721px]:gap-x-3.5 max-[721px]:gap-y-2.5 max-[721px]:py-2.5">
      <Brand />
      {sections.length ? <nav className="flex items-center gap-[18px] text-[var(--mfg)] text-sm font-medium max-[721px]:hidden [&_a:hover]:text-[var(--fg)]" aria-label="本页">{sections.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav> : null}
      <span className="flex-1" />
      <span className="h-5 w-px bg-[var(--bd)]" aria-hidden />
      <VariantSwitch current={current} />
    </div>
  </header>;
}

export function DesignFooter({ flush = false, children }: { flush?: boolean; children?: ReactNode }) {
  return <footer className={flush ? 'mt-24 border-t border-[var(--line)] [&_a:hover]:text-[var(--fg)] -mx-8 max-[721px]:-mx-4 [&>div]:px-8 max-[721px]:[&>div]:px-4' : 'mt-24 border-t border-[var(--line)] [&_a:hover]:text-[var(--fg)]'}><div className={`${flush ? '' : 'mx-auto w-[min(1200px,calc(100%-32px))] '}flex min-h-16 items-center gap-[18px] py-3 text-[var(--mfg)] text-xs max-[721px]:flex-wrap max-[721px]:items-start font-mono tabular-nums`}>
    <Link href="/design" className="text-[var(--fg)]">{site.name}</Link>
    <VariantSwitch />
    <Link href="/zh">现站</Link>
    <span className="flex-1" />
    <span>{children ?? 'aidevcourse.com · 设计稿 · 未替换首页'}</span>
  </div></footer>;
}
