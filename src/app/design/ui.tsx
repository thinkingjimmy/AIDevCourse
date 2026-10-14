/**
 * [INPUT]: The active design variant.
 * [OUTPUT]: Shared wordmark, variant switch, header, and footer for the three previews.
 * [POS]: Chrome for /design. It does not render the live site shell.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export const variants = [
  { id: 'a', href: '/design/a', label: '目录' },
  { id: 'b', href: '/design/b', label: '课页' },
  { id: 'c', href: '/design/c', label: '工作台' },
] as const;
export type VariantId = (typeof variants)[number]['id'];

export function Mark({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9l3 3-3 3M12 15h5" />
  </svg>;
}

export function Brand() {
  return <Link href="/design" className="d-brand"><Mark />AIDevCourse</Link>;
}

export function VariantSwitch({ current }: { current?: VariantId }) {
  return <nav className="d-switch d-num" aria-label="设计稿">{variants.map((item, index) => <span key={item.id}>{index > 0 ? <span className="sep">/</span> : null}<Link href={item.href} aria-current={current === item.id ? 'page' : undefined}>{item.id.toUpperCase()} {item.label}</Link></span>)}</nav>;
}

export function DesignHeader({ current, sections = [] }: { current?: VariantId; sections?: { href: string; label: string }[] }) {
  return <header className="d-header">
    <a className="skip" href="#main">跳到正文</a>
    <div className="d-wrap d-header-inner">
      <Brand />
      {sections.length ? <nav className="d-sections" aria-label="本页">{sections.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav> : null}
      <span className="d-grow" />
      <span className="d-rule" aria-hidden />
      <VariantSwitch current={current} />
    </div>
  </header>;
}

export function DesignFooter({ flush = false, children }: { flush?: boolean; children?: ReactNode }) {
  return <footer className={flush ? 'd-footer d-footer-flush' : 'd-footer'}><div className={`${flush ? '' : 'd-wrap '}d-footer-inner d-num`}>
    <Link href="/design" className="mark">AIDevCourse</Link>
    <VariantSwitch />
    <Link href="/zh">现站</Link>
    <span className="d-grow" />
    <span>{children ?? 'aidevcourse.com · 设计稿 · 未替换首页'}</span>
  </div></footer>;
}
