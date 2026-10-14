/**
 * [INPUT]: Locale, published course entry, and the public catalog version.
 * [OUTPUT]: Framed homepage bar: aidevcourse mark, primary links, compact search, and 中 / EN.
 * [POS]: Homepage-only header; interior pages keep site-header.tsx.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { getCatalog, getCourses } from '@/lib/content/source';
import { site } from '@/lib/site-config';
import { LanguageSwitcher } from './language-switcher';
import { SearchTrigger } from '../search/search-trigger';
export async function HomeHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Home' });
  const ui = await getTranslations({ locale, namespace: 'Ui' });
  const catalog = getCatalog();
  const handbook = getCourses(locale)[0]?.url ?? `/${locale}/courses`;
  const links = [
    { href: `/${locale}/courses`, label: t('navCourses') },
    { href: '#catalog', label: t('navPaths') },
    { href: handbook, label: t('navHandbook') },
    { href: `/${locale}/about`, label: t('navUpdates') },
  ];
  return <header className="home-top"><div className="home-inner">
    <Link href={`/${locale}`} className="home-logo" aria-label={`${site.name} · ${ui('home')}`}><span className="home-mark" aria-hidden /><span>aidevcourse</span></Link>
    <nav className="home-nav" aria-label={t('navLabel')}>{links.map((link) => <Link key={link.label} href={link.href}>{link.label}</Link>)}</nav>
    <div className="home-tools"><SearchTrigger locale={locale} version={catalog.version} compact /><LanguageSwitcher locale={locale} translations={catalog.translations} compact /></div>
  </div></header>;
}
