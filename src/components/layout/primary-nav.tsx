/**
 * [INPUT]: Current locale and pathname.
 * [OUTPUT]: Primary site links with an aria-current indicator for the active section.
 * [POS]: Small client island inside the server-rendered site-header.tsx.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n/config';
export function PrimaryNav({ locale }: { locale: Locale }) {
  const t = useTranslations('Ui');
  const pathname = usePathname();
  const active = (path: string) => pathname === path || pathname.startsWith(`${path}/`) ? 'page' : undefined;
  return <nav className="primary-nav">
    <Link href={`/${locale}/courses`} aria-current={active(`/${locale}/courses`)}>{t('courses')}</Link>
    <Link className="about-link" href={`/${locale}/about`} aria-current={active(`/${locale}/about`)}>{t('about')}</Link>
  </nav>;
}
